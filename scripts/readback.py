"""Read the live contract back with gen_call (standard library only).

Writes docs/evidence/readbacks.md and apps/web/data/snapshot.json, the website's labelled
fallback for when contract reads are unavailable.

    python3 scripts/readback.py
"""

import json
import pathlib
import sys
import time
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "lib"))

import genlayer_read  # noqa: E402

RPC = "https://studio-dev.genlayer.com/api"
CONTRACT = "0xb89e2dB363CEC3827a9a7dbBd0CCCe7E75Da538a"  # v2 (v1: 0x06366C26dD74463B343170ABA47f0dc27c223a6A)


def view(method: str, *args):
    for attempt in range(4):
        time.sleep(1.0 + 2.5 * attempt)  # Studio Next rate-limits gen_call
        try:
            raw = genlayer_read.read_view(RPC, CONTRACT, method, list(args))
            return json.loads(raw) if isinstance(raw, str) and raw[:1] in "{[" else raw
        except genlayer_read.ReadError:
            if attempt == 3:
                raise


def main() -> int:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    book = {
        "contract": CONTRACT, "as_of": now, "config": view("get_config"), "terms": view("list_terms"),
        "ledger": view("list_ledger"), "pool": view("get_pool"), "policies": view("list_policies", 0, 100)["items"],
        "accounting": view("get_accounting"),
    }
    (ROOT / "apps/web/data/snapshot.json").write_text(json.dumps(book, indent=1) + "\n")
    gen = lambda wei: f"{int(wei) / 1e18:g}"
    out = ["# Contract readbacks", "", f"Read {now.replace('T', ' ').replace('Z', ' UTC')} with `gen_call` from `{CONTRACT}` through `{RPC}`.",
           "Rebuild with `python3 scripts/readback.py`.", "", "## get_accounting", "", "```json", json.dumps(book["accounting"], indent=1), "```", "",
           "`conserved` is the contract's own check: balance == pool + claimable_total, the reserve equals the cover of every",
           "active policy and fits in the pool, and LP shares add up.", "", "## list_ledger", "",
           "| Country | Week start | Verdict | Lost days | Mask | Dark hours per local day | Attempts | Final |", "|---|---|---|---|---|---|---|---|"]
    for o in book["ledger"]:
        week = datetime.fromtimestamp(o["week_start"], timezone.utc).strftime("%Y-%m-%d")
        out.append(f"| {o['country']} | {week} | {o['cls']} | {o['lost']} | {o['mask']} | {o['dark_h']} | {o['attempts']} | {o['final']} |")
    out += ["", "## list_policies", "", "| Policy | Country | Week start | Beneficiary | Premium | Status | Paid | Replay |", "|---|---|---|---|---|---|---|---|"]
    for p in book["policies"]:
        week = datetime.fromtimestamp(p["week_start"], timezone.utc).strftime("%Y-%m-%d")
        out.append(f"| {p['pid']} | {p['entity']} | {week} | `{p['beneficiary']}` | {gen(p['premium'])} GEN | {p['status']} | {gen(p['paid'])} GEN | {p['replay']} |")
    out += ["", "## get_pool", "", "```json", json.dumps(book["pool"], indent=1), "```", ""]
    (ROOT / "docs/evidence/readbacks.md").write_text("\n".join(out))
    print("ledger", len(book["ledger"]), "policies", len(book["policies"]), "conserved", book["accounting"]["conserved"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
