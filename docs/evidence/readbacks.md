# Contract readbacks

Read 2026-10-18 06:11:12 UTC with `gen_call` from `0x06366C26dD74463B343170ABA47f0dc27c223a6A` through `https://studio-dev.genlayer.com/api`.
Rebuild with `python3 scripts/readback.py`.

## get_accounting

```json
{
 "active_cover": "5000000000000000000",
 "balance": "57660000000000000000",
 "claimable_total": "0",
 "conserved": true,
 "pool": "57660000000000000000",
 "reserved": "5000000000000000000",
 "share_sum": "60000000000000000000",
 "total_shares": "60000000000000000000"
}
```

`conserved` is the contract's own check: balance == pool + claimable_total, the reserve equals the cover of every
active policy and fits in the pool, and LP shares add up.

## list_ledger

| Country | Week start | Verdict | Lost days | Mask | Dark hours per local day | Headlines | Attempts | Final |
|---|---|---|---|---|---|---|---|---|
| Bangladesh | 2024-07-22 | GOVERNMENT_ORDERED | 3 | 7 | [24, 24, 12, 0, 0, 0, 0] | 25 | 1 | True |
| Bangladesh | 2024-07-01 | NO_SHUTDOWN_SIGNAL | 0 | 0 | [0, 0, 0, 0, 0, 0, 0] | 0 | 1 | True |
| Ghana | 2024-03-11 | NON_GOVERNMENT_CAUSE | 4 | 120 | [0, 0, 0, 13, 24, 24, 24] | 15 | 1 | True |
| Bangladesh | 2024-07-15 | GOVERNMENT_ORDERED | 3 | 112 | [0, 0, 0, 3, 24, 24, 24] | 25 | 1 | True |

## list_policies

| Policy | Country | Week start | Beneficiary | Premium | Status | Paid | Replay |
|---|---|---|---|---|---|---|---|
| p1 | country/BD | 2024-07-15 | `0x8fb5c97a1a90675caec56a12e1f20cebf7b68be7` | 0.2 GEN | PAID | 3 GEN | True |
| p2 | country/GH | 2024-03-11 | `0xe258d2604aec1321ddd58f179001cc6a8c442930` | 0.2 GEN | EXPIRED | 0 GEN | True |
| p3 | country/BD | 2026-10-26 | `0xe258d2604aec1321ddd58f179001cc6a8c442930` | 0.26 GEN | ACTIVE | 0 GEN | False |

## get_pool

```json
{
 "free": "52660000000000000000",
 "lps": 1,
 "observations": 4,
 "policies": 3,
 "pool": "57660000000000000000",
 "reserved": "5000000000000000000",
 "share_price_wei_e18": "961000000000000000",
 "total_shares": "60000000000000000000"
}
```
