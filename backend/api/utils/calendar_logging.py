import logging
import re

_FEED_TOKEN = re.compile(r"(/calendar/feeds/)[^/\s?]+")


class CalendarTokenFilter(logging.Filter):
    """Private feed tokens must not be persisted in Uvicorn access logs."""

    def filter(self, record: logging.LogRecord) -> bool:
        def redact(value):
            return _FEED_TOKEN.sub(r"\1[redacted]", value) if isinstance(value, str) else value

        record.msg = redact(record.msg)
        # Preserve Uvicorn's five-argument access-log shape for its formatter.
        if isinstance(record.args, tuple):
            record.args = tuple(redact(value) for value in record.args)
        elif isinstance(record.args, dict):
            record.args = {key: redact(value) for key, value in record.args.items()}
        return True


def install_calendar_log_filter() -> None:
    logger = logging.getLogger("uvicorn.access")
    if not any(isinstance(item, CalendarTokenFilter) for item in logger.filters):
        logger.addFilter(CalendarTokenFilter())
