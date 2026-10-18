"""Lost-day measurement from IODA raw signals, in integers only.

Every validator recomputes this from the same historical IODA window and must get the identical
result, so it is deterministic integer arithmetic: no floats, clocks or randomness.

The covered week is seven local days starting at local Monday 00:00 (week_start is that Monday
00:00 UTC, shifted by the entity's UTC offset). A series' baseline is the upper quartile of its
values over the seven days before the local week; the upper quartile, not the median, keeps the
baseline honest the week after a long shutdown. A slot is dark when its value is below DARK_PCT %
of the baseline, and a local day is lost when the darker of the two series (BGP routing and
active probing) has at least LOST_HOURS dark hours that day. Short dips, such as the 1-2 hour
exam-time cuts measured in Iraq in June 2024, never count.
"""

DARK_PCT = 50
LOST_HOURS = 6
BASELINE_PERCENTILE = 75
DAY = 86400
WEEK = 7 * DAY
SERIES = ("bgp", "ping-slash24")
IODA = "https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/"


def ioda_url(entity: str, week_start: int) -> str:
    """The fixed window every validator fetches: eight days either side of week_start, enough for
    a seven-day baseline and a seven-day local week at any UTC offset up to +-24 h."""
    return IODA + entity + "?from=" + str(week_start - 8 * DAY) + "&until=" + str(week_start + 8 * DAY)


def percentile_int(values, pct: int) -> int:
    xs = sorted(int(v) for v in values if v is not None)
    return xs[(len(xs) * pct) // 100] if xs else 0


def dark_seconds(series: dict, week_start: int, tz_seconds: int) -> list:
    """Dark seconds per local day (seven entries) for one IODA series."""
    step, start, values = int(series["step"]), int(series["from"]), series.get("values") or []
    local_start = week_start - tz_seconds
    if step <= 0:
        return [0] * 7
    base = percentile_int(
        [v for i, v in enumerate(values) if local_start - WEEK <= start + i * step < local_start], BASELINE_PERCENTILE
    )
    per_day = [0] * 7
    if base <= 0:
        return per_day
    for i, v in enumerate(values):
        if v is None:
            continue
        t = start + i * step - local_start
        if 0 <= t < WEEK and int(v) * 100 < base * DARK_PCT:
            per_day[t // DAY] += step
    return per_day


def lost_days(payload: dict, week_start: int, tz_seconds: int) -> dict:
    """{"mask": bit d set when local day d (0 = Monday) is lost, "lost": count, "dark_h": hours per day}."""
    data = payload.get("data") if isinstance(payload, dict) else None
    rows = data[0] if isinstance(data, list) and data and isinstance(data[0], list) else []
    by_name = {s.get("datasource"): s for s in rows if isinstance(s, dict)}
    dark = [0] * 7
    for name in SERIES:
        if name in by_name:
            dark = [max(a, b) for a, b in zip(dark, dark_seconds(by_name[name], week_start, tz_seconds))]
    mask = 0
    for d in range(7):
        if dark[d] >= LOST_HOURS * 3600:
            mask |= 1 << d
    return {"mask": mask, "lost": bin(mask).count("1"), "dark_h": [x // 3600 for x in dark]}
