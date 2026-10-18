# Deployments

## GenLayer Studio Next (chain 61997)

| | |
|---|---|
| Contract | [`0x06366C26dD74463B343170ABA47f0dc27c223a6A`](https://explorer-studio-dev.genlayer.com/address/0x06366C26dD74463B343170ABA47f0dc27c223a6A) |
| Deploy transaction | [`0x4128ffdc…`](https://explorer-studio-dev.genlayer.com/tx/0x4128ffdc31a7643668e53fb9dc09ee9e24ffecddb0d324efc176bc92d42128a4) (FINALIZED) |
| Source | `contracts/blackout_book.py` at commit `a896ddd`, SHA-256 `a25294e70814b942de7a2d8422574d567055be6628c160fd0933194fcb1cd55a` |
| Runner | `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng` |
| Constructor | `demo_mode = true`, `withdraw_notice_s = 1209600` (14 days) |
| Owner | `0xe258d2604aec1321ddd58f179001cc6a8c442930` (testnet account) |
| Website | https://blackout-cover.vercel.app |

Countries on offer: Bangladesh, Ghana, Pakistan, Iran, Iraq, Ethiopia and Myanmar, each 1 GEN per
lost day for up to 5 days a week. Every transaction of the live run is in
[evidence/transactions.md](evidence/transactions.md).

Studio Next is a preview network and can be reset. Redeploy with
`scripts/glw deploy contracts/blackout_book.py true 1209600` and replay the run with `scripts/live.sh`.
