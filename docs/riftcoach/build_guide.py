#!/usr/bin/env python3
"""
Vendetta Pre-Rift build guide + observation instrument — PDF generator.

CANONICAL FILE. Overwrite and re-commit this rather than creating build_vNN.py
siblings; git history is the version log. Current output version: v12.

Inputs
  Riftbound_stuff_-_Master_Card_Inventory__2_.csv   Ashwin-authored fields
  src/data/cards.json                              Riftcodex-derived fields

Data authority (do not diff across sources beyond what is checked here):
  cards.json  IS authoritative for energy, might, speed, keywords.
  the CSV     IS authoritative for Subtype, Function, Ability Target, Used In —
              these are Ashwin's own FUNCTIONAL classifications and are NOT the
              same field as cards.json "subtype". Never diff them.
  On every run this script cross-checks energy and might and prints a
  MISMATCH line per divergence. Silence means the two sources agree.

Output: Vendetta_Pre-Rift_v12.pdf — 4 pages.
  p1  P1-P6 steps + domain sorting (counts on top of each domain's card list)
  p2  Legend modifiers + the build
  p3  Lane A field capture
  p4  Legends + "what can hit me" threat tables

Card-name matching rule: match on EXACT name or collector number, never on
substring. Substring matching on "Poro" once excluded Punching Poro along with
Ol' Poro and produced a wrong turn-1 count that was reported to Ashwin as a
regression. See BARRED_FROM_TURN1 in pool_workbook.py.

BUG FIXED 2026-07-30 (repo-wide audit): find() below carried the same
substring risk via a startswith() fallback, used to resolve every V7
tier-list and signature-card lookup -- not yet triggered by today's data, but
the same class of bug. Removed; find() now falls back only to whole-word
token overlap (>=2 shared words), never substring/prefix matching.
"""

import csv, re
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Table, TableStyle,
                                Paragraph, Spacer, PageBreak)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT

F, FB = "Helvetica", "Helvetica-Bold"
GRID = colors.HexColor("#9A9A9A")
HEAD = colors.HexColor("#E4E4E4")
RULE = colors.HexColor("#222222")
DOMBG = {"R": colors.HexColor("#FBDDD8"), "O": colors.HexColor("#FFE8D1"),
         "Y": colors.HexColor("#FFF4CC"), "G": colors.HexColor("#DDF0E2"),
         "B": colors.HexColor("#DCEBFA"), "P": colors.HexColor("#EFE3FA")}
DOM = {"R": "Fury", "O": "Body", "Y": "Order", "G": "Calm", "B": "Mind", "P": "Chaos"}
ORDER = ["R", "O", "Y", "G", "B", "P"]          # ROYGB(I)V
LET = {v: k for k, v in DOM.items()}

M = 15
PW, PH = letter
FW = PW - 2 * M

sec = ParagraphStyle("sec", fontName=FB, fontSize=9, leading=10,
                     spaceBefore=1, spaceAfter=2, alignment=TA_LEFT)
tiny = ParagraphStyle("t", fontName=F, fontSize=6, leading=7,
                      textColor=colors.HexColor("#444444"), alignment=TA_LEFT)
title = ParagraphStyle("ti", fontName=FB, fontSize=12, leading=13, spaceAfter=1)

rows = [x for x in csv.DictReader(
    open("/mnt/user-data/uploads/Riftbound_stuff_-_Master_Card_Inventory__2_.csv",
         encoding="utf-8-sig")) if x["Set"] == "Vendetta"]

# --- authority override: energy/might come from cards.json (web-verified 2026-07-26)
import json as _json, re as _re
_J = {c["collectorNumber"]: c for c in _json.load(open("/home/claude/ra/src/data/cards.json"))
      if c.get("setId") == "VEN"}
for _r in rows:
    _m = _re.match(r"VEN-(\d+)-166", _r["Card Code"].strip())
    if not _m:
        continue
    _c = _J.get(int(_m.group(1)))
    if not _c:
        continue
    if _c.get("energy") is not None and str(_c["energy"]) != _r["Energy"].strip():
        print("  ENERGY MISMATCH", _r["Card Name"], _r["Energy"], "vs json", _c["energy"])
        _r["Energy"] = str(_c["energy"])
    if _c.get("might") is not None and str(_c["might"]) != _r["Might"].strip():
        print("  MIGHT MISMATCH", _r["Card Name"], _r["Might"], "vs json", _c["might"])
        _r["Might"] = str(_c["might"])
play = [x for x in rows if x["Type"] in ("Unit", "Spell", "Gear")]


def norm(s):
    s = s.lower().replace("&", "and").replace("'", "'")
    return re.sub(r"[^a-z0-9 ]", "", s).strip()


BY = {norm(x["Card Name"]): x for x in play}


def find(name):
    n = norm(name)
    if n in BY:
        return BY[n]
    toks = set(n.split())
    best, sc = None, 0
    for k, v in BY.items():
        o = len(toks & set(k.split()))
        if o > sc:
            best, sc = v, o
    return best if sc >= 2 else None


# ---- v7 tier lists -> tier numbers 1 MUST 2 GOOD 3 SIT 4 AVOID
V7 = {
 "Fury": (["Punching Poro","Shadow Fiend","Baccai Reaper","Perfect Execution","Ruthless Strike","Oasis Raider","Morgana Vindictive"],
          ["Consuming Curse","Forsaken Baccai","Akali Deadly Weapon","Dune Surfer","Pendulum Blade","Twilight Reveler","Blade Twirler","Zed From the Shadows","Renekton Rage Fueled","Eclipse Dragon"],
          ["Rage Amplifier","Shadow Assassin","Baccai Sandspinner"],
          ["Brittle Steel","Endless Riches","Decree of Rage"]),
 "Calm": (["Twilight Shroud","Mournful Witness","Ol' Poro","Resonating Strike","Serene Ascetic","Akali Silent","Pakaa Protector"],
          ["Hand Hammer","Affectionate Poro","Sanction","Field Musicians","Tomb-Raider Barbara","Esteemed Hierophant","Shen Scourge of Shadows","Astral Heron","Nasus Ascended"],
          ["Frostcoat Mother","Riven Shattered","Sandstone Chimera"],
          ["Steel Paws","Crumbling Sands","Helm of Suppression","Decree of Focus"]),
 "Mind": (["Mesmerize","Apprentice Mage","Covert Informant","Shock Blast","Mel Newly Awakened","Nasus Guardian of Knowledge"],
          ["Otterpus","Dredge Up","Applied Researchers","Grumpy Rockbear","Iterative Design","Cloud Drake","Jayce Brilliant Inventor","Swain Visionary"],
          ["Patched Porobot","Temporal Breach","Questionable Tome","Sky Cruiser","Plaza Guardian"],
          ["Bottled Constellation","Clairvoyance","Decree of Insight"]),
 "Body": (["Guttural Roar","Legion Marauder","Brutal Hunter","Rampage","Ambessa The Wolf","Jayce Hammer in Hand","Onslaught"],
          ["Jagged Cutlass","Baccai Witherclaw","Profiteer","Tools of Empire","Dame the Despoiler","Gangplank Naval"],
          ["Repair Specialist","Hextech Disc","Renekton Brute","Wild Claw","Cataclysmic Duel","Corrupted Dragon"],
          ["Noxian Demolitionist","Platewyrm Egg","Decree of Strength"]),
 "Chaos": (["Gust Monk","Shadow Order Disciple","Kennen Storm of Shuriken","Tornado Warrior","Wind and Ghosts","Tail-Cloaked Matriarch"],
           ["Twilight Step","Mask Mother","Ravenbloom Prefect","Kinkou Lifeblade","Mel Defiant Soul","Zed Without a Sound","Illaoi","Minah Swiftfoot","Ocean Drake"],
           ["Up from the Deep","Shadows of the Past","Shadowblade Lurker","Stargazer","Forgotten Relic","Kharox"],
           ["Spiderling","Decree of Discord"]),
 "Order": (["Ki Barrier","Lacerate","Noxian Emissary","Dragon Form","Kayle Justified","Masa Crashing Thunder","Sacred Protector"],
           ["Disciple of Shen","Kennen Keeper of Balance","Solari Sunhawk","Soulspinner","Ambessa Respected & Feared","Aurok General","Keeper of Law","Horns of the Dragon","Shen Leader of the Kinkou"],
           ["Fallen Feline","Escaped Grayback","Hungry Wolf"],
           ["Glowstone","Reluctant Leader","Shady Spectacles","Decree of Unity"]),
}
SIG = {1: ["Lightning Rush","Public Execution","Dominus","Siphoning Strike"],
       2: ["Shuriken Flip","Death Mark","Shadow Dash","Acceleration Gate","Rebuttal"]}

TIER, MISS = {}, []
for dom, groups in V7.items():
    for i, g in enumerate(groups, start=1):
        for nm in g:
            c = find(nm)
            if c:
                TIER[c["Card Name"]] = i
            else:
                MISS.append(nm)
for t, names in SIG.items():
    for nm in names:
        c = find(nm)
        if c:
            TIER[c["Card Name"]] = t
        else:
            MISS.append(nm)

story = []
S = lambda s: Paragraph(s, sec)
T = lambda s: Paragraph(s, tiny)

PIP = {"Fury": "R", "Calm": "G", "Mind": "B", "Body": "O", "Chaos": "P", "Order": "Y"}
COSTOVERRIDE = {"Shock Blast": "1(B)/3(B)"}


def cost_of(c):
    if c["Card Name"] in COSTOVERRIDE:
        return COSTOVERRIDE[c["Card Name"]]
    e = c["Energy"].strip()
    p = c["Power"].strip()
    if p in ("", "None", "-"):
        return e
    parts = [x.strip() for x in p.split(",")]
    if all(x not in PIP for x in parts):
        return f"{e}+{len(parts)}"
    uniq = sorted(set(x for x in parts if x in PIP))
    gen = sum(1 for x in parts if x not in PIP)
    tail = f"+{gen}" if gen else ""
    if len(uniq) == 1:
        n = sum(1 for x in parts if x == uniq[0])
        return f"{e}{PIP[uniq[0]] * n}{tail}"
    return f"{e}{'/'.join(PIP[d] for d in uniq)}{tail}"


def spd(c):
    return {"Action": "(A) ", "Reaction": "(R) "}.get(c["Speed"].strip(), "")


def hidmark(c):
    """Prefix markers: Hidden and Ambush, so they read at a glance."""
    m = ""
    if "Hidden" in (c["Keywords"] or "") or "[Hidden]" in (c["Card Text"] or ""):
        m += "\u00a4"
    if "Ambush" in (c["Keywords"] or ""):
        m += "\u00bb"
    return m + " " if m else ""


def label(c, n=20):
    return hidmark(c) + spd(c) + short(c["Card Name"], n)


def sub(c):
    s = c["Subtype"].strip()
    return "" if s in ("None", "", "-") else s


def short(n, k=30):
    return n if len(n) <= k else n[:k - 1].rstrip() + "\u2026"


def ecost(c):
    v = c["Energy"].strip()
    return float(v) if v.replace(".", "").isdigit() else 99


def rule(w=FW, th=1.1):
    t = Table([[""]], colWidths=[w], rowHeights=[1])
    t.setStyle(TableStyle([("LINEABOVE", (0, 0), (-1, 0), th, RULE)]))
    return t


def tb(data, widths, rh=None, fs=8, header=True, extra=None, align="LEFT"):
    t = Table(data, colWidths=widths, rowHeights=rh, hAlign="LEFT")
    c = [("FONT", (0, 0), (-1, -1), F, fs), ("GRID", (0, 0), (-1, -1), 0.4, GRID),
         ("VALIGN", (0, 0), (-1, -1), "TOP"), ("ALIGN", (0, 0), (-1, -1), align),
         ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 2),
         ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]
    if header:
        c += [("FONT", (0, 0), (-1, 0), FB, fs), ("BACKGROUND", (0, 0), (-1, 0), HEAD)]
    if extra:
        c += extra
    t.setStyle(TableStyle(c))
    return t


def wrap(rowsdata, widths, **kw):
    t = Table(rowsdata, colWidths=widths, hAlign="LEFT", **kw)
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("LEFTPADDING", (0, 0), (-1, -1), 0),
                           ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                           ("TOPPADDING", (0, 0), (-1, -1), 0),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    return t


# ============================================================ PAGE 1 (unchanged)
story.append(Paragraph("VENDETTA PRE-RIFT \u00b7 v12", title))
story.append(T("Combined build guide + observation instrument \u00b7 Bo1 \u00b7 "
               "Count domains first, then fit a Legend to them."))
story.append(Spacer(1, 4))
story.append(tb([["Event", "", "Session", "", "Date", "", "Format", "Bo1 / Bo3", "Pool photo", "Y / N"]],
                [34, 112, 42, 70, 26, 62, 40, 54, 50, 42], rh=[17], header=False, fs=8,
                extra=[("FONT", (0, 0), (0, 0), FB, 8), ("FONT", (2, 0), (2, 0), FB, 8),
                       ("FONT", (4, 0), (4, 0), FB, 8), ("FONT", (6, 0), (6, 0), FB, 8),
                       ("FONT", (8, 0), (8, 0), FB, 8)]))
story.append(Spacer(1, 6))
story.append(rule())
story.append(S("STEPS \u00b7 write the actual minutes in the box"))

steps = [
 ("P1 OPEN", "4m", ["Open precon + 5 packs \u00b7 Riven aside",
                    "Pile by domain \u2014 all 6",
                    "Legends + battlefields aside"]),
 ("P2 RANK DOMAINS", "6m", ["Sort each domain by cost",
                            "Count MUST \u00b7 GOOD \u00b7 T1 \u00b7 M5+",
                            "Rank all 6 \u00b7 drop the bottom 2"]),
 ("P3 PICK THE LEGEND", "4m", ["List every Legend you opened",
                               "Gate 1: both domains in the top 4?",
                               "Gate 2: threshold clears (page 4)?",
                               "Neither gate \u2192 no Legend, extra card"]),
 ("P4 BUILD", "10m", ["Win-condition sentence first",
                      "Build to the targets on page 2",
                      "Cut whatever doesn't serve it"]),
 ("P5 RUNES + BATTLEFIELD", "6m", ["Count pip demands",
                                   "Set the split",
                                   "Pick the battlefields"]),
 ("P6 LEGALITY", "30s", ["Domains \u00b7 battlefields \u00b7 runes",
                          "Every coloured pip payable",
                          "Champion + Signature in identity"]),
]


def stepcell(t):
    name, tgt, items = t
    d = [[Paragraph(name, ParagraphStyle('x', fontName=FB, fontSize=8.5, leading=9.5)),
          Paragraph(tgt, ParagraphStyle('y', fontName=F, fontSize=7.5, leading=9.5)), ""]]
    for it in items:
        d.append([Paragraph("\u25a1 " + it,
                            ParagraphStyle('z', fontName=F, fontSize=7.4, leading=8.8)), "", ""])
    t2 = Table(d, colWidths=[126, 23, 29], rowHeights=[13] + [None] * len(items), hAlign="LEFT")
    t2.setStyle(TableStyle([
        ("SPAN", (0, 1), (2, 1)), ("SPAN", (0, 2), (2, 2)), ("SPAN", (0, 3), (2, 3)), ("SPAN", (0, 4), (2, 4)),
        ("BACKGROUND", (0, 0), (-1, 0), HEAD), ("BOX", (0, 0), (-1, -1), 0.6, GRID),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, GRID), ("BOX", (2, 0), (2, 0), 0.5, GRID),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 1.6), ("BOTTOMPADDING", (0, 0), (-1, -1), 1.6)]))
    return t2


story.append(wrap([[stepcell(steps[0]), stepcell(steps[1]), stepcell(steps[2])],
                   [stepcell(steps[3]), stepcell(steps[4]), stepcell(steps[5])]],
                  [193, 193, 193]))
story.append(Spacer(1, 6))
story.append(rule())
story.append(S("P2 \u2014 DOMAIN SORTING  \u00b7  1 MUST  \u00b7  2 GOOD  \u00b7  3 SIT  \u00b7  4 AVOID  \u00b7  "
               "\u00a7 Signature  \u00b7  \u00a4 Hidden  \u00b7  \u00bb Ambush"))

dcols = []
for d in ORDER:
    dn = DOM[d]
    mine = sorted([c for c in play if c["Domain(s)"].strip() == dn], key=lambda c: (ecost(c), c["Card Name"]))
    sigs = sorted([c for c in play if dn in c["Domain(s)"] and "," in c["Domain(s)"]],
                  key=lambda c: (ecost(c), c["Card Name"]))
    data = [[dn.upper(), "", ""],
            ["MUST", "", "GOOD", ""],
            ["Turn-1", "", "M5+", ""],
            ["RANK", "", "", ""]]
    hdr = Table([[dn.upper(), "", "", ""],
                 ["MUST", "", "GOOD", ""],
                 ["T1", "", "M5+", ""],
                 ["RANK", "", "", ""]],
                colWidths=[26, 22, 26, 20], rowHeights=[11, 13, 13, 13], hAlign="LEFT")
    hdr.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), FB, 6.4), ("BACKGROUND", (0, 0), (-1, 0), DOMBG[d]),
        ("SPAN", (0, 0), (3, 0)), ("SPAN", (1, 3), (3, 3)),
        ("GRID", (0, 0), (-1, -1), 0.35, GRID), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 1),
        ("TOPPADDING", (0, 0), (-1, -1), 0.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 0.5)]))
    body = [["E", "Card", ""]]
    tierbreaks = []
    prev = None
    for c in mine:
        e = c["Energy"].strip()
        if prev is not None and e != prev:
            tierbreaks.append(len(body))
        prev = e
        body.append([e, hidmark(c) + short(c["Card Name"]), str(TIER.get(c["Card Name"], ""))])
    if mine and sigs:
        tierbreaks.append(len(body))
    for c in sigs:
        body.append([c["Energy"], "\u00a7 " + hidmark(c) + short(c["Card Name"], 26),
                     str(TIER.get(c["Card Name"], ""))])
    bt = Table(body, colWidths=[11, 72, 11], rowHeights=[9.8] + [9.9] * (len(body) - 1), hAlign="LEFT")
    bt.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), F, 6), ("FONT", (0, 0), (-1, 0), FB, 6),
        ("BACKGROUND", (0, 0), (-1, 0), HEAD),
        ("GRID", (0, 0), (-1, -1), 0.3, GRID), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 1), (0, -1), "CENTER"), ("ALIGN", (2, 1), (2, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 1.5), ("RIGHTPADDING", (0, 0), (-1, -1), 1),
        ("TOPPADDING", (0, 0), (-1, -1), 0.3), ("BOTTOMPADDING", (0, 0), (-1, -1), 0.3)]
        + [("LINEABOVE", (0, i), (-1, i), 0.9, RULE) for i in tierbreaks]))
    dcols.append(wrap([[hdr], [Spacer(1, 2)], [bt]], [96]))
story.append(wrap([dcols], [97] * 6))
story.append(Spacer(1, 6))
story.append(rule())
story.append(S("P3 \u2014 LEGEND SELECTION"))
story.append(tb([["Legend opened", "Gate 1 domains", "Gate 2 threshold", "Chosen"]]
                + [["", "", "", ""]] * 4, [190, 96, 106, 70], rh=[15] + [23] * 4, fs=8))
story.append(Spacer(1, 3))
story.append(tb([["Legend-less?", "Y / N", "Forced (nothing passed) / Chosen"]],
                [70, 44, 176], rh=[22], header=False, fs=8,
                extra=[("FONT", (0, 0), (0, 0), FB, 8)]))
story.append(Spacer(1, 6))
story.append(rule())
story.append(S("WIN-CONDITION SENTENCE  \u00b7  write before cutting cards"))
story.append(tb([[""]], [FW], rh=[34], header=False))

story.append(PageBreak())

# ============================================================ PAGE 2 — THE BUILD
story.append(Paragraph("PAGE 2 \u00b7 LEGENDS  +  THE BUILD", title))
story.append(S("LEGEND MODIFIERS \u00b7 applied in P3"))
story.append(T("ELEVATE = treat as MUST-PLAY for this Legend. Jayce, Nasus and Kennen omitted \u2014 all three need a synergy density you can't assemble sight-unseen."))
story.append(Spacer(1, 2))

LEG = [
 ("AKALI", "Conquer and retreat, never hold", "3+ move payoffs",
  "Protective Sands \u00b7 Risen Altar",
  "Pendulum Blade \u00b7 Affectionate Poro \u00b7 Akali Deadly Weapon \u00b7 Twilight Reveler",
  "4\u20135 turn-1 \u00b7 heavy E3\u2013E4 \u00b7 max 1 at 6+",
  ["Pendulum Blade \u2192 move \u2192 move again = +5 Might, two battlefields in a turn",
   "Equipment survives its holder \u2014 re-equip it. Akali Silent hits M6, M8 if moved twice",
   "Poro in a showdown \u2192 move it out \u2192 free draw (JUDGE-CONFIRMED: after damage)",
   "Move works unEmpowered; only the ready needs Empower"]),
 ("AMBESSA", "Empower chain aggro, go wide", "3+ cheap Empower outlets (\u22642 cost)",
  "Risen Altar \u00b7 Protective Sands",
  "Noxian Emissary \u00b7 Solari Sunhawk \u00b7 Profiteer \u00b7 Tools of Empire \u00b7 Ambessa Respected & Feared \u00b7 Aurok General",
  "4\u20135 turn-1 \u00b7 heavy E3\u2013E4 \u00b7 max 2 at 6+",
  ["Legion Marauder = cheapest recharge in the set",
   "Profiteer moves an Empowered status onto the Legend = free Empower",
   "Kayle = three chain triggers, ends M9 with Deflect 3 + Ganking",
   "Aurok General gives every Empowered unit +2 \u00b7 Risen Altar discounts units, not gear"]),
 ("MEL", "Shrink everything, win on attrition", "3+ Empower outlets, 2+ \u2212Might removal",
  "Sandswept Tomb \u00b7 Risen Altar",
  "Kinkou Lifeblade \u00b7 Mel Defiant Soul",
  "3\u20134 turn-1 \u00b7 load E3\u2013E5 with real bodies",
  ["Legend \u22122 + Mesmerize \u22122 = \u22124; add Mel Newly Awakened = \u22126, reaches M9",
   "Shock Blast + Legend kills M6",
   "Tail-Cloaked Matriarch returns a free \u22643-cost unit per re-Empower",
   "Both domains are body-light: splash for beef, not tricks"]),
 ("RENEKTON", "Two decks under one Legend, pick one", "A 3+ low-rune payoffs, or B 6+ spare energy",
  "Protective Sands \u00b7 Threshold of the Gray",
  "A: Forsaken Baccai \u00b7 Oasis Raider \u00b7 Baccai Sandspinner \u00b7 Eclipse Dragon \u00b7 Renekton Rage Fueled | B: Tools of Empire \u00b7 Renekton Brute \u00b7 any repeatable sink",
  "A low and wide \u00b7 B higher with sinks",
  ["Reaction energy pays Empower costs mid-combat",
   "Rune recycling is an on-demand Reaction \u2014 \"\u22644 runes\" is a choice",
   "Never merge the two builds",
   "Rated low everywhere \u2014 if both thresholds fail, take the extra card"]),
 ("ZED", "Flow/banish aggro, press the board", "3+ Flow spells and 3+ banish outlets",
  "Risen Altar \u00b7 Shadow Temple (4+ Flow only)",
  "Punching Poro \u00b7 Ravenbloom Prefect \u00b7 Zed From the Shadows \u00b7 Zed Without a Sound",
  "4\u20135 turn-1 \u00b7 heavy E2\u2013E4",
  ["Flow \u2192 banish \u2192 Empowers Zed \u2192 disempower \u2192 loot next Flow spell into trash",
   "Zed Without a Sound swaps with a Shadow Clone for 1, dodging a losing combat",
   "Fuel with discard, not Burn. AVOID Endless Riches \u2014 deletes your own engine",
   "Flow + Empower together does NOT work: too many triggers, too few runes"]),
 ("SHEN", "Pairs and hold, score out", "4+ \"exactly one other unit\" payoffs",
  "Kinkou Temple \u00b7 Sandswept Tomb",
  "Disciple of Shen \u00b7 Affectionate Poro \u00b7 Keeper of Law \u00b7 Shen Scourge of Shadows \u00b7 Horns of the Dragon \u00b7 Shen Leader of the Kinkou",
  "slower is fine: 3\u20134 turn-1 \u00b7 load E4\u2013E6",
  ["Going second: unit turn 1, then move in + Shen Scourge at that battlefield turn 2",
   "Ki Barrier + Tank \u2192 they need prevented damage plus Might for lethal",
   "Shen Leader scores on every hold with exactly one other unit \u2014 that IS the win condition",
   "WEAK TO Dune Surfer, which ignores Tank and is a common"]),
]


def legcell(L):
    nm, strat, thr, bf, elev, curve, combos = L
    st = ParagraphStyle('l', fontName=F, fontSize=6.5, leading=7.7)
    d = [[Paragraph(f"{nm} \u2014 <font name=Helvetica>{strat}</font>",
                    ParagraphStyle('lh', fontName=FB, fontSize=7.6, leading=8.6))],
         [Paragraph(f"<b>THRESHOLD</b>  {thr}", st)],
         [Paragraph(f"<b>BATTLEFIELD</b>  {bf}", st)],
         [Paragraph(f"<b>ELEVATE</b>  {elev}", st)],
         [Paragraph(f"<b>CURVE</b>  {curve}", st)],
         [Paragraph("<br/>".join("\u2022 " + c for c in combos), st)]]
    t = Table(d, colWidths=[282], hAlign="LEFT")
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, 0), HEAD),
                           ("BOX", (0, 0), (-1, -1), 0.6, GRID),
                           ("LINEBELOW", (0, 0), (0, 4), 0.3, GRID),
                           ("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                           ("TOPPADDING", (0, 0), (-1, -1), 1.2), ("BOTTOMPADDING", (0, 0), (-1, -1), 1.2)]))
    return t


story.append(wrap([[legcell(LEG[0]), legcell(LEG[1])],
                   [legcell(LEG[2]), legcell(LEG[3])],
                   [legcell(LEG[4]), legcell(LEG[5])]], [288, 288],
                  rowHeights=None))


EFFECT = {
 # Fury
 "Decree of Rage":"4 dmg (Calm only)", "Shuriken Flip":"2 dmg, move friendly",
 "Brittle Steel":"kill a gear", "Consuming Curse":"2 dmg +1/copy in trash",
 "Death Mark":"burn 3, 0M clone", "Akali, Deadly Weapon":"1/2 dmg on move",
 "Perfect Execution":"ready + Assault 3", "Ruthless Strike":"3/5 dmg (discard)",
 "Dominus":"double Might, ready", "Morgana, Vindictive":"dmg = dmg marked on it",
 "Renekton, Rage Fueled":"2 dmg all here, \u22644 runes",
 # Body
 "Decree of Strength":"strip a Mind card", "Guttural Roar":"+2/+4 Might",
 "Public Execution":"kill smaller than yours", "Acceleration Gate":"ready up to 4",
 "Rampage":"fight, +2 Might if paid", "Onslaught":"+6 Might",
 "Wild Claw":"dig 5, cheap unit/gear", "Cataclysmic Duel":"each keeps 1, kill rest",
 # Order
 "Lightning Rush":"dig 3, draw 1", "Decree of Unity":"kill a Chaos unit/gear",
 "Ki Barrier":"prevent 7 dmg", "Lacerate":"disempower, kill \u22643M",
 "Shadow Dash":"pull enemy to you", "Dragon Form":"base Might becomes 5",
 "Kennen, Keeper of Balance":"Hidden: stun for 2", "Soulspinner":"Ambush body",
 "Masa, Crashing Thunder":"stun on play if paid",
 "Ambessa, Respected and Feared":"kills smaller on attack",
 # Calm
 "Crumbling Sands":"counter 2nd spell", "Decree of Focus":"+4 Might vs Fury",
 "Twilight Shroud":"+1 Might, untargetable", "Resonating Strike":"move, +2 Might",
 "Riven, Shattered":"2 dmg per Equipment", "Sanction":"empower or disempower",
 "Siphoning Strike":"4/7 dmg (7+ runes)", "Tomb-Raider Barbara":"kill gear, 7+ runes",
 "Esteemed Hierophant":"immune, 7+ runes",
 # Mind
 "Decree of Insight":"\u22125 Might to Body unit", "Mesmerize":"\u22122 Might or bounce mine",
 "Rebuttal":"counter/steal spell \u22644", "Dredge Up":"draw 1",
 "Temporal Breach":"Hidden: blink a unit", "Shock Blast":"4 dmg",
 "Iterative Design":"3-Might Mech token", "Mel, Newly Awakened":"draw 1; boosts \u2212Might",
 "Sky Cruiser":"discard gear: 4 dmg", "Clairvoyance":"Predict 5, draw 2",
 # Chaos
 "Decree of Discord":"bounce Order \u22645 total", "Gust Monk":"Assault 2 if paid",
 "Twilight Step":"move a unit \u22643M", "Shadows of the Past":"return 2 from trash",
 "Up from the Deep":"two 1-Might tentacles", "Wind and Ghosts":"banish \u22643M, else bounce",
 "Mel, Defiant Soul":"banish enemy \u22643M", "Zed, Without a Sound":"swap with Shadow Clone",
}


def effect(c):
    return EFFECT.get(c["Card Name"], "")


RM = ("deal ", "banish", "kill", "destroy", "stun", "-1 might", "-2 might", "-3 might", "return")


def threat_unit(c):
    if c["Type"] != "Unit":
        return False
    if c["Speed"] in ("Action", "Reaction"):
        return True
    t = c["Card Text"].lower()
    if not any(w in t for w in ("enemy", "a unit", "target")):
        return False
    return any(w in t for w in RM)


story.append(Spacer(1, 5))
story.append(rule())
story.append(S("THE BUILD"))
story.append(Spacer(1, 1))
story.append(tb([["Legend", "", "Chosen Champion", "", "Signature", ""],
                 ["Final domains (\u22643)", "", "Deck size", "", "Rune split", ""],
                 ["Units", "", "Spells", "", "Gear", ""]],
                [84, 110, 90, 100, 58, 90], rh=[20, 20, 20], header=False, fs=8,
                extra=[("FONT", (0, 0), (0, -1), FB, 8), ("FONT", (2, 0), (2, -1), FB, 8),
                       ("FONT", (4, 0), (4, -1), FB, 8),
                       ("BACKGROUND", (0, 0), (0, -1), HEAD), ("BACKGROUND", (2, 0), (2, -1), HEAD),
                       ("BACKGROUND", (4, 0), (4, -1), HEAD)]))
story.append(Spacer(1, 5))
story.append(S("CURVE \u00b7 count per cost, NOT cumulative"))
story.append(tb([["Cost", "\u22642", "3", "4", "5", "6+"],
                 ["Units", "", "", "", "", ""],
                 ["Spells / Gear", "", "", "", "", ""]],
                [76, 100, 100, 100, 100, 104], rh=[13, 19, 19], fs=8))
story.append(Spacer(1, 4))
story.append(S("MIGHT \u00b7 count per bucket, NOT cumulative"))
story.append(tb([["Might", "\u22642", "3", "4", "5", "6+"],
                 ["Units", "", "", "", "", ""]],
                [76, 100, 100, 100, 100, 104], rh=[13, 19], fs=8))
story.append(Spacer(1, 4))
story.append(T("M5+ is a diagnostic, not a target \u2014 Legends that GENERATE Might (Akali, Ambessa) read low and are still correct."))
story.append(Spacer(1, 2))
story.append(tb([["Turn-1 units (2-cost)", "", "Removal / damage cards", "", "Cards at 6+ (max 2)", ""]],
                [110, 62, 128, 62, 110, 62], rh=[20], header=False, fs=8,
                extra=[("FONT", (0, 0), (0, 0), FB, 8), ("FONT", (2, 0), (2, 0), FB, 8),
                       ("FONT", (4, 0), (4, 0), FB, 8)]))
story.append(T("Ol' Poro is NOT a turn-1 unit (barred turns 1\u20133) \u00b7 Punching Poro is. Removal = damages, kills, banishes, stuns or shrinks an enemy unit \u2014 only 23 of 147 cards can. No threshold yet: record it."))
story.append(Spacer(1, 5))
story.append(S("BATTLEFIELDS \u00b7 circle what you play \u00b7 two or more circled = Bo3, per-game pick goes on page 3"))
bfs = sorted(c["Card Name"] for c in rows if c["Type"] == "Battlefield")
story.append(tb([bfs[0:4], bfs[4:8], bfs[8:10] + ["BLANK (facedown)", ""]],
                [FW / 4] * 4, rh=[16, 16, 16], header=False, fs=8))
story.append(Spacer(1, 5))
td = [["2-drops", "25", "26", "27", "28", "29", "30"],
      ["3", "65%", "63%", "61%", "59%", "58%", "56%"],
      ["4", "76%", "74%", "72%", "71%", "69%", "68%"],
      ["5", "84%", "82%", "81%", "79%", "78%", "76%"],
      ["6", "90%", "88%", "87%", "86%", "84%", "83%"],
      ["7", "93%", "92%", "91%", "90%", "89%", "88%"]]
tdt = tb(td, [40, 30, 30, 30, 30, 30, 30], rh=[12] + [11] * 5, fs=6.6, align="CENTER",
         extra=[("ALIGN", (0, 0), (0, -1), "LEFT"), ("FONT", (1, 3), (3, 3), FB, 6.6),
                ("FONT", (1, 4), (6, 5), FB, 6.6)])
rt = tb([["Pip demands", "Runes", "Which domains?"], ["0 (free splash)", "0", ""],
         ["1\u20132", "3", ""], ["3\u20135", "4\u20135", ""], ["6+", "6\u20137", ""]],
        [76, 34, 116], rh=[13] + [15] * 4, fs=6.6)
fin = tb([["FINAL\nRUNE\nSPLIT", ""]], [44, 96], rh=[73], header=False, fs=8,
         extra=[("FONT", (0, 0), (0, 0), FB, 8), ("BACKGROUND", (0, 0), (0, 0), HEAD),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (0, 0), (0, 0), "CENTER")])
rt = Table([[rt, "", fin]], colWidths=[228, 6, 142], hAlign="LEFT",
           style=TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                             ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                             ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
story.append(wrap([[Paragraph("TWO-DROP PROBABILITY \u00b7 bold = 80%+", sec), "",
                    Paragraph("RUNE SPLIT", sec)],
                   [tdt, "", rt]], [222, 10, 380]))
story.append(T("Rule: 5 two-drops at 25\u201327 cards, 6+ at 28 or more. Pip demand = every pip you intend to pay "
               "(play \u00b7 Empower \u00b7 equip \u00b7 Flow \u00b7 activated ability). Any single cost needing 2 of one colour \u2192 "
               "that colour \u22655. Splits: 6/6 \u00b7 7/5 \u00b7 8/4 \u00b7 6/3/3 \u00b7 6/4/2 \u00b7 4/4/4. "
               "Pips: (R) Fury (G) Calm (B) Mind (O) Body (P) Chaos (Y) Order."))
story.append(Spacer(1, 4))
story.append(tb([["\u25a1 \u22643 domains", "\u25a1 3 battlefields", "\u25a1 12 runes",
                  "\u25a1 every coloured power pip payable", "\u25a1 Champion + Signature in identity"]],
                [72, 86, 58, 172, 178], rh=[16], header=False, fs=7.5))

# ============================================================ PAGE 4 — LEGENDS + THREATS
# ============================================================ PAGE 3 — FOLD-OVER DOMAIN CARDS
from reportlab.platypus import Flowable

story.append(PageBreak())
story.append(Paragraph("DOMAIN STRATEGY CARDS \u00b7 3 double-sided cards for 3 sleeves",
                       ParagraphStyle("cs", fontName=FB, fontSize=9, leading=10, spaceAfter=1)))
story.append(T("Cut the 3 solid outlines. Fold each backward on the dashed line \u2014 the lower half is printed "
               "upside down so it reads correctly on the back. Folded size 2.5 \u00d7 3.5 in. "
               "Pairs are colour-wheel opposites: Fury/Calm \u00b7 Body/Mind \u00b7 Order/Chaos. "
               "GREY = Action, Reaction or Ambush \u2014 can be played on YOUR turn; unshaded only on theirs. "
               "\u00a4 Hidden \u00b7 \u00bb Ambush \u00b7 \u2020 a unit whose own ability removes or damages."))
story.append(Spacer(1, 5))

CARD_W = 180   # 2.5 in
CARD_H = 252   # 3.5 in


def _isfast(c):
    return c["Speed"].strip() in ("Action", "Reaction") or "Ambush" in (c["Keywords"] or "")


class Rot180(Flowable):
    """Draw a flowable rotated 180 degrees, so it reads right-way-up once folded."""

    def __init__(self, content, w, h):
        Flowable.__init__(self)
        self.content, self.w, self.h = content, w, h

    def wrap(self, aw, ah):
        return self.w, self.h

    def draw(self):
        c = self.canv
        c.saveState()
        c.translate(self.w, self.h)
        c.rotate(180)
        self.content.wrapOn(c, self.w, self.h)
        self.content.drawOn(c, 0, 0)
        c.restoreState()


def card_face(d):
    dn = DOM[d]
    pool = [c for c in play if dn in c["Domain(s)"]]
    spells = [c for c in pool if c["Type"] == "Spell"
              or any(k in c["Keywords"] for k in ("Ambush", "Quickdraw"))]
    units = [c for c in pool if threat_unit(c) and c not in spells]
    spells.sort(key=lambda c: (ecost(c), c["Card Name"]))
    units.sort(key=lambda c: (ecost(c), c["Card Name"]))
    musts = sorted([c for c in pool if TIER.get(c["Card Name"]) == 1],
                   key=lambda c: (ecost(c), c["Card Name"]))

    hdr = Table([[dn.upper()]], colWidths=[CARD_W - 10], rowHeights=[13], hAlign="LEFT")
    hdr.setStyle(TableStyle([("FONT", (0, 0), (0, 0), FB, 8),
                             ("BACKGROUND", (0, 0), (0, 0), DOMBG[d]),
                             ("BOX", (0, 0), (0, 0), 0.4, GRID),
                             ("VALIGN", (0, 0), (0, 0), "MIDDLE"),
                             ("LEFTPADDING", (0, 0), (0, 0), 3)]))

    data = [["", "CAN HIT ME", ""]]
    fastrows = []
    for c in spells:
        if _isfast(c):
            fastrows.append(len(data))
        data.append([cost_of(c), label(c, 18), effect(c)])
    for c in units:
        if _isfast(c):
            fastrows.append(len(data))
        data.append([cost_of(c), "\u2020 " + label(c, 16), effect(c)])
    threat = Table(data, colWidths=[22, 66, 82],
                   rowHeights=[8.6] + [8.4] * (len(data) - 1), hAlign="LEFT")
    threat.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), F, 5.2), ("FONT", (0, 0), (-1, 0), FB, 5.4),
        ("BACKGROUND", (0, 0), (-1, 0), HEAD), ("SPAN", (0, 0), (2, 0)),
        ("GRID", (0, 0), (-1, -1), 0.25, GRID), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 1.5), ("RIGHTPADDING", (0, 0), (-1, -1), 1),
        ("TOPPADDING", (0, 0), (-1, -1), 0.3), ("BOTTOMPADDING", (0, 0), (-1, -1), 0.3)]
        + [("BACKGROUND", (0, i), (-1, i), colors.HexColor("#D0D0D0")) for i in fastrows]))

    md = [["", "MUST-PLAY"]]
    for c in musts:
        md.append([c["Energy"], hidmark(c) + short(c["Card Name"], 28)])
    must = Table(md, colWidths=[22, 148],
                 rowHeights=[8.6] + [8.4] * (len(md) - 1), hAlign="LEFT")
    must.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), F, 5.2), ("FONT", (0, 0), (-1, 0), FB, 5.4),
        ("BACKGROUND", (0, 0), (-1, 0), HEAD), ("SPAN", (0, 0), (1, 0)),
        ("GRID", (0, 0), (-1, -1), 0.25, GRID), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 1.5), ("RIGHTPADDING", (0, 0), (-1, -1), 1),
        ("TOPPADDING", (0, 0), (-1, -1), 0.3), ("BOTTOMPADDING", (0, 0), (-1, -1), 0.3)]))

    inner = Table([[hdr], [Spacer(1, 2)], [threat], [Spacer(1, 3)], [must]],
                  colWidths=[CARD_W - 10], hAlign="LEFT")
    inner.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                               ("LEFTPADDING", (0, 0), (-1, -1), 0),
                               ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                               ("TOPPADDING", (0, 0), (-1, -1), 0),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    face = Table([[inner]], colWidths=[CARD_W], rowHeights=[CARD_H], hAlign="LEFT")
    face.setStyle(TableStyle([("VALIGN", (0, 0), (0, 0), "TOP"),
                              ("LEFTPADDING", (0, 0), (0, 0), 5),
                              ("RIGHTPADDING", (0, 0), (0, 0), 5),
                              ("TOPPADDING", (0, 0), (0, 0), 5),
                              ("BOTTOMPADDING", (0, 0), (0, 0), 5)]))
    return face


def strip(front, back):
    """Front upright on top, back rotated 180 below, fold line between."""
    t = Table([[card_face(front)], [Rot180(card_face(back), CARD_W, CARD_H)]],
              colWidths=[CARD_W], rowHeights=[CARD_H, CARD_H], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (0, 1), 0.9, RULE),
        ("LINEBELOW", (0, 0), (0, 0), 0.5, colors.HexColor("#777777"), None, (2, 2)),
        ("VALIGN", (0, 0), (0, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    return t


sheet = Table([[strip("R", "G"), strip("O", "B"), strip("Y", "P")]],
              colWidths=[CARD_W + 6] * 3, hAlign="LEFT")
sheet.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("LEFTPADDING", (0, 0), (-1, -1), 0),
                           ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                           ("TOPPADDING", (0, 0), (-1, -1), 0),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
story.append(sheet)

out = "/mnt/user-data/outputs/Vendetta_Pre-Rift_v12.pdf"
doc = BaseDocTemplate(out, pagesize=letter, leftMargin=M, rightMargin=M,
                      topMargin=M, bottomMargin=M, title="Vendetta Pre-Rift v12")
doc.addPageTemplates([PageTemplate(id="a", frames=[Frame(M, M, FW, PH - 2 * M, id="f",
                      leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)])])
doc.build(story)
print("wrote", out)
