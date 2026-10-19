"""Direct-mode tests for contracts/blackout_book.py: cover, observation, consensus rules, settlement
and the money invariants, on IODA and news answers recorded for real events.

Direct mode does not move value on payable calls, so the Books ledger plays the network: it records
every deposit and withdrawal and sets the contract's balance to match (vm.deal); get_accounting must
then report conserved after every step.
"""

import calendar
import datetime as dt
import json
import pathlib
import re
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]
FIX = ROOT / "tests" / "fixtures"
CONTRACT = "contracts/blackout_book.py"
GEN = 10**18
DAILY, RATE, CAP = GEN, 2000, 5  # 1 GEN a lost day, 20% weekly premium, at most 5 days
PREMIUM, COVER = DAILY * RATE // 10000, DAILY * CAP
NOW = "2026-10-18T06:00:00Z"
IODA_RE = r"api\.ioda\.inetintel\.cc\.gatech\.edu"
NEWS_RE = r"news\.google\.com"
PROMPT_RE = r"settling an internet-shutdown insurance policy"


def ts(day: str) -> int:
    return calendar.timegm(dt.datetime.strptime(day, "%Y-%m-%d").timetuple())


BD_WEEK, BD_QUIET, GH_WEEK = ts("2024-07-15"), ts("2024-07-01"), ts("2024-03-11")


def at(vm, timestamp: str) -> None:
    """Move transaction time: gltest's warp() does not update gl.message.datetime, which the contract reads."""
    vm.warp(timestamp)
    message = sys.modules.get("genlayer.message")
    if message is not None:
        message.datetime = timestamp
        raw = getattr(message, "raw", None)
        if isinstance(raw, dict):
            raw["datetime"] = timestamp


def iso(seconds: int) -> str:
    return dt.datetime.fromtimestamp(seconds, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def paid(vm, value, fn, *args):
    vm.value = value
    try:
        return fn(*args)
    finally:
        vm.value = 0


def hexof(address) -> str:
    return ("0x" + bytes(address).hex()) if isinstance(address, (bytes, bytearray)) else address.as_hex.lower()


def serve(vm, ioda: str, news: str | None = None, status: int = 200):
    vm.clear_mocks()
    vm.mock_web(IODA_RE, {"method": "GET", "response": {"status": status, "headers": {}, "body": (FIX / ioda).read_bytes()}})
    if news is not None:
        body = (FIX / news).read_bytes() if news.endswith(".xml") else news.encode()
        vm.mock_web(NEWS_RE, {"method": "GET", "response": {"status": 200, "headers": {}, "body": body}})


def judge(vm, cls: str, why: str = "test"):
    # Double-encoded on purpose: gltest json-parses mock strings, while the v0.3 SDK expects JSON text.
    vm.mock_llm(PROMPT_RE, json.dumps(json.dumps({"cls": cls, "rationale": why})))


class Books:
    """The value the contract should hold: every deposit in, every withdrawal out."""

    def __init__(self, contract, vm):
        self.contract, self.vm, self.expected = contract, vm, 0
        self.address = vm._contract_address
        vm.deal(self.address, 0)

    def pay(self, value, fn, *args):
        self.vm.deal(self.address, self.expected + value)  # the network credits the value first
        result = paid(self.vm, value, fn, *args)
        self.expected += value
        self.check()
        return result

    def withdraw(self, who, fn=None, *args):
        payee = args[0] if args else hexof(who)  # withdraw_to(address) pays that address, not the caller
        amount = int(self.contract.get_claimable(payee))
        self.vm.sender = who
        (fn or self.contract.withdraw)(*args)
        self.expected -= amount
        self.vm.deal(self.address, self.expected)  # the transfer leaves at finalization
        self.check()
        return amount

    def check(self) -> dict:
        books = json.loads(self.contract.get_accounting())
        assert books["conserved"] is True and books["balance"] == str(self.expected), (books, self.expected)
        return books


@pytest.fixture
def book(direct_vm, direct_deploy, direct_alice):
    """A demo deployment with Bangladesh and Ghana on offer and 50 GEN of liquidity from alice."""
    at(direct_vm, NOW)
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT, True, 0)
    contract.set_terms("country/BD", "Bangladesh", 360, DAILY, RATE, CAP)
    contract.set_terms("country/GH", "Ghana", 0, DAILY, RATE, CAP)
    books = Books(contract, direct_vm)
    assert books.pay(50 * GEN, contract.add_liquidity)["ok"] is True
    return contract, books


def obs(contract, entity, week) -> dict:
    return json.loads(contract.get_observation(entity, week))


def policy(contract, pid) -> dict:
    return json.loads(contract.get_policy(pid))


# ------------------------------------------------------------------ the three replays


def test_bangladesh_july_2024_pays_the_beneficiary(direct_vm, book, direct_alice, direct_bob, direct_charlie):
    contract, books = book
    contract.open_replay("country/BD", BD_WEEK)
    direct_vm.sender = direct_bob
    bought = books.pay(PREMIUM, contract.buy_cover, "country/BD", BD_WEEK, hexof(direct_charlie))
    assert bought["ok"] is True and bought["replay"] is True and bought["cover"] == str(COVER)
    serve(direct_vm, "ioda_BD_2024-07-15.json", "gnews_BD_2024-07-15.xml")
    judge(direct_vm, "GOVERNMENT_ORDERED", "Multiple outlets report a government-imposed blackout.")
    assert contract.observe("country/BD", BD_WEEK) == {"cls": "GOVERNMENT_ORDERED", "lost": 3, "final": True, "attempts": 1}
    assert direct_vm.run_validator() is True
    seen = obs(contract, "country/BD", BD_WEEK)
    assert seen["mask"] == 0b1110000 and seen["dark_h"] == [0, 0, 0, 3, 24, 24, 24] and seen["replay"] is True
    # only reproduced fields are stored: no leader headlines, note or count
    assert not {"evidence", "why", "n_src", "digest"} & set(seen)
    direct_vm.sender = direct_alice  # anyone settles: the beneficiary files nothing
    assert contract.settle("country/BD", BD_WEEK) == {"paid": 1, "expired": 0, "total": str(3 * DAILY), "remaining": 0}
    books.check()
    assert policy(contract, bought["pid"])["status"] == "PAID"
    assert books.withdraw(direct_alice, contract.withdraw_to, hexof(direct_charlie)) == 3 * DAILY  # a keeper delivers it
    terms = json.loads(contract.list_terms())
    assert next(t for t in terms if t["entity"] == "country/BD")["history_days"] == 3  # prices future cover higher


def test_ghana_cable_cut_looks_the_same_but_pays_nothing(direct_vm, book, direct_bob):
    contract, books = book
    contract.open_replay("country/GH", GH_WEEK)
    direct_vm.sender = direct_bob
    pid = books.pay(PREMIUM, contract.buy_cover, "country/GH", GH_WEEK, "")["pid"]
    serve(direct_vm, "ioda_GH_2024-03-11.json", "gnews_GH_2024-03-11.xml")
    judge(direct_vm, "NON_GOVERNMENT_CAUSE", "Outlets attribute the outage to undersea cable failures.")
    result = contract.observe("country/GH", GH_WEEK)
    assert result["cls"] == "NON_GOVERNMENT_CAUSE" and result["lost"] == 4 and result["final"] is True
    assert contract.settle("country/GH", GH_WEEK)["expired"] == 1
    assert policy(contract, pid)["status"] == "EXPIRED"
    pool = json.loads(contract.get_pool())
    assert pool["reserved"] == "0" and int(pool["pool"]) == 50 * GEN + PREMIUM  # the premium stays with the LPs
    books.check()


def test_a_quiet_week_is_decided_without_any_model(direct_vm, book):
    contract, _ = book
    serve(direct_vm, "ioda_BD_2024-07-01.json")  # no news mock, no LLM mock: neither may be called
    assert contract.observe("country/BD", BD_QUIET) == {"cls": "NO_SHUTDOWN_SIGNAL", "lost": 0, "final": True, "attempts": 1}
    assert direct_vm.run_validator() is True
    with pytest.raises(Exception, match="already decided"):
        contract.observe("country/BD", BD_QUIET)


# ------------------------------------------------------------------ consensus rules


def lead(**overrides) -> dict:
    base = {"mask": 0b1110000, "lost": 3, "dark_h": [0, 0, 0, 3, 24, 24, 24], "cls": "GOVERNMENT_ORDERED"}
    return dict(base, **overrides)


def test_validators_recompute_the_measurement_exactly(direct_vm, book):
    contract, _ = book
    serve(direct_vm, "ioda_BD_2024-07-15.json", "gnews_BD_2024-07-15.xml")
    judge(direct_vm, "GOVERNMENT_ORDERED")
    contract.observe("country/BD", BD_WEEK)
    assert direct_vm.run_validator(leader_result=lead()) is True
    assert direct_vm.run_validator(leader_result=lead(mask=0b1111000, lost=4)) is False  # an invented lost day
    assert direct_vm.run_validator(leader_result=lead(dark_h=[0, 0, 0, 4, 24, 24, 24])) is False
    assert direct_vm.run_validator(leader_result=lead(cls="NO_SHUTDOWN_SIGNAL")) is False  # hiding a real collapse
    assert direct_vm.run_validator(leader_result=lead(cls="MAYBE")) is False
    # nothing but the reproducible fields may ride on an observation
    for extra in ({"why": "trust me"}, {"evidence": [{"domain": "reuters.com", "title": "x"}]}, {"n_src": 25}):
        assert direct_vm.run_validator(leader_result=lead(**extra)) is False


def test_no_class_is_taken_on_the_leaders_word(direct_vm, book):
    contract, _ = book
    serve(direct_vm, "ioda_BD_2024-07-15.json", "gnews_BD_2024-07-15.xml")
    judge(direct_vm, "GOVERNMENT_ORDERED")
    contract.observe("country/BD", BD_WEEK)
    # this validator's own model says GOVERNMENT_ORDERED
    assert direct_vm.run_validator(leader_result=lead(cls="UNATTRIBUTED")) is False
    assert direct_vm.run_validator(leader_result=lead(cls="NON_GOVERNMENT_CAUSE")) is False
    # this validator's own model says NON_GOVERNMENT_CAUSE
    serve(direct_vm, "ioda_BD_2024-07-15.json", "gnews_BD_2024-07-15.xml")
    judge(direct_vm, "NON_GOVERNMENT_CAUSE")
    assert direct_vm.run_validator(leader_result=lead(cls="GOVERNMENT_ORDERED")) is False
    assert direct_vm.run_validator(leader_result=lead(cls="UNATTRIBUTED")) is False  # a deferral is reproduced too
    assert direct_vm.run_validator(leader_result=lead(cls="NON_GOVERNMENT_CAUSE")) is True


def test_a_validator_whose_model_fails_confirms_nothing(direct_vm, book):
    contract, _ = book
    serve(direct_vm, "ioda_BD_2024-07-15.json", "gnews_BD_2024-07-15.xml")
    judge(direct_vm, "GOVERNMENT_ORDERED")
    contract.observe("country/BD", BD_WEEK)
    serve(direct_vm, "ioda_BD_2024-07-15.json", "gnews_BD_2024-07-15.xml")
    direct_vm.mock_llm(PROMPT_RE, json.dumps(json.dumps({"cls": "PERHAPS"})))
    for cls in ("GOVERNMENT_ORDERED", "NON_GOVERNMENT_CAUSE", "UNATTRIBUTED"):
        assert direct_vm.run_validator(leader_result=lead(cls=cls)) is False


def test_a_validator_without_news_reproduces_only_unattributed(direct_vm, book):
    contract, _ = book
    serve(direct_vm, "ioda_BD_2024-07-15.json", "gnews_BD_2024-07-15.xml")
    judge(direct_vm, "GOVERNMENT_ORDERED")
    contract.observe("country/BD", BD_WEEK)
    serve(direct_vm, "ioda_BD_2024-07-15.json", "<rss><channel></channel></rss>")
    assert direct_vm.run_validator(leader_result=lead(cls="GOVERNMENT_ORDERED")) is False
    assert direct_vm.run_validator(leader_result=lead(cls="UNATTRIBUTED")) is True


def test_a_quiet_week_cannot_be_called_a_shutdown(direct_vm, book):
    contract, _ = book
    serve(direct_vm, "ioda_BD_2024-07-01.json")
    contract.observe("country/BD", BD_QUIET)
    quiet = lead(mask=0, lost=0, dark_h=[0] * 7)
    assert direct_vm.run_validator(leader_result=dict(quiet, cls="NO_SHUTDOWN_SIGNAL")) is True
    assert direct_vm.run_validator(leader_result=dict(quiet, cls="GOVERNMENT_ORDERED")) is False


def test_an_unreadable_signal_stores_nothing(direct_vm, book):
    contract, _ = book
    serve(direct_vm, "ioda_BD_2024-07-15.json", status=503)
    with pytest.raises(Exception, match="TRANSIENT"):
        contract.observe("country/BD", BD_WEEK)
    assert obs(contract, "country/BD", BD_WEEK) == {"observed": False}


# ------------------------------------------------------------------ deferral and re-observation


def test_missing_reporting_defers_and_is_observed_again(direct_vm, book, direct_bob):
    contract, books = book
    contract.open_replay("country/BD", BD_WEEK)
    direct_vm.sender = direct_bob
    pid = books.pay(PREMIUM, contract.buy_cover, "country/BD", BD_WEEK, "")["pid"]
    serve(direct_vm, "ioda_BD_2024-07-15.json", "<rss><channel></channel></rss>")
    assert contract.observe("country/BD", BD_WEEK)["cls"] == "UNATTRIBUTED"
    with pytest.raises(Exception, match="not decided"):
        contract.settle("country/BD", BD_WEEK)
    with pytest.raises(Exception, match="observed again from"):
        contract.observe("country/BD", BD_WEEK)
    at(direct_vm, iso(ts("2026-10-18") + 13 * 3600))
    serve(direct_vm, "ioda_BD_2024-07-15.json", "gnews_BD_2024-07-15.xml")
    judge(direct_vm, "GOVERNMENT_ORDERED")
    assert contract.observe("country/BD", BD_WEEK) == {"cls": "GOVERNMENT_ORDERED", "lost": 3, "final": True, "attempts": 2}
    contract.settle("country/BD", BD_WEEK)
    assert policy(contract, pid)["paid"] == str(3 * DAILY)
    books.check()


def test_three_deferrals_close_the_week_without_payout(direct_vm, book, direct_bob):
    contract, books = book
    contract.open_replay("country/BD", BD_WEEK)
    direct_vm.sender = direct_bob
    pid = books.pay(PREMIUM, contract.buy_cover, "country/BD", BD_WEEK, "")["pid"]
    for k in range(3):
        at(direct_vm, iso(ts("2026-10-18") + k * 7 * 3600))
        serve(direct_vm, "ioda_BD_2024-07-15.json", "<rss></rss>")
        result = contract.observe("country/BD", BD_WEEK)
    assert result == {"cls": "UNATTRIBUTED", "lost": 3, "final": True, "attempts": 3}
    contract.settle("country/BD", BD_WEEK)
    assert policy(contract, pid)["status"] == "EXPIRED"
    books.check()


# ------------------------------------------------------------------ buying cover


def next_monday(after: int) -> int:
    monday = 4 * 86400
    return after + (monday - after) % (7 * 86400)


def test_live_cover_is_sold_only_72_hours_ahead(direct_vm, book, direct_bob):
    contract, books = book
    now = ts("2026-10-18") + 6 * 3600
    direct_vm.sender = direct_bob
    tomorrow = next_monday(now)  # Monday 19 October, 18 hours away
    refused = books.pay(PREMIUM, contract.buy_cover, "country/BD", tomorrow, "")
    assert refused["ok"] is False and "72 hours" in refused["error"] and refused["refunded"] == str(PREMIUM)
    ok = books.pay(PREMIUM, contract.buy_cover, "country/BD", tomorrow + 7 * 86400, "")
    assert ok["ok"] is True and ok["replay"] is False
    with pytest.raises(Exception, match="observed from"):
        contract.observe("country/BD", tomorrow + 7 * 86400)
    assert books.withdraw(direct_bob) == PREMIUM  # the refund is claimable


def test_purchase_refusals_are_refunded(direct_vm, book, direct_bob):
    contract, books = book
    contract.open_replay("country/BD", BD_WEEK)
    direct_vm.sender = direct_bob
    cases = [
        (PREMIUM, ("country/XX", BD_WEEK, ""), "no cover"),
        (PREMIUM, ("country/BD", BD_WEEK + 86400, ""), "Monday"),
        (PREMIUM, ("country/BD", BD_WEEK, "not-an-address"), "beneficiary"),
        (PREMIUM - 1, ("country/BD", BD_WEEK, ""), "premium is"),
    ]
    for value, args, problem in cases:
        result = books.pay(value, contract.buy_cover, *args)
        assert result["ok"] is False and problem in result["error"], result
    over = books.pay(PREMIUM + GEN, contract.buy_cover, "country/BD", BD_WEEK, "")
    assert over["ok"] is True and int(contract.get_claimable(hexof(direct_bob))) == 4 * PREMIUM - 1 + GEN


def test_caps_per_wallet_and_per_country_week(direct_vm, book, direct_bob, direct_charlie):
    contract, books = book
    contract.open_replay("country/BD", BD_WEEK)
    direct_vm.sender = direct_bob
    for _ in range(2):  # 50 GEN pool: 20% is 10 GEN, two 5-GEN covers
        assert books.pay(PREMIUM, contract.buy_cover, "country/BD", BD_WEEK, "")["ok"] is True
    sold_out = books.pay(PREMIUM, contract.buy_cover, "country/BD", BD_WEEK, "")
    assert "sold out" in sold_out["error"]
    books.pay(500 * GEN, contract.add_liquidity)
    for _ in range(3):
        assert books.pay(PREMIUM, contract.buy_cover, "country/BD", BD_WEEK, "")["ok"] is True
    assert "per wallet" in books.pay(PREMIUM, contract.buy_cover, "country/BD", BD_WEEK, "")["error"]
    direct_vm.sender = direct_charlie
    assert books.pay(PREMIUM, contract.buy_cover, "country/BD", BD_WEEK, "")["ok"] is True


def test_a_decided_week_cannot_be_bought(direct_vm, book, direct_bob):
    contract, books = book
    contract.open_replay("country/BD", BD_QUIET)
    serve(direct_vm, "ioda_BD_2024-07-01.json")
    contract.observe("country/BD", BD_QUIET)
    direct_vm.sender = direct_bob
    assert "already been observed" in books.pay(PREMIUM, contract.buy_cover, "country/BD", BD_QUIET, "")["error"]


def test_replays_are_owner_only_and_past_only(direct_vm, book, direct_alice, direct_bob):
    contract, _ = book
    direct_vm.sender = direct_bob
    with pytest.raises(Exception, match="only the owner"):
        contract.open_replay("country/BD", BD_WEEK)
    direct_vm.sender = direct_alice
    with pytest.raises(Exception, match="only past weeks"):
        contract.open_replay("country/BD", next_monday(ts("2026-10-18")))


def test_a_live_deployment_has_no_replays(direct_vm, direct_deploy, direct_alice):
    at(direct_vm, NOW)
    direct_vm.sender = direct_alice
    live = direct_deploy(CONTRACT, False, 0)
    live.set_terms("country/BD", "Bangladesh", 360, DAILY, RATE, CAP)
    with pytest.raises(Exception, match="demo deployments"):
        live.open_replay("country/BD", BD_WEEK)
    assert json.loads(live.get_config())["demo_mode"] is False


def test_terms_are_validated(book):
    contract, _ = book
    for args, problem in [
        (("BD", "Bangladesh", 360, DAILY, RATE, CAP), "country/BD"),
        (("country/BD", "Bangla<desh>", 360, DAILY, RATE, CAP), "plain name"),
        (("country/BD", "Bangladesh", 361, DAILY, RATE, CAP), "UTC offset"),
        (("country/BD", "Bangladesh", 360, DAILY, RATE, 9), "out of range"),
    ]:
        with pytest.raises(Exception, match=problem):
            contract.set_terms(*args)


# ------------------------------------------------------------------ liquidity


def test_lp_withdrawals_wait_for_notice_and_never_touch_reserves(direct_vm, direct_deploy, direct_alice, direct_bob):
    at(direct_vm, NOW)
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT, True, 3600)
    contract.set_terms("country/BD", "Bangladesh", 360, DAILY, RATE, CAP)
    books = Books(contract, direct_vm)
    shares = books.pay(25 * GEN, contract.add_liquidity)["shares"]
    contract.open_replay("country/BD", BD_WEEK)
    direct_vm.sender = direct_bob
    books.pay(PREMIUM, contract.buy_cover, "country/BD", BD_WEEK, "")
    direct_vm.sender = direct_alice
    contract.request_withdraw(shares)
    with pytest.raises(Exception, match="notice period"):
        contract.execute_withdraw()
    at(direct_vm, iso(ts("2026-10-18") + 6 * 3600 + 3601))
    with pytest.raises(Exception, match="reserved by active policies"):
        contract.execute_withdraw()  # all 25.2 GEN would leave while 5 GEN is reserved
    serve(direct_vm, "ioda_BD_2024-07-15.json", "gnews_BD_2024-07-15.xml")
    judge(direct_vm, "GOVERNMENT_ORDERED")
    contract.observe("country/BD", BD_WEEK)
    contract.settle("country/BD", BD_WEEK)
    contract.execute_withdraw()
    assert books.withdraw(direct_alice) == 25 * GEN + PREMIUM - 3 * DAILY  # capital + premium - payout
    assert books.withdraw(direct_bob) == 3 * DAILY


def test_payable_methods_never_raise():
    """A raise inside a payable would keep the sender's GEN; every refusal must refund instead."""
    source = (ROOT / "contracts" / "src" / "blackout_book.py").read_text()
    for name in ("add_liquidity", "buy_cover"):
        body = re.search(r"def " + name + r"\(.*?(?=\n    @|\n    # ---)", source, re.S).group(0)
        code = re.sub(r'""".*?"""', "", body, flags=re.S)  # docstrings may say "raise"
        assert not re.search(r"\braise\b", code) and "_fail(" not in code and "self._terms(" not in code, name
