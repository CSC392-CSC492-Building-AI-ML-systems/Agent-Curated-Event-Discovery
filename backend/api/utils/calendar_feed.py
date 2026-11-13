from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from icalendar import Calendar, Event as ICalendarEvent

from ..models.event import Event

TORONTO = ZoneInfo("America/Toronto")


def build_calendar_feed(events: list[Event]) -> bytes:
    calendar = Calendar()
    calendar.add("prodid", "-//Eventide//Calendar Subscription//EN")
    calendar.add("version", "2.0")
    calendar.add("calscale", "GREGORIAN")
    calendar.add("method", "PUBLISH")
    calendar.add("x-wr-calname", "Eventide")
    stamp = datetime.now(timezone.utc)

    for event in events:
        if event.startdate is None:
            continue
        entry = ICalendarEvent()
        entry.add("uid", f"event-{event.id}@eventide")
        entry.add("dtstamp", stamp)
        entry.add("summary", event.name)
        entry.add("description", event.description or "")
        if event.venue_obj:
            location = ", ".join(dict.fromkeys(
                value.strip() for value in (event.venue_obj.name, event.venue_obj.address)
                if value and value.strip()
            ))
            if location:
                entry.add("location", location)

        if event.starttime is not None:
            start = datetime.combine(event.startdate, event.starttime, tzinfo=TORONTO).astimezone(timezone.utc)
            entry.add("dtstart", start)
            if event.enddate is not None and event.endtime is not None:
                end = datetime.combine(event.enddate, event.endtime, tzinfo=TORONTO).astimezone(timezone.utc)
                if end > start:
                    entry.add("dtend", end)
        else:
            entry.add("dtstart", event.startdate)
            # Source end dates are inclusive; iCalendar's all-day end is exclusive.
            last_day = max(event.startdate, event.enddate or event.startdate)
            entry.add("dtend", last_day + timedelta(days=1))
        calendar.add_component(entry)
    return calendar.to_ical()
