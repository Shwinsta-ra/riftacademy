#!/usr/bin/env python3
"""RiftCore ability compiler — Phase A (docs/design/RiftCore_Data_Model.md, §4).

Parses src/data/cards.json card text, cross-referenced with Master Card
Inventory columns (Function, Ability Target, Keywords, Speed), into candidate
card_abilities / ability_steps rows (§2 schema shape, mirroring the nesting
used by riftcore-function-decisions.json) with a per-card confidence score.

Outputs:
    src/data/model/abilities.json         high-confidence, auto-accepted
    src/data/model/abilities.review.json  low-confidence queue (parsed guess
                                           + source text, for human review)

Also calibrates against the 52 locked decisions in
src/data/model/riftcore-function-decisions.json and prints an accuracy report.

Manual, offline. Not imported by the app, not run in CI. Invoke directly:
    python scripts/compile_abilities.py
"""
import csv
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDS_JSON = os.path.join(ROOT, "src/data/cards.json")
DECISIONS_JSON = os.path.join(ROOT, "src/data/model/riftcore-function-decisions.json")
INVENTORY_CSV = os.path.expanduser("~/Downloads/Master Card Inventory.csv")
OUT_ABILITIES = os.path.join(ROOT, "src/data/model/abilities.json")
OUT_REVIEW = os.path.join(ROOT, "src/data/model/abilities.review.json")

CONFIDENCE_THRESHOLD = 0.75


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------

def load_cards():
    with open(CARDS_JSON, encoding="utf-8") as f:
        return json.load(f)


def load_inventory():
    by_code = {}
    if not os.path.exists(INVENTORY_CSV):
        return by_code
    with open(INVENTORY_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            code = (row.get("Card Code") or "").strip().upper()
            if code:
                by_code[code] = row
    return by_code


# ---------------------------------------------------------------------------
# Tag stripping / additional-cost / trigger detection
# ---------------------------------------------------------------------------

META_TAG_RES = [
    ("action_reaction", re.compile(r"^\s*\[(Action|Reaction)\]\s*")),
    ("hidden", re.compile(r"^\s*\[Hidden(?:\s*\(([^)]*)\))?\]\s*")),
    ("repeat", re.compile(r"^\s*\[Repeat\s*\((\d+)\)\]\s*")),
    ("legion", re.compile(r"^\s*\[Legion\]\s*")),
    ("deathknell", re.compile(r"^\s*\[Deathknell\]\s*")),
]


def extract_meta_tags(text):
    tags = {"action_reaction": None, "hidden": None, "repeat": None, "legion": False, "deathknell": False}
    changed = True
    while changed:
        changed = False
        for name, pattern in META_TAG_RES:
            m = pattern.match(text)
            if m:
                if name in ("action_reaction",):
                    tags[name] = m.group(1)
                elif name == "hidden":
                    tags[name] = m.group(1) or True
                elif name == "repeat":
                    tags[name] = m.group(1)
                else:
                    tags[name] = True
                text = text[m.end():]
                changed = True
    return tags, text.strip()


ADDITIONAL_COST_PATTERNS = [
    (
        re.compile(
            r"As (?:an additional cost to play this|you play (?:me|this|it)),?\s*"
            r"kill a friendly \[(\w+)\] unit\.?"
        ),
        lambda m: {"additional": {"function": "KillUnit", "target": "own-unit", "restriction": f"has-{m.group(1)}"}},
    ),
    (
        re.compile(
            r"As you play this, you may spend a buff as an additional cost\.\s*"
            r"If you do, ignore this spell.s cost\.?"
        ),
        lambda m: {"alternative": {"spendBuff": True, "effect": "ignore-cost"}},
    ),
]


def extract_additional_cost(body):
    for pattern, build in ADDITIONAL_COST_PATTERNS:
        m = pattern.search(body)
        if m:
            cost = build(m)
            body = (body[: m.start()] + " " + body[m.end():]).strip()
            return cost, body
    return None, body


TRIGGER_LEADIN_RE = re.compile(r"^(?:[Ww]hen you play me,?\s*|[Aa]s you play me,?\s*)")
BARE_KEYWORD_BODY_RE = re.compile(r"^(?:\[[^\]]+\]\s*)+$")


def determine_trigger(card, tags, body):
    ctype = card.get("type")
    speed = card.get("speed") or "Normal"
    if ctype == "Spell":
        return "OnPlay", tags["action_reaction"] or speed, False
    if ctype == "Unit":
        if tags["deathknell"]:
            return "Deathknell", "None", False
        if TRIGGER_LEADIN_RE.match(body):
            return "OnPlay", speed, False
        if BARE_KEYWORD_BODY_RE.match(body) and body:
            return "Static", speed, True
        if re.search(r"\bwhile attacking\b", body, re.I):
            return "WhileAttacking", speed, False
        if re.search(r"\bwhile defending\b", body, re.I):
            return "WhileDefending", speed, False
        if re.search(r"\bwhen attacking\b", body, re.I):
            return "WhenAttacking", speed, False
        if re.search(r"\bwhen(?:ever)? .*(?:damaged|takes damage)\b", body, re.I):
            return "WhenDamaged", speed, False
        return "Static", speed, False
    # Gear / Battlefield / Legend / Rune: best-effort, no calibration coverage.
    if tags["deathknell"]:
        return "Deathknell", "None", False
    if BARE_KEYWORD_BODY_RE.match(body) and body:
        return "Static", speed, True
    return "Static", speed, False


# ---------------------------------------------------------------------------
# Step-building helpers
# ---------------------------------------------------------------------------

def step(function, target, target_scope, value=None, condition=None, optional=False):
    return {
        "function": function,
        "target": target,
        "targetScope": target_scope,
        "value": value,
        "condition": condition,
        "optional": optional,
    }


def keyword_tokens_to_steps(blob, target, has_this_turn):
    steps = []
    for tok in re.findall(r"\[([^\]]+)\]", blob):
        m = re.match(r"([A-Za-z\-]+)\s*(\d+)?", tok.strip())
        if not m:
            continue
        name = m.group(1)
        num = m.group(2)
        value = {"keyword": name}
        if num:
            value["value"] = int(num)
        if has_this_turn:
            value["duration"] = "thisTurn"
        steps.append(step("GrantKeyword", target, "single", value))
    return steps


def target_qualifier(prefix_text):
    if prefix_text and "friendly" in prefix_text:
        return "own-unit"
    if prefix_text and "enemy" in prefix_text:
        return "opponent-unit"
    return "any-unit"


def apply_ability_target_override(target, inv_row, current_is_default):
    """Bare 'a unit' phrasing defaults to any-unit; the Master Inventory's
    Ability Target free-text column can override when it names an owner the
    text itself didn't (e.g. Smoke Screen: text says 'a unit', sheet says
    'an enemy unit')."""
    if not current_is_default or not inv_row:
        return target
    at = (inv_row.get("Ability Target") or "").strip().lower()
    if "enemy" in at:
        return "opponent-unit"
    if "friendly" in at:
        return "own-unit"
    return target


# ---------------------------------------------------------------------------
# Clause pattern library
# ---------------------------------------------------------------------------
# Each handler receives (match, ctx) where ctx = {"inv_row": ...} and returns
# a list of step dicts (without stepIdx, assigned by the caller in text order).

def h_damage_combo_kills_draw(m, ctx):
    n1, qualifier, n2 = int(m.group(1)), m.group(2), int(m.group(3))
    target = "opponent-unit" if "battlefield" in qualifier else "any-unit"
    cond = "at-battlefield" if "battlefield" in qualifier else None
    return [
        step("Damage", target, "single", n1, cond),
        step("Draw", "own-deck", "single", n2, "if-previous-step-killed"),
    ]


def h_damage_replay(m, ctx):
    n1, n2 = int(m.group(1)), int(m.group(2))
    return [
        step("Damage", "any-unit", "single", n1),
        step(
            "ReplayFromChain",
            "self",
            "single",
            {"cost": "Any", "bonusDamage": {"expr": f"{n2} * timesThisSpellDealtDamageThisTurn"}},
            "controller-may",
            optional=True,
        ),
    ]


def h_damage_simple(m, ctx):
    n1 = int(m.group(1))
    qualifier = m.group(0)
    target = "opponent-unit" if "battlefield" in qualifier else "any-unit"
    cond = "at-battlefield" if "battlefield" in qualifier else None
    return [step("Damage", target, "single", n1, cond)]


def h_grant_keyword_wrapped(m, ctx):
    qualifier, blob = m.group(1), m.group(2)
    has_turn = "this turn" in m.group(0)
    target = target_qualifier(qualifier)
    return keyword_tokens_to_steps(blob, target, has_turn)


def h_buff_debuff_simple(m, ctx):
    qualifier, amount, floor_group = m.group(1), int(m.group(2)), m.group(4)
    has_turn = "this turn" in m.group(0)
    is_default = not qualifier
    target = apply_ability_target_override(target_qualifier(qualifier), ctx["inv_row"], is_default)
    duration = "thisTurn" if has_turn else "permanent"
    if amount >= 0:
        return [step("BuffMight", target, "single", {"amount": amount, "duration": duration})]
    floor = int(floor_group) if floor_group else None
    return [step("DebuffMight", target, "single", {"amount": amount, "floor": floor, "duration": duration})]


def h_buff_two_units(m, ctx):
    amount = int(m.group(1))
    return [step("BuffMight", "own-unit", "multi", {"amount": amount, "count": 2, "duration": "thisTurn"})]


def h_buff_compound_solo(m, ctx):
    n1, n2 = int(m.group(1)), int(m.group(2))
    return [
        step("BuffMight", "own-unit", "single", {"amount": n1, "duration": "thisTurn"}),
        step("BuffMight", "own-unit", "single", {"amount": n2, "duration": "thisTurn"}, "if-solo-at-location"),
    ]


def h_buff_debuff_battlefield(m, ctx):
    n1, n2, floor = int(m.group(1)), int(m.group(2)), int(m.group(3))
    return [
        step("BuffMight", "own-unit", "all-at-battlefield", {"amount": n1, "duration": "thisTurn"}),
        step("DebuffMight", "opponent-unit", "all-at-battlefield", {"amount": -n2, "floor": floor, "duration": "thisTurn"}),
    ]


def h_moonfall(m, ctx):
    n1 = int(m.group(1))
    return [
        step(
            "Move", "opponent-unit", "single", {"to": "chosen-battlefield", "maxCount": 1},
            "battlefield-where-you-have-units", optional=True,
        ),
        step("DebuffMight", "opponent-unit", "all-at-battlefield", {"amount": -n1, "floor": None, "duration": "thisTurn"}),
    ]


def h_buff_bare_another_friendly(m, ctx):
    return [step("BuffMight", "own-unit", "single", {"amount": 1, "duration": "permanent"}, "another-friendly")]


def h_buff_bare_amplify(m, ctx):
    n = int(m.group(1))
    return [
        step("BuffMight", "own-unit", "single", {"amount": 1, "duration": "permanent"}),
        step("BuffAmplify", "own-unit", "all", {"amount": n, "duration": "thisTurn"}),
    ]


def h_buff_bare_base_move(m, ctx):
    return [
        step("BuffMight", "own-unit", "single", {"amount": 1, "duration": "permanent"}, "in-own-base"),
        step("MoveToBattlefield", "own-unit", "single"),
    ]


def h_counter_maxcost(m, ctx):
    raw = m.group(1)
    max_cost = int(raw) if raw.isdigit() else raw
    return [step("Counter", "spell", "single", {"maxCost": max_cost})]


def h_counter_plain(m, ctx):
    return [step("Counter", "spell", "single", {"maxCost": None})]


def h_counter_restriction(m, ctx):
    return [step("Counter", "spell-or-ability", "single", {"restriction": "chooses-friendly-unit-or-gear"})]


def h_stun_attacking_combo(m, ctx):
    return [
        step("Stun", "opponent-unit", "single", None, "is-attacking"),
        step("ReturnToHand", "opponent-unit", "single", None, "if-already-stunned"),
    ]


def h_stun_same_battlefield(m, ctx):
    return [
        step("Stun", "own-unit", "single", None, "same-battlefield"),
        step("Stun", "opponent-unit", "single", None, "same-battlefield"),
    ]


def h_stun_plain(m, ctx):
    target = apply_ability_target_override("any-unit", ctx["inv_row"], True)
    return [step("Stun", target, "single")]


def h_kill_all_gear(m, ctx):
    return [step("KillGear", "any-gear", "all")]


def h_kill_each_player_gear(m, ctx):
    return [step("KillGear", "each-player-gear", "one-each")]


def h_kill_each_player_unit(m, ctx):
    return [step("KillUnit", "each-player-unit", "one-each")]


def h_kill_total_might(m, ctx):
    n = int(m.group(1))
    return [step("KillUnit", "any-unit", "multi", {"maxTotalMight": n}, "at-battlefield")]


def h_kill_battlefield_draw_controller(m, ctx):
    n = int(m.group(1))
    return [
        step("KillUnit", "any-unit", "single", None, "at-battlefield"),
        step("Draw", "killed-unit-controller", "single", n),
    ]


def h_kill_unit_plain(m, ctx):
    target = apply_ability_target_override("any-unit", ctx["inv_row"], True)
    return [step("KillUnit", target, "single")]


def h_noxian_guillotine(m, ctx):
    return [
        step("RegisterDelayedKill", "any-unit", "single", {"firesOn": "nextDamageTakenThisTurn"}),
        step("KillUnit", "any-unit", "single", None, "if-Legion-active"),
    ]


def h_return_hand_channel(m, ctx):
    n = int(m.group(1))
    return [
        step("ReturnToHand", "own-unit", "single"),
        step("Channel", "own-runes", "single", {"count": n, "exhausted": True}),
    ]


def h_return_hand_maxmight(m, ctx):
    n = int(m.group(1))
    target = apply_ability_target_override("any-unit", ctx["inv_row"], True)
    return [step("ReturnToHand", target, "single", {"maxMight": n}, "at-battlefield")]


def h_return_hand_battlefield(m, ctx):
    target = apply_ability_target_override("any-unit", ctx["inv_row"], True)
    return [step("ReturnToHand", target, "single", None, "at-battlefield")]


def h_return_hand_each_player(m, ctx):
    return [step("ReturnToHand", "each-player-unit", "one-each", None, "starting-with-next-player", optional=True)]


def h_move_enemy(m, ctx):
    return [step("Move", "opponent-unit", "single")]


def h_move_ready(m, ctx):
    return [
        step("Move", "own-unit", "single"),
        step("Ready", "own-unit", "single"),
    ]


def h_move_up_to_base(m, ctx):
    n = int(m.group(1))
    return [step("Move", "own-unit", "multi", {"maxCount": n, "to": "base"})]


def h_ready_plain(m, ctx):
    target = apply_ability_target_override("any-unit", ctx["inv_row"], True)
    return [step("Ready", target, "single")]


def h_draw_plain(m, ctx):
    n = int(m.group(1))
    return [step("Draw", "own-deck", "single", n)]


def h_draw_channel(m, ctx):
    n1, n2 = int(m.group(1)), int(m.group(2))
    return [
        step("Draw", "own-deck", "single", n1),
        step("Channel", "own-runes", "single", {"count": n2, "exhausted": True}),
    ]


def h_reveal_recycle(m, ctx):
    return [
        step("Reveal", "opponent-hand", "all"),
        step("RecycleFromHand", "opponent-hand", "single", {"restriction": "non-unit"}),
    ]


def h_return_trash_cost_ignore(m, ctx):
    word = m.group(1)
    n = {"two": 2, "one": 1, "three": 3}.get(word, None) if word and not word.isdigit() else (int(word) if word and word.isdigit() else 2)
    return [
        step("ReturnFromTrash", "own-trash", "multi", {"maxCount": n, "restriction": "has-Hidden"}, optional=True),
        step("GrantCostIgnore", "own-hand", "all", {"restriction": "hide-actions", "duration": "thisTurn"}),
    ]


def h_fight_plain(m, ctx):
    return [step("Fight", "own-unit+opponent-unit", "pair", {"mode": "exchange-might-as-damage"})]


def h_buff_then_fight(m, ctx):
    n = int(m.group(1))
    return [
        step("BuffMight", "own-unit", "single", {"amount": n, "duration": "thisTurn"}),
        step("Fight", "own-unit+opponent-unit", "pair", {"mode": "exchange-might-as-damage"}),
    ]


def h_set_might_source_unit(m, ctx):
    return [step("SetMight", "own-unit", "single", {"toSourceUnit": True, "duration": "thisTurn"})]


def h_predict_plain(m, ctx):
    return [step("Predict", "own-deck", "single")]


def h_debuff_then_predict(m, ctx):
    n = int(m.group(1))
    return [
        step("DebuffMight", "any-unit", "single", {"amount": -n, "floor": None, "duration": "thisTurn"}),
        step("Predict", "own-deck", "single"),
    ]


def h_bone_skewer(m, ctx):
    return [
        step("Reveal", "opponent-hand", "all"),
        step(
            "ForcePlay", "opponent-hand", "single",
            {"restriction": "unit", "to": "chosen-battlefield", "ignoreCosts": True},
            "you-may-choose", optional=True,
        ),
        step("Stun", "opponent-unit", "single", None, "on-forced-play"),
    ]


PATTERNS = [
    ("damage_kills_draw", re.compile(
        r"Deal (\d+) to (a unit at a battlefield|a unit)\.\s*"
        r"If this kills it,? do this:?\s*draw (\d+)\."
    ), h_damage_combo_kills_draw),
    ("damage_replay", re.compile(
        r"Deal (\d+) to a unit\.\s*Its controller may play this spell again for \(Any\)\.\s*"
        r"If they do, this deals (\d+) additional Bonus Damage for each time this spell has dealt damage this turn\."
    ), h_damage_replay),
    ("noxian_guillotine", re.compile(
        r"Choose a unit\.\s*Kill it the next time it takes damage this turn\.\s*"
        r"\[Legion\]\s*-\s*Kill it now instead\."
    ), h_noxian_guillotine),
    ("kill_battlefield_draw_controller", re.compile(
        r"Kill a unit at a battlefield\.\s*Its controller draws (\d+)\."
    ), h_kill_battlefield_draw_controller),
    ("return_hand_channel", re.compile(
        r"Return a friendly unit to its owner.s hand\.\s*Its owner channels (\d+) rune exhausted\."
    ), h_return_hand_channel),
    ("stun_attacking_combo", re.compile(
        r"\[Stun\] an attacking enemy unit\.\s*If it.s already stunned, return it to its owner.s hand instead\."
    ), h_stun_attacking_combo),
    ("stun_same_battlefield", re.compile(
        r"Stun a friendly unit and an enemy unit at the same battlefield\."
    ), h_stun_same_battlefield),
    ("buff_compound_solo", re.compile(
        r"Give a friendly unit \+(\d+) Might this turn, then an additional \+(\d+) Might this turn "
        r"if it is the only unit you control there\."
    ), h_buff_compound_solo),
    ("buff_debuff_battlefield", re.compile(
        r"Choose a battlefield\.\s*Give friendly units there \+(\d+) Might this turn and "
        r"enemy units there -(\d+) Might this turn, to a minimum of (\d+) Might\."
    ), h_buff_debuff_battlefield),
    ("moonfall", re.compile(
        r"Choose a battlefield where you have units\.\s*You may move up to one enemy unit to that battlefield\.\s*"
        r"Then give enemy units there -(\d+) Might this turn\."
    ), h_moonfall),
    ("buff_bare_another_friendly", re.compile(
        r"buff another friendly unit\."
    ), h_buff_bare_another_friendly),
    ("buff_bare_amplify", re.compile(
        r"Buff a friendly unit\.\s*Buffs give an additional \+(\d+) Might to friendly units this turn\."
    ), h_buff_bare_amplify),
    ("buff_bare_base_move", re.compile(
        r"Buff a friendly unit in your base, then move it to a battlefield\."
    ), h_buff_bare_base_move),
    ("buff_two_units", re.compile(
        r"Give two friendly units each \+(\d+) Might this turn\."
    ), h_buff_two_units),
    ("counter_maxcost", re.compile(
        r"Counter a spell that costs no more than \(([^)]+)\) and no more than \(Any\)\."
    ), h_counter_maxcost),
    ("counter_restriction", re.compile(
        r"Counter an enemy spell or ability that chooses a friendly unit or gear\."
    ), h_counter_restriction),
    ("counter_plain", re.compile(
        r"Counter a spell\."
    ), h_counter_plain),
    ("kill_all_gear", re.compile(
        r"Kill all gear\."
    ), h_kill_all_gear),
    ("kill_each_player_gear", re.compile(
        r"Each player kills one of their gear\."
    ), h_kill_each_player_gear),
    ("kill_each_player_unit", re.compile(
        r"Each player kills one of their units\."
    ), h_kill_each_player_unit),
    ("kill_total_might", re.compile(
        r"Kill any number of units at a battlefield with total Might (\d+) or less\."
    ), h_kill_total_might),
    ("kill_unit_plain", re.compile(
        r"Kill a unit\."
    ), h_kill_unit_plain),
    ("return_hand_maxmight", re.compile(
        r"Return a unit at a battlefield with (\d+) Might or less to its owner.s hand\."
    ), h_return_hand_maxmight),
    ("return_hand_battlefield", re.compile(
        r"Return a unit at a battlefield to its owner.s hand\."
    ), h_return_hand_battlefield),
    ("return_hand_each_player", re.compile(
        r"Starting with the next player, each player may return a unit to its owner.s hand\."
    ), h_return_hand_each_player),
    ("move_ready", re.compile(
        r"Move a friendly unit and ready it\."
    ), h_move_ready),
    ("move_enemy", re.compile(
        r"Move an enemy unit\."
    ), h_move_enemy),
    ("move_up_to_base", re.compile(
        r"Move up to (\d+) friendly units to base\."
    ), h_move_up_to_base),
    ("ready_plain", re.compile(
        r"Ready a unit\."
    ), h_ready_plain),
    ("draw_channel", re.compile(
        r"Draw (\d+) and channel (\d+) rune exhausted\."
    ), h_draw_channel),
    ("draw_plain", re.compile(
        r"Draw (\d+)\."
    ), h_draw_plain),
    ("reveal_recycle", re.compile(
        r"Choose an opponent\.\s*They reveal their hand\.\s*"
        r"Choose a non-unit card from it, and recycle that card\."
    ), h_reveal_recycle),
    ("return_trash_cost_ignore", re.compile(
        r"Return up to (two|one|three|\d+) cards with \[Hidden\] from your trash to your hand\.\s*"
        r"You can hide cards ignoring costs this turn\."
    ), h_return_trash_cost_ignore),
    ("buff_then_fight", re.compile(
        r"Give a friendly unit \+(\d+) Might this turn\.\s*Then choose an enemy unit\.\s*"
        r"They deal damage equal to their Mights to each other\."
    ), h_buff_then_fight),
    ("fight_plain", re.compile(
        r"Choose a friendly unit and an enemy unit\.\s*They deal damage equal to their Mights to each other\."
    ), h_fight_plain),
    ("set_might_source_unit", re.compile(
        r"Choose a friendly unit\.\s*This turn, increase its Might to the Might of another friendly unit\."
    ), h_set_might_source_unit),
    ("debuff_then_predict", re.compile(
        r"Give a unit -(\d+) Might this turn\.\s*\[Predict\]\."
    ), h_debuff_then_predict),
    ("predict_plain", re.compile(
        r"\[Predict\]\."
    ), h_predict_plain),
    ("bone_skewer", re.compile(
        r"Choose a battlefield\.\s*An opponent reveals their hand\.\s*You may choose a unit from it\.\s*"
        r"They play that unit to that battlefield, ignoring any and all costs\.\s*When they do, \[Stun\] it\."
    ), h_bone_skewer),
    ("damage_simple", re.compile(
        r"Deal (\d+) to (?:a unit at a battlefield|a unit)\."
    ), h_damage_simple),
    ("grant_keyword_wrapped", re.compile(
        r"Give (?:a|an) (friendly |enemy )?unit ((?:\[[^\]]+\](?:\s*and\s*)?)+)\s*(?:this turn)?\."
    ), h_grant_keyword_wrapped),
    ("buff_debuff_simple", re.compile(
        r"Give (?:a|an) (friendly |enemy )?unit ([+-]\d+) Might(?: this turn)?(, to a minimum of (\d+) Might)?\."
    ), h_buff_debuff_simple),
    ("stun_plain", re.compile(
        r"Stun a unit\."
    ), h_stun_plain),
]


def strip_static_bare_keyword_prefix(body):
    body = TRIGGER_LEADIN_RE.sub("", body)
    return body


def compile_steps(body, ctx):
    remaining = strip_static_bare_keyword_prefix(body)
    steps = []
    iterations = 0
    while remaining.strip() and iterations < 20:
        iterations += 1
        best = None
        for name, pattern, handler in PATTERNS:
            m = pattern.search(remaining)
            if m and (best is None or m.start() < best[2].start()):
                best = (name, handler, m)
        if best is None:
            break
        name, handler, m = best
        steps.extend(handler(m, ctx))
        remaining = (remaining[: m.start()] + " " + remaining[m.end():]).strip()
    for i, s in enumerate(steps, start=1):
        s["stepIdx"] = i
        # reorder keys to match decisions-file field order
        ordered = {"stepIdx": s["stepIdx"], "function": s["function"], "target": s["target"],
                   "targetScope": s["targetScope"], "value": s.get("value"),
                   "condition": s.get("condition"), "optional": s.get("optional", False)}
        steps[i - 1] = ordered
    return steps, remaining.strip()


def bare_static_keyword_steps(body):
    return keyword_tokens_to_steps(body, "self", False)


# ---------------------------------------------------------------------------
# Per-card compilation
# ---------------------------------------------------------------------------

def compile_card(card, inv_row):
    text = card.get("text") or ""
    if not text.strip():
        return None

    tags, body = extract_meta_tags(text)
    cost, body = extract_additional_cost(body)
    if tags["repeat"]:
        rep = {"cost": tags["repeat"], "maxTimes": 1}
        cost = {**(cost or {}), "repeat": rep}

    trigger, timing, is_bare_static = determine_trigger(card, tags, body)

    ctx = {"inv_row": inv_row}
    if is_bare_static:
        steps = bare_static_keyword_steps(body)
        for i, s in enumerate(steps, start=1):
            s["stepIdx"] = i
        leftover = ""
    else:
        steps, leftover = compile_steps(body, ctx)

    n_clauses = max(1, len([c for c in re.split(r"(?<=[.])\s+", body) if c.strip()]))
    confidence = 1.0
    if leftover:
        confidence -= min(0.6, 0.2 * len(re.split(r"(?<=[.])\s+", leftover)))
    if not steps and not is_bare_static:
        confidence -= 0.5
    if card.get("type") not in ("Spell", "Unit"):
        confidence -= 0.15
    if trigger == "Static" and not is_bare_static:
        confidence -= 0.2
    confidence = max(0.0, round(confidence, 2))

    ability = {
        "cardCode": card["id"],
        "abilityIdx": 1,
        "trigger": trigger,
        "timing": timing,
        "additionalCost": cost,
        "steps": steps,
    }
    return {
        "ability": ability,
        "confidence": confidence,
        "sourceText": text,
        "unmatched": leftover or None,
        "cardName": card.get("name"),
        "cardCode": card["id"],
    }


# ---------------------------------------------------------------------------
# Calibration
# ---------------------------------------------------------------------------

def normalize_for_compare(obj):
    """Drop keys the decisions fixture doesn't always carry (name/lockedOn/
    note) and normalize None/False defaults so structural comparison is fair."""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k in ("name", "lockedOn", "note", "cardCode") and k != "cardCode":
                continue
            out[k] = normalize_for_compare(v)
        if "optional" in out and out["optional"] is False:
            pass
        return out
    if isinstance(obj, list):
        return [normalize_for_compare(v) for v in obj]
    return obj


def run_calibration(compiled_by_code):
    with open(DECISIONS_JSON, encoding="utf-8") as f:
        decisions = json.load(f)

    exact = []
    mismatched = []
    for card in decisions["cards"]:
        code = card["cardCode"]
        locked_abilities = card["abilities"]
        compiled = compiled_by_code.get(code)
        if compiled is None:
            mismatched.append((code, card["name"], "no candidate compiled (no text?)"))
            continue
        got = normalize_for_compare(compiled["ability"])
        # decisions fixture nests one ability per card in this set
        want = normalize_for_compare({**locked_abilities[0], "cardCode": code})
        if got == want:
            exact.append(code)
        else:
            mismatched.append((code, card["name"], {"got": got, "want": want}))
    return exact, mismatched


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    cards = load_cards()
    inventory = load_inventory()

    compiled_by_code = {}
    high_confidence = []
    review_queue = []

    for card in cards:
        code = card["id"]
        inv_row = inventory.get(code.upper())
        result = compile_card(card, inv_row)
        if result is None:
            continue
        compiled_by_code[code] = result
        if result["confidence"] >= CONFIDENCE_THRESHOLD:
            high_confidence.append(result)
        else:
            review_queue.append(result)

    def ability_entry(r):
        return {
            "cardCode": r["cardCode"],
            "cardName": r["cardName"],
            "confidence": r["confidence"],
            "abilities": [r["ability"]],
        }

    def review_entry(r):
        e = ability_entry(r)
        e["sourceText"] = r["sourceText"]
        e["unmatched"] = r["unmatched"]
        return e

    os.makedirs(os.path.dirname(OUT_ABILITIES), exist_ok=True)
    with open(OUT_ABILITIES, "w", encoding="utf-8") as f:
        json.dump(
            {
                "artifact": "abilities",
                "generatedBy": "scripts/compile_abilities.py",
                "confidenceThreshold": CONFIDENCE_THRESHOLD,
                "cardCount": len(high_confidence),
                "cards": [ability_entry(r) for r in high_confidence],
            },
            f,
            indent=2,
        )
        f.write("\n")

    with open(OUT_REVIEW, "w", encoding="utf-8") as f:
        json.dump(
            {
                "artifact": "abilities.review",
                "generatedBy": "scripts/compile_abilities.py",
                "confidenceThreshold": CONFIDENCE_THRESHOLD,
                "cardCount": len(review_queue),
                "cards": [review_entry(r) for r in review_queue],
            },
            f,
            indent=2,
        )
        f.write("\n")

    print(f"Compiled {len(compiled_by_code)} cards with text ({len(cards) - len(compiled_by_code)} skipped, no text).")
    print(f"  high-confidence -> {OUT_ABILITIES}: {len(high_confidence)}")
    print(f"  review queue    -> {OUT_REVIEW}: {len(review_queue)}")

    if os.path.exists(DECISIONS_JSON):
        exact, mismatched = run_calibration(compiled_by_code)
        total = len(exact) + len(mismatched)
        print(f"\nCalibration vs {DECISIONS_JSON}:")
        print(f"  {len(exact)}/{total} exact, {len(mismatched)} queued/mismatched")
        if mismatched:
            print("  Mismatches:")
            for code, name, detail in mismatched:
                print(f"   - {code} {name}")
    else:
        print("\n(no decisions fixture found, skipping calibration)")


if __name__ == "__main__":
    main()
