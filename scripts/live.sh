#!/usr/bin/env bash
# One logged transaction: scripts/live.sh <label> <method> [--value GEN] [args...]
# Appends {"label", ...tx.mjs JSON} to docs/evidence/live-run.jsonl and prints it.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${BLACKOUT:?set BLACKOUT to the contract address}"
label="$1"; shift
out=$(node scripts/tx.mjs write "$BLACKOUT" "$@" 2>&1 | grep '^{' | tail -1)
line=$(printf '%s' "$out" | python3 -I -c 'import json,sys; d=json.loads(sys.stdin.read()); d={"label": sys.argv[1], **d}; print(json.dumps(d))' "$label")
printf '%s\n' "$line" >> docs/evidence/live-run.jsonl
printf '%s\n' "$line" | cut -c1-400
