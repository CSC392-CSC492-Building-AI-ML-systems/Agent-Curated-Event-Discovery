from datetime import date, datetime
from zoneinfo import ZoneInfo

AVAILABILITY_TIMEZONE = ZoneInfo("America/Toronto")


def availability_day_of_week(value: date | datetime) -> int:
    """Sunday = 0. Aware datetimes are converted to Toronto before taking the date.

    Naive datetimes and dates must already represent Toronto local time, as the
    current event database's date/time columns do.
    """
    if isinstance(value, datetime) and value.utcoffset() is not None:
        value = value.astimezone(AVAILABILITY_TIMEZONE)
    return (value.weekday() + 1) % 7
