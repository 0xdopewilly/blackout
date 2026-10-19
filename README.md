# BLACKOUT

**Cover that pays out when a government cuts the internet.** GenLayer validators measure the outage
from IODA's internet signals and read the week's reporting to decide what no single party can be
trusted to rule on: did the authorities order it? Government-ordered lost days pay automatically,
to anyone the buyer chose. Nobody files a claim.

- Website: https://blackout-cover.vercel.app
- Contract on GenLayer Studio Next (chain 61997): [`0x06366C26dD74463B343170ABA47f0dc27c223a6A`](https://explorer-studio-dev.genlayer.com/address/0x06366C26dD74463B343170ABA47f0dc27c223a6A)
- Evidence: [docs/evidence/](docs/evidence/README.md), every transaction decoded from the chain

## The problem

Governments order hundreds of internet shutdowns a year. In July 2024 Bangladesh cut a country of
170 million off for days and froze the income of one of the world's largest freelancer workforces.
No insurer covers this: political risk is excluded, and a claim cannot be verified by anyone the
government that caused it does not control.

## What happens

1. **Buy cover** for a country and a week, at least 72 hours ahead. Choose who gets paid: yourself,
   or family abroad who can still transact while you are cut off.
2. **After the week, anyone calls `observe`.** Every validator:
   - fetches the same historical IODA window and computes, in integer arithmetic, which local days
     had at least six hours below half of normal connectivity. All of them must get the identical
     result;
   - if connectivity collapsed, fetches that week's headlines, keeps only those from about 95
     allowlisted outlets, and asks its own model: was this ordered by the authorities?
3. **Anyone calls `settle`.** A government-ordered week pays the daily amount per lost day to every
   policy's beneficiary. A cable cut, a power failure or a quiet week pays nothing, and the premium
   stays with the liquidity providers who funded the pool.

## Why it needs GenLayer

- **A threshold oracle pays the wrong people.** Ghana's March 2024 subsea cable cuts and
  Bangladesh's July 2024 shutdown look almost the same in the data (four and three lost days). Only
  a judgment over the reporting separates them. BLACKOUT's live run decided both, correctly.
- **A single trusted oracle can be leaned on.** The party being judged is often a government that
  denies it. Independent validators, each fetching and judging for itself, are the neutral arbiter.
- **Money moves on the verdict:** premiums, reserves and payouts are all contract state.

## Live on Studio Next

Deployed from [`contracts/blackout_book.py`](contracts/blackout_book.py) at commit `a896ddd`. The
deploy transaction stores code with SHA-256 `a25294e70814b942de7a2d8422574d567055be6628c160fd0933194fcb1cd55a`,
equal to `git show a896ddd:contracts/blackout_book.py | sha256sum`.

| Week | Verdict | Lost days | What happened | Transaction |
|---|---|---|---|---|
| Bangladesh, 15–21 Jul 2024 | `GOVERNMENT_ORDERED` | 3 (Fri–Sun) | the replay policy paid 3 GEN to a beneficiary abroad, pushed to their wallet by a keeper | [observe](https://explorer-studio-dev.genlayer.com/tx/0x9c34d8f20a6cc97f52664245686109d107d27f34e2608d4c1f49a0e38a832959) · [settle](https://explorer-studio-dev.genlayer.com/tx/0xa3ee5104c206ee00ac65519f629a666b8c9b6b5d9e14ec6cf68072fc24d97ac2) |
| Bangladesh, 22–28 Jul 2024 | `GOVERNMENT_ORDERED` | 3 (Mon–Wed) | the shutdown's second week | [observe](https://explorer-studio-dev.genlayer.com/tx/0x65f41367ba95fb8d4d63d065f806545e0c54fbaffbb1ad8ebec62ebb52d2a226) |
| Ghana, 11–17 Mar 2024 | `NON_GOVERNMENT_CAUSE` | 4 (Thu–Sun) | subsea cable cuts: the policy expired, nothing paid | [observe](https://explorer-studio-dev.genlayer.com/tx/0x83b3d35538cc6945d5f19075876fb7972e4c919e3fd33e1ca15c889bd63ae6c9) · [settle](https://explorer-studio-dev.genlayer.com/tx/0x8a0c5310d398ea383d999142e1d283491e6151cef326c00d9cc345e617d746f7) |
| Bangladesh, 1–7 Jul 2024 | `NO_SHUTDOWN_SIGNAL` | 0 | decided by measurement alone, no news fetched, no model asked | [observe](https://explorer-studio-dev.genlayer.com/tx/0x0230c88bea0ac77a394aa2f71341e064a57e123b152b1985eef69c31ab1f47d7) |

Every observation was accepted with three validators agreeing, the first in 24 seconds from submission. The stored dark
hours per day are identical to the ones the tests compute from recorded IODA answers. The run also
shows the purchase rules live: a purchase for a week starting in under 72 hours refused and refunded,
an underpaid one refused once Bangladesh's recorded shutdown days raised its premium by 30%, and live
cover for the week of 26 Oct 2026. Past weeks are marked *Replay*: the demo deployment's owner opened
them so the full flow can run on real events; live weeks follow every rule.

## Consensus design

- **Measurement, exact.** [`lib/outage_signal.py`](lib/outage_signal.py): IODA BGP and active-probing
  series, baseline = upper quartile of the seven days before the local week (robust the week after a
  long shutdown), dark = below 50% of baseline, lost day = six or more dark hours in the darker
  series. No floats, no clocks; validators must reproduce the leader's mask bit for bit. Six hours
  excludes Iraq's scheduled one-to-two-hour exam cuts.
- **Attribution, exact.** [`lib/news_evidence.py`](lib/news_evidence.py): one of
  `GOVERNMENT_ORDERED`, `NON_GOVERNMENT_CAUSE`, `UNATTRIBUTED`. Every validator fetches the news and
  asks its own model, and must reach exactly the leader's class. No class is a safe harbour,
  `UNATTRIBUTED` included: each has its own outcome (a payout, a final no, another look later), so a
  leader can neither invent a payout, bury a government-ordered shutdown, nor defer one a validator
  can decide. A validator whose model gives no usable answer confirms nothing. `UNATTRIBUTED` is
  observed again after six hours, up to three times.
- **Only reproduced data is stored.** An observation is exactly the lost-day mask, the lost days, the
  dark hours per day and the class, all of which every validator reproduced; any extra field is
  refused. No leader headline, note or count is persisted. The website shows the week's headlines
  from its own fetch with the same query and allowlist, labelled as such.
- **No signal, no model.** A week with zero lost days is `NO_SHUTDOWN_SIGNAL` without any news fetch
  or model call, so headlines alone can never pay a policy.
- **Injection.** The news query is built from on-chain terms; no caller text reaches the prompt.
  Only allowlisted outlets' headlines are kept (checked in code), stripped of invisible and control
  characters and of anything that could pose as prompt structure, capped and fenced. The answer is a
  three-way enum. A validator that cannot read the news reproduces only `UNATTRIBUTED`.

## Economics and rules

Native GEN. Liquidity providers fund the pool and earn every premium. Each active policy reserves
its maximum payout, which no withdrawal can touch, and LP withdrawals wait 14 days. One country-week
can take at most 20% of the pool and all cover at most 80%; five policies per wallet per week. The
weekly premium is `daily × rate_bps / 10 000`, plus 5% per recorded government-ordered lost day for
that country (up to double). `get_accounting` checks the invariants on chain:
`balance == pool + claimable_total`, the reserve equals the cover of every active policy, shares add up.

## Interface

| Method | Kind | What it does |
|---|---|---|
| `buy_cover(entity, week_start, beneficiary)` | payable | weekly cover; refuses and refunds anything off the rules |
| `observe(entity, week_start)` | write, non-deterministic | measure and attribute a finished week (from 48 h after it ends) |
| `settle(entity, week_start)` | write | pay or expire a decided week's policies, 50 per call |
| `add_liquidity()` / `request_withdraw(shares)` / `execute_withdraw()` | payable / write | the pool |
| `withdraw()` / `withdraw_to(address)` | write | pull, or push to a beneficiary |
| `set_terms(...)` / `open_replay(entity, week_start)` | owner | open a country; open a past week on a demo deployment |
| `list_ledger`, `get_observation`, `list_terms`, `quote`, `get_policy`, `list_policies`, `policies_of`, `get_pool`, `get_lp`, `get_claimable`, `get_accounting`, `get_config` | views | JSON strings |

## Run it

Needs [uv](https://docs.astral.sh/uv/), Node 20+ and the GenLayer tools in
[`requirements-dev.txt`](requirements-dev.txt).

```bash
uv venv --python 3.12 .venv && uv pip install --python .venv/bin/python --prerelease=allow -r requirements-dev.txt
npm install
python3 scripts/bundle.py --check                                  # contracts/blackout_book.py is up to date
GENVM_VERSION=v0.6.0-rc5 .venv/bin/genvm-lint check contracts/blackout_book.py
GENVM_VERSION=v0.6.0-rc5 .venv/bin/python -m pytest -q             # 46 tests
scripts/glw deploy contracts/blackout_book.py true 1209600         # demo mode, 14-day LP notice
cd apps/web && npm install && npm run build                        # the website
```

The tests run on real IODA and Google News answers recorded in `tests/fixtures/` (Bangladesh July
2024, Ghana March 2024, Iraq June 2024 and a quiet week), with an injection corpus and the full
agreement matrix. Direct-mode contract tests check every money path against a ledger of deposits and
withdrawals, including that payable methods never raise.

## Layout

| Path | What |
|---|---|
| `contracts/src/blackout_book.py` | contract source; `contracts/blackout_book.py` is the deployable bundle |
| `lib/outage_signal.py` | lost days from IODA, integers only |
| `lib/news_evidence.py` | news query, outlet allowlist, cleaning, prompt, agreement rule |
| `tests/` | pure tests, direct-mode contract tests, recorded fixtures |
| `apps/web` | the website (Next.js) |
| `scripts/` | bundler, deploy wrapper, logged transactions, evidence builders |
| `docs/evidence/` | live run log, decoded transactions, contract readbacks |

## Limits and next steps

- Mobile-only and regional shutdowns barely move national IODA data (Pakistan's election-day mobile
  shutdown, February 2024). Next: an order-evidence track that pays a flat amount when at least two
  allowlisted outlets report a mobile shutdown.
- Verdicts can be appealed through GenLayer's own appeals; an in-app challenge with a bond is next.
- Next, the shutdown verdict as a standalone oracle other contracts read; USDC settlement through
  GenLayer's bridge; a Bradbury deployment.
- Studio Next is a test network with test GEN. This is a demonstration, not an insurance product.

MIT licence.
