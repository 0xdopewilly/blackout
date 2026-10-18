"""Decode every transaction in docs/evidence/live-run.jsonl from the chain.

Writes docs/evidence/transactions.md (method, arguments, status, validator votes, decoded return
value, all from eth_getTransactionByHash) and apps/web/data/txs.json, which maps each
entity|week_start to the transactions that touched it, for the website.

    python3 scripts/tx_table.py
"""

import base64
import hashlib
import json
import pathlib
import sys
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "lib"))

from genlayer_read import decode  # noqa: E402

RPC = "https://studio-dev.genlayer.com/api"
EXPLORER = "https://explorer-studio-dev.genlayer.com"
CONTRACT = "0x06366C26dD74463B343170ABA47f0dc27c223a6A"
WEEK_METHODS = ("open_replay", "buy_cover", "observe", "settle")


def rpc(method: str, params: list):
    for attempt in range(4):
        try:
            request = urllib.request.Request(RPC, data=json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode(),
                                             headers={"Content-Type": "application/json", "User-Agent": "blackout-evidence"})
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.loads(response.read())["result"]
        except Exception:
            time.sleep(2 + 3 * attempt)
    raise RuntimeError("rpc failed: " + method)


def framed(b64: str):
    raw = base64.b64decode(b64 or "")
    if not raw:
        return None
    if raw[0] == 0:
        try:
            return decode(raw[1:])
        except Exception:
            return None
    return {"error": raw[1:].decode("utf-8", "replace")}


def plain(value):
    if isinstance(value, dict):
        return {str(k): plain(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [plain(v) for v in value]
    if isinstance(value, bytes):
        return "0x" + value.hex()
    return value


def short(value, limit=60) -> str:
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    text = text.replace("|", "/").replace("\n", " ")
    return text if len(text) <= limit else text[: limit - 1] + "…"


def main() -> int:
    lines = [json.loads(line) for line in (ROOT / "docs/evidence/live-run.jsonl").read_text().splitlines() if line.strip()]
    deploy = "0x4128ffdc31a7643668e53fb9dc09ee9e24ffecddb0d324efc176bc92d42128a4"
    rows, weeks, flat = [], {}, []
    for item in [{"label": "deploy BlackoutBook (demo mode, 14-day LP notice)", "hash": deploy}] + lines:
        tx = rpc("eth_getTransactionByHash", [item["hash"]])
        time.sleep(0.3)
        data = tx.get("data") if isinstance(tx.get("data"), dict) else {}
        message = decode(base64.b64decode(data["calldata"])) if data.get("calldata") else {}
        method = message.get("", "(deploy)") if isinstance(message, dict) else "(deploy)"
        args = plain(message.get("args", [])) if isinstance(message, dict) else []
        if method == "(deploy)" and data.get("contract_code"):
            args = ["source SHA-256 " + hashlib.sha256(base64.b64decode(data["contract_code"])).hexdigest()]
        cons = tx.get("consensus_data") or {}
        leader = cons.get("leader_receipt")
        leader = leader[0] if isinstance(leader, list) and leader else (leader or {})
        returned = plain(framed(leader.get("result", "")))
        votes = list((cons.get("votes") or {}).values())
        value = int(data.get("value") or tx.get("value") or 0) if str(data.get("value") or tx.get("value") or "0").isdigit() else 0
        rows.append((str(tx.get("created_at", ""))[:19].replace("T", " "), item["label"], method, ", ".join(short(a, 44) for a in args),
                     tx.get("status"), short(returned, 90), f"{votes.count('agree')} agree, {votes.count('disagree')} disagree", item["hash"]))
        flat.append({"label": item["label"], "hash": item["hash"]})
        if method in WEEK_METHODS and len(args) >= 2:
            weeks.setdefault(f"{args[0]}|{int(args[1])}", []).append({"label": item["label"], "hash": item["hash"]})
    out = ["# Transactions, decoded from the chain", "",
           f"Every transaction of the live run on Studio Next, contract [`{CONTRACT}`]({EXPLORER}/address/{CONTRACT}), decoded from",
           "`eth_getTransactionByHash`: the method and arguments from the calldata, the status, the validators' votes and the",
           "leader's returned value. Rebuild with `python3 scripts/tx_table.py`.", "",
           "| Created (UTC) | Step | Call | Arguments | Status | Returned | Votes | Transaction |", "|---|---|---|---|---|---|---|---|"]
    for t, label, method, args, status, ret, votes, h in rows:
        out.append(f"| {t} | {label} | `{method}` | {args} | {status} | {ret} | {votes} | [{h[:10]}…]({EXPLORER}/tx/{h}) |")
    (ROOT / "docs/evidence/transactions.md").write_text("\n".join(out) + "\n")
    (ROOT / "apps/web/data/txs.json").write_text(json.dumps({"contract": CONTRACT, "weeks": weeks, "all": flat}, indent=1) + "\n")
    print(len(rows), "transactions;", len(weeks), "weeks indexed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
