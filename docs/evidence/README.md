# Evidence

Everything here can be checked against the chain without trusting this repository. The live
deployment is version 2 (`0xb89e2dB363CEC3827a9a7dbBd0CCCe7E75Da538a`); version 1's files carry a
`v1-` prefix.

| File | What it is | How to verify it |
|---|---|---|
| `live-run.jsonl` | every write of the v2 live run, one JSON line each: label, transaction hash, status, votes, returned value | look up each hash on the explorer |
| `transactions.md` | the same transactions plus the deployment, decoded from `eth_getTransactionByHash`: method, arguments, status, votes, returned value | `python3 scripts/tx_table.py` and compare |
| `readbacks.md` | the ledger, policies, pool and accounting read back with `gen_call` | `python3 scripts/readback.py` (current state) |
| `v1-live-run.jsonl`, `v1-transactions.md`, `v1-readbacks.md` | the same run on version 1 (`0x06366C26…3a6A`) | the v1 hashes resolve on the explorer |

## Deployed source

The deploy transaction stores the code it deployed. `transactions.md` prints its SHA-256,
`2881ece3967389bc603ee330671d90d7025171f742da5b4c05193078bdf2a7c1`, the same bytes as
`contracts/blackout_book.py` at commit `d07b888`:

```bash
git show d07b888:contracts/blackout_book.py | sha256sum
```

`contracts/blackout_book.py` is generated from `contracts/src/blackout_book.py` by `scripts/bundle.py`,
which inlines `lib/outage_signal.py` and `lib/news_evidence.py`; `python3 scripts/bundle.py --check`
confirms they are in step.

## What the evidence shows

- All 23 transactions (the deployment and 22 writes) are FINALIZED with three validators agreeing
  and none disagreeing. Under v2 that agreement means each validator reproduced the leader's
  measurement and attribution class exactly.
- Bangladesh, week of 15 July 2024: three lost days (Friday to Sunday, local time) ruled
  GOVERNMENT_ORDERED; the policy paid 3 GEN to a separate beneficiary address, pushed by `withdraw_to`.
- Bangladesh, week of 22 July 2024: three more lost days (Monday to Wednesday), GOVERNMENT_ORDERED.
- Ghana, week of 11 March 2024: four lost days ruled NON_GOVERNMENT_CAUSE (subsea cable cuts); the
  policy expired and its premium stayed in the pool.
- Bangladesh, week of 1 July 2024: no lost day, NO_SHUTDOWN_SIGNAL without a model call.
- A purchase for a week that had already started was refused and refunded; live cover for the week
  of 26 October 2026 was bought at 0.26 GEN, the base premium raised 30% by six recorded
  government-ordered lost days.
- The stored masks and dark hours per day equal what `tests/test_signal_evidence.py` computes from the
  IODA answers recorded in `tests/fixtures/`, so the on-chain measurement is reproducible offline.
- Each stored observation has exactly four fields (mask, lost days, dark hours, class); nothing the
  leader alone read is persisted.
- `get_accounting` reports `conserved: true` after the run.

The 22 logged writes were signed by the maintainer's testnet account
`0xE258D2604AEC1321ddD58f179001cc6A8c442930`.

## Limits of the network

- Studio Next is a hosted preview network and can be reset; the hashes would then stop resolving.
- Contract reads (`gen_call`) are rate-limited to about 20 per 10 seconds per contract. The website
  caches one read of the whole book and falls back to a labelled snapshot (`apps/web/data/snapshot.json`)
  when reads fail.
- A contract read is only as honest as the RPC node answering it; these used the public endpoint
  `https://studio-dev.genlayer.com/api`.
