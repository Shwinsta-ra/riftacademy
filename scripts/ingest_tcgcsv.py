#!/usr/bin/env python3
"""
RiftAcademy — daily TCGplayer price ingest from tcgcsv.com.

Emits a SQL file rather than writing directly, matching the pattern used for every
other load in this project: the statements are reviewable before they run, and the
job needs no database driver installed.

Usage:
    python3 ingest_tcgcsv.py                 # normal run
    python3 ingest_tcgcsv.py --force         # ignore the last-updated check
    python3 ingest_tcgcsv.py --dry-run       # fetch and report, write nothing
    python3 ingest_tcgcsv.py --last-built-at TS   # CI: state comes from the database

Then:
    psql "$RA_DB" -f price_ingest_<date>.sql

State, and why there are two sources of it:
    A manual run keeps its high-water mark in a local file (STATE_FILE). That is fine
    on Ashwin's machine and wrong on a CI runner, which is destroyed after every job -
    a runner reading a local state file always sees "never ingested" and re-ingests
    every time. The scheduled workflow therefore reads the real high-water mark from
    price_ingest_runs.source_built_at and passes it in with --last-built-at, and this
    script does NOT write the local state file on those runs: the database row that
    the generated SQL inserts IS the state. Passing the value in rather than querying
    it here keeps the "no database driver installed" property noted above.

tcgcsv operator rules honoured, all from their published guidance:
  - last-updated.txt checked first; skip entirely if not newer than our last run
  - custom User-Agent (generic agents may be blocked)
  - 100ms sleep between requests (exceeding their threshold throttles the IP 10 min)
  - group list read live, never hardcoded, so new sets appear without a code change
  - 21 requests per full sync against their 10,000 ceiling
"""

import json, csv, io, re, sys, time, collections, urllib.request, urllib.error
from datetime import date, datetime, timezone
from pathlib import Path

BASE = "https://tcgcsv.com"
CATEGORY = 89                       # Riftbound
USER_AGENT = "RiftAcademy/1.0.0"
SLEEP = 0.1
STATE_FILE = Path.home() / ".riftacademy_tcgcsv_state.json"

# FOILS ARE CAPTURED. Ashwin reversed the 2026-08-06 exclusion the same day, on M8's
# evidence: foil runs 2.88x Normal at the median (mean 3.43x, p90 5.52x), and Vendetta's
# high-value cards are FOIL-ONLY with no Normal counterpart at all - Zed VEN-112/166,
# Swain VEN-065/166, Lightning Rush VEN-156/166. Excluding foils did not drop a cheap
# variant, it left the newest set's chase cards with no price in the database.
#
# Both subtypes of one printing share a printing_code and differ by tcgplayer_sub_type.
# That is deliberate: card_printings stays gameplay-shaped, per Core's read that foil-ness
# belongs to the physical copy rather than the printing, while the price spine carries the
# distinction where it actually matters.
#
# There is no toggle for this, deliberately. A CAPTURE_ALL_SUB_TYPES = True constant used
# to sit here and was referenced nowhere - setting it False changed nothing, so anyone
# auditing "is filtering on?" found a plausible-looking control that controlled nothing.
# Removed rather than wired: capturing every subtype is the decided behaviour, and a
# toggle implies a supported off-state that has never been designed. If subtype filtering
# is ever needed again, specify it against that requirement rather than resurrecting this.

SEALED_PATTERNS = [
    ("pre_rift_kit",    ["pre-rift", "prerift"]),
    ("display_case",    ["display case", "case"]),
    ("booster_display", ["booster display", "booster box"]),
    ("booster_pack",    ["booster pack", "booster"]),
    ("vault_bundle",    ["vault", "bundle"]),
    ("showdown_deck",   ["showdown"]),
    ("starter",         ["starter", "deck box", "precon"]),
]


def get(path):
    req = urllib.request.Request(f"{BASE}{path}", headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as r:
        body = r.read().decode("utf-8")
    time.sleep(SLEEP)
    return body


def load_state():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"last_built_at": None}


def arg_value(flag):
    """Read `--flag value`. Returns None if absent, "" if present but empty."""
    if flag not in sys.argv:
        return None
    i = sys.argv.index(flag)
    return sys.argv[i + 1].strip() if i + 1 < len(sys.argv) else ""


def parse_ts(s):
    """
    Parse a timestamp from either of the two shapes this script sees, without
    depending on the Python version: tcgcsv writes '2026-08-08T20:05:59+0000',
    psql renders the same instant back as '2026-08-08 20:05:59+00'. Those two
    strings are never equal, so the old string comparison would have re-ingested
    every single scheduled run once state moved into the database.

    Returns None if the string isn't a timestamp at all; callers fall back to
    exact string comparison rather than treating "unparseable" as "newer".
    """
    if not s:
        return None
    t = s.strip().replace(" ", "T")
    t = re.sub(r"(?i)z$", "+00:00", t)
    m = re.search(r"([+-]\d{2})(:?)(\d{2})?$", t)
    if m:                                   # +0000 / +00 / +00:00 -> +00:00
        t = t[:m.start()] + f"{m.group(1)}:{m.group(3) or '00'}"
    try:
        return datetime.fromisoformat(t)
    except ValueError:
        return None


def already_ingested(built_at, last_built_at):
    """True when tcgcsv's current build is not newer than our last successful run."""
    if not last_built_at:
        return False
    now, then = parse_ts(built_at), parse_ts(last_built_at)
    if now is None or then is None:
        return built_at.strip() == last_built_at.strip()
    return now <= then


def ext(product, key):
    for d in product.get("extendedData") or []:
        if d.get("name") == key:
            return d.get("value")
    return None


def classify_sealed(name):
    low = name.lower()
    for kind, needles in SEALED_PATTERNS:
        if any(n in low for n in needles):
            return kind
    return "other"


def to_printing_code(abbrev, number):
    """
    Build our printing_code from TCGplayer's collector number.

    Ours is the Riftcodex verbatim all-hyphen lowercase form, chosen by Core on
    2026-08-05: ven-142-166, ven-019a-166, ven-r03a, unl-231*-219.

    TCGplayer's Number field format is NOT verified against Riftbound data, only
    against the Pokemon example in tcgcsv's docs ("139/195"). This function is
    therefore BEST-EFFORT BY DESIGN: an unresolvable number returns None and the
    product is still recorded with a null printing_code rather than dropped.
    Match rate is reported every run; a sudden fall means the format changed.
    """
    if not number:
        return None
    n = number.strip().lower()
    a = abbrev.strip().lower()
    if "/" in n:
        num, total = n.split("/", 1)
        return f"{a}-{num.strip()}-{total.strip()}"
    if n.startswith("r") or n.startswith("t"):     # runes and tokens carry no total
        return f"{a}-{n}"
    return None


def q(v):
    if v is None:
        return "null"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def main():
    force = "--force" in sys.argv
    dry = "--dry-run" in sys.argv
    cli_last = arg_value("--last-built-at")
    state_from_db = cli_last is not None
    last_built_at = cli_last if state_from_db else load_state()["last_built_at"]

    built_at = get("/last-updated.txt").strip()
    print(f"tcgcsv last built : {built_at}")
    print(f"our last ingest   : {last_built_at or 'never'}"
          f"  ({'price_ingest_runs' if state_from_db else STATE_FILE})")
    if not force and already_ingested(built_at, last_built_at):
        print("\nAlready ingested this build. Nothing to do.")
        print("tcgcsv rebuilds once daily at 20:00 UTC; polling more often gains nothing.")
        return 0

    groups = json.loads(get(f"/tcgplayer/{CATEGORY}/groups"))["results"]
    print(f"groups discovered : {len(groups)}")

    # observed_on comes from tcgcsv's BUILD TIMESTAMP, not from local date.
    # Two reasons. First, the build timestamp is the actual vintage of the data;
    # local date is just when we happened to fetch it. Second, date.today() is
    # Pacific on Ashwin's machine while Postgres evaluates current_date in UTC,
    # so after 17:00 Pacific the two disagree and every query filtering on
    # current_date silently returns nothing. That bug shipped on 2026-08-06.
    observed_on = built_at[:10]
    print(f"observed_on       : {observed_on}  (from tcgcsv build, UTC)")
    rows_in = kept = matched = unmatched = 0
    sub_tally = collections.Counter()
    products, observations = {}, []

    for g in groups:
        gid, abbrev = g["groupId"], g["abbreviation"]
        try:
            prods = json.loads(get(f"/tcgplayer/{CATEGORY}/{gid}/products"))["results"]
            prices = json.loads(get(f"/tcgplayer/{CATEGORY}/{gid}/prices"))["results"]
        except urllib.error.HTTPError as e:
            print(f"  {abbrev:<5} FAILED {e.code}")
            continue

        by_id = {p["productId"]: p for p in prods}
        for pr in prices:
            rows_in += 1
            sub = pr.get("subTypeName") or "Normal"
            sub_tally[sub] += 1
            prod = by_id.get(pr["productId"])
            if prod is None:
                continue
            kept += 1

            number = ext(prod, "Number")
            rarity = ext(prod, "Rarity")
            is_single = bool(number or rarity)
            pcode = to_printing_code(abbrev, number) if is_single else None
            if is_single:
                matched += bool(pcode)
                unmatched += (not pcode)

            key = (pr["productId"], sub)
            products[key] = {
                "kind": "single" if is_single else "sealed",
                "printing_code": pcode,
                "sealed_kind": None if is_single else classify_sealed(prod["name"]),
                "set_code": abbrev if is_single else None,
                "collector_number": number,
                "tcg_id": pr["productId"],
                "sub": sub,
                "name": prod["name"],
                "url": prod.get("url"),
                "rarity": rarity,
                "card_type": ext(prod, "Card Type"),
                "domain": ext(prod, "Domain"),
            }
            observations.append((key, pr))
        print(f"  {abbrev:<5} products {len(prods):>4}  prices {len(prices):>4}")

    print()
    print(f"rows seen         : {rows_in}")
    print(f"kept (all subtypes): {kept}")
    print(f"subtypes captured : {dict(sub_tally)}")
    print(f"code constructible: {matched}")
    print(f"not constructible : {unmatched}"
          f"  ({100*unmatched/max(matched+unmatched,1):.1f}% of singles)")
    print()
    print("NOTE: 'constructible' means the script could build a printing_code string from")
    print("TCGplayer's collector number. It does NOT mean that printing exists in our")
    print("card_printings table. Promo groups (OPP, PR, JDG, SGN, RWB) are not in our card")
    print("data at all, so their products load with a null printing_code by design.")
    print("Run the coverage query after loading to see how many actually resolved.")

    if dry:
        print("\nDry run, nothing written.")
        return 0

    out = Path(f"price_ingest_{observed_on}.sql")
    with out.open("w") as f:
        w = f.write
        w(f"-- RiftAcademy price ingest for {observed_on}\n")
        w(f"-- tcgcsv build: {built_at}\n")
        # Report the tally rather than restating the policy. The line this replaced read
        # "Foil rows discarded at source", which was true for about an hour on 2026-08-06
        # and false in every file generated afterwards. A header that reports what the run
        # actually did cannot go stale the way a hardcoded claim about intent does.
        w(f"-- Subtypes captured: {json.dumps(dict(sub_tally), sort_keys=True)}. Every subtype\n")
        w("-- is ingested; migration 011 records why the foil exclusion was reversed.\n")
        w("-- Idempotent: re-running the same day overwrites rather than duplicating.\n\n")
        w("begin;\n\n")

        for key, p in products.items():
            # printing_code is resolved through a subquery rather than inserted directly.
            # The script can construct a code string, but only the database knows whether
            # that printing exists. Promo groups (OPP, PR, JDG, SGN, RWB) have no rows in
            # card_printings at all, so a direct insert would violate the foreign key and
            # abort the whole transaction. This yields NULL for anything unknown, which is
            # what the column comment specifies: record the product, surface the gap.
            pc = ("(select printing_code from card_printings where printing_code = "
                  f"{q(p['printing_code'])})") if p["printing_code"] else "null"
            w("insert into priceable_products (product_kind,printing_code,sealed_kind,"
              "set_code,collector_number,tcgplayer_product_id,tcgplayer_sub_type,"
              "tcgplayer_name,tcgplayer_url,rarity,card_type,domain) select "
              f"{q(p['kind'])},{pc},{q(p['sealed_kind'])},"
              f"{q(p['set_code'])},{q(p['collector_number'])},{p['tcg_id']},{q(p['sub'])},"
              f"{q(p['name'])},{q(p['url'])},{q(p['rarity'])},{q(p['card_type'])},"
              f"{q(p['domain'])} on conflict (tcgplayer_product_id, tcgplayer_sub_type) "
              "do nothing;\n")
        w("\n")

        for key, pr in observations:
            w("insert into price_observations (product_id,source_id,observed_on,"
              "market,low,mid,high,direct_low) select product_id,'tcgplayer',"
              f"date '{observed_on}',{q(pr.get('marketPrice'))},{q(pr.get('lowPrice'))},"
              f"{q(pr.get('midPrice'))},{q(pr.get('highPrice'))},"
              f"{q(pr.get('directLowPrice'))} from priceable_products where "
              f"tcgplayer_product_id={key[0]} and tcgplayer_sub_type={q(key[1])} "
              "on conflict (product_id,source_id,observed_on) do update set "
              "market=excluded.market, low=excluded.low, mid=excluded.mid, "
              "high=excluded.high, direct_low=excluded.direct_low;\n")
        w("\n")

        w("insert into price_ingest_runs (source_id,source_built_at,groups_seen,rows_in,"
          "rows_kept,rows_skipped_foil,printings_matched,printings_unmatched,"
          "observations_written,status,notes) values ('tcgplayer',"
          f"timestamptz {q(built_at)},{len(groups)},{rows_in},{kept},0,"
          f"{matched},{unmatched},{len(observations)},'ok',"
          f"{q('subtypes: ' + json.dumps(dict(sub_tally), sort_keys=True))});\n\n")
        w("commit;\n")

    # Only manual runs keep a local high-water mark. On a CI run the state lives in
    # price_ingest_runs, and the row that records THIS run is written by the SQL above
    # - so it must not be advanced here, before that SQL has actually been applied.
    # Writing it here on CI would mark the build ingested even if psql then failed.
    if not state_from_db:
        STATE_FILE.write_text(json.dumps({"last_built_at": built_at}))
    print(f"\nwritten: {out}")
    print(f'run with: psql "$RA_DB" -f {out}')
    return 0


if __name__ == "__main__":
    sys.exit(main())
