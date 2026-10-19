# Consensus soundness: what changed in v2

Before BLACKOUT was reviewed, its consensus was checked against the standard the GenLayer stewards
applied to two other contracts by the same author (InjectionJudge and PinnedFetch): no outcome may be
accepted on the leader's word, every class must be reproduced by the validator itself, and nothing
unverified may be stored. Version 1 fell short in two places. Version 2 fixes both and is the live
deployment ([DEPLOYMENTS.md](DEPLOYMENTS.md)).

## 1. UNATTRIBUTED was a partial safe harbour

**v1** (`lib/news_evidence.py`, `agree`): a leader's `UNATTRIBUTED` also stood when the validator's own
reading said `NON_GOVERNMENT_CAUSE`, on the grounds that neither pays now.

**Why that is not enough:** the two classes have different outcomes. `NON_GOVERNMENT_CAUSE` is final
and the policy expires unpaid; `UNATTRIBUTED` is observed again after six hours, up to three times.
A leader could keep a decidable week open, delaying settlement and holding the pool's reserve.

**v2:** `agree(leader, mine)` is `leader == mine`, for every class. A validator whose model returns no
usable answer confirms nothing (`return False`), instead of standing in for `UNATTRIBUTED`. The
measurement half was already exact: the lost-day mask, the lost days and the dark hours per day must
equal the validator's own computation from its own IODA fetch, and zero lost days must be
`NO_SHUTDOWN_SIGNAL`.

## 2. The observation stored fields no validator reproduced

**v1** stored, next to the reproduced measurement and class, the leader's headline count, a digest of
its headlines, its model's rationale and an excerpt of its evidence. Validators never compared them,
so they were the leader's word.

**v2:** an observation is exactly `{mask, lost, dark_h, cls}`. The validator refuses any other key
set, so no leader headline, note or count can be persisted. The website shows the week's headlines
from its own fetch, with the same query and the same outlet allowlist, and labels them as fetched
by the site, not stored on chain.

## Tests

- `tests/test_signal_evidence.py::test_agreement_is_exact_for_every_class`: all nine leader/validator
  class pairs; only equal ones agree.
- `tests/direct/test_blackout_book.py::test_no_class_is_taken_on_the_leaders_word`: a validator whose
  own reading differs rejects each class, `UNATTRIBUTED` included.
- `test_validators_recompute_the_measurement_exactly`: an observation carrying a rationale, an
  evidence list or a headline count is refused, as is any measurement off by one hour.
- `test_a_validator_whose_model_fails_confirms_nothing`: a validator with an unusable model answer
  accepts no class.

`GENVM_VERSION=v0.6.0-rc5 .venv/bin/python -m pytest -q`: 47 passed.

## On chain

The v1 run's steps were replayed on v2, unchanged ([evidence/transactions.md](evidence/transactions.md)).
The v1 log is kept as [evidence/v1-live-run.jsonl](evidence/v1-live-run.jsonl), and the v1 contract
stays deployed with its history.
