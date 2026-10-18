# Evidence

Everything here can be checked against the chain without trusting this repository.

| File | What it is | How to verify it |
|---|---|---|
| `live-run.jsonl` | every write of the live run, one JSON line each: label, transaction hash, status, votes, returned value | look up each hash on the explorer |
| `transactions.md` | the same transactions plus the deployment, decoded from `eth_getTransactionByHash`: method, arguments, status, votes, returned value | `python3 scripts/tx_table.py` and compare |
| `readbacks.md` | the ledger, policies, pool and accounting read back with `gen_call` | `python3 scripts/readback.py` (current state) |

## Deployed source

The deploy transaction stores the code it deployed. `transactions.md` prints its SHA-256,
`a25294e70814b942de7a2d8422574d567055be6628c160fd0933194fcb1cd55a`, the same bytes as
`contracts/blackout_book.py` at commit `a896ddd`:

```bash
git show a896ddd:contracts/blackout_book.py | sha256sum
```

`contracts/blackout_book.py` is generated from `contracts/src/blackout_book.py` by `scripts/bundle.py`,
which inlines `lib/outage_signal.py` and `lib/news_evidence.py`; `python3 scripts/bundle.py --check`
confirms they are in step.

## What the evidence shows

- All 24 transactions are FINALIZED with three validators agreeing and none disagreeing.
- Bangladesh, week of 15 July 2024: three lost days (Friday to Sunday, local time) ruled
  GOVERNMENT_ORDERED; the policy paid 3 GEN to a separate beneficiary address, pushed by `withdraw_to`.
- Ghana, week of 11 March 2024: four lost days ruled NON_GOVERNMENT_CAUSE (subsea cable cuts); the
  policy expired and its premium stayed in the pool.
- Bangladesh, week of 1 July 2024: no lost day, NO_SHUTDOWN_SIGNAL without a model call.
- The stored dark hours per day equal what `tests/test_signal_evidence.py` computes from the IODA
  answers recorded in `tests/fixtures/`, so the on-chain measurement is reproducible offline.
- `get_accounting` reports `conserved: true` after the run.

All transactions were signed by the maintainer's testnet account
`0xE258D2604AEC1321ddD58f179001cc6A8c442930`, except policy p4, bought from the website with its
built-in test wallet.

## Limits of the network

- Studio Next is a hosted preview network and can be reset; the hashes would then stop resolving.
- Contract reads (`gen_call`) are rate-limited to about 20 per 10 seconds per contract. The website
  caches one read of the whole book and falls back to a labelled snapshot (`apps/web/data/snapshot.json`)
  when reads fail.
- A contract read is only as honest as the RPC node answering it; these used the public endpoint
  `https://studio-dev.genlayer.com/api`.
