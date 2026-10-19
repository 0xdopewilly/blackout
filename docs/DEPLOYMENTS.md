# Deployments

## Version 2 (live): GenLayer Studio Next (chain 61997)

Version 2 tightens consensus before review: every validator must reproduce the leader's attribution
class exactly, `UNATTRIBUTED` included, and an observation stores only the fields every validator
reproduced. See [CONSENSUS.md](CONSENSUS.md).

| | |
|---|---|
| Contract | [`0xb89e2dB363CEC3827a9a7dbBd0CCCe7E75Da538a`](https://explorer-studio-dev.genlayer.com/address/0xb89e2dB363CEC3827a9a7dbBd0CCCe7E75Da538a) |
| Deploy transaction | [`0xba96b6b5…`](https://explorer-studio-dev.genlayer.com/tx/0xba96b6b52880af2c4259ecb257de46fa786749c68aa1a775deb13791f22c0f5d) |
| Source | `contracts/blackout_book.py` at commit `d07b888`, SHA-256 `2881ece3967389bc603ee330671d90d7025171f742da5b4c05193078bdf2a7c1` |
| Runner | `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng` |
| Constructor | `demo_mode = true`, `withdraw_notice_s = 1209600` (14 days) |
| Owner | `0xe258d2604aec1321ddd58f179001cc6a8c442930` (testnet account) |
| Website | https://blackout-cover.vercel.app |

Countries on offer: Bangladesh, Ghana, Pakistan, Iran, Iraq, Ethiopia and Myanmar, each 1 GEN per
lost day for up to 5 days a week. The v1 run's steps were replayed on v2; every transaction is in
[evidence/transactions.md](evidence/transactions.md), decoded from the chain.

## Version 1 (history)

| | |
|---|---|
| Contract | [`0x06366C26dD74463B343170ABA47f0dc27c223a6A`](https://explorer-studio-dev.genlayer.com/address/0x06366C26dD74463B343170ABA47f0dc27c223a6A) |
| Deploy transaction | [`0x4128ffdc…`](https://explorer-studio-dev.genlayer.com/tx/0x4128ffdc31a7643668e53fb9dc09ee9e24ffecddb0d324efc176bc92d42128a4) (FINALIZED) |
| Source | `contracts/blackout_book.py` at commit `a896ddd`, SHA-256 `a25294e70814b942de7a2d8422574d567055be6628c160fd0933194fcb1cd55a` |

Its run is in [evidence/v1-live-run.jsonl](evidence/v1-live-run.jsonl),
[evidence/v1-transactions.md](evidence/v1-transactions.md) and
[evidence/v1-readbacks.md](evidence/v1-readbacks.md). It stays deployed with its history.

Studio Next is a preview network and can be reset. Redeploy with
`scripts/glw deploy contracts/blackout_book.py true 1209600` and replay the run with `scripts/live.sh`.
