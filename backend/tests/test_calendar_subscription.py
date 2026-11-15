"""Subscription tests use SQLite, mocked identity, and parsed ICS; no live services."""
import logging
from datetime import date, time
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import urlsplit
from uuid import UUID, uuid4

from icalendar import Calendar
from sqlalchemy import select
from sqlalchemy.orm import Session
from uvicorn.logging import AccessFormatter

from test_calendar import CalendarTestCase
from api.models.calendar import CalendarEvent
from api.models.calendar_subscription import CalendarSubscription
from api.models.event import Base, Event
from api.models.user_actions import EventSaved
from api.utils.auth import get_current_user
from api.utils.calendar_feed import build_calendar_feed
from api.utils.calendar_logging import CalendarTokenFilter
from api.utils.calendar_tokens import hash_calendar_token
from api.main import app


class CalendarSubscriptionTests(CalendarTestCase):
    def setUp(self):
        super().setUp()
        Base.metadata.create_all(self.engine, tables=[CalendarSubscription.__table__])
        self.env = patch.dict("os.environ", {"CALENDAR_FEED_BASE_URL": "https://calendar.example.test"})
        self.env.start()
        self.addCleanup(self.env.stop)

    def create(self):
        response = self.client.post("/users/me/calendar-subscription")
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["subscription_url"]

    def feed(self, url):
        return self.client.get(urlsplit(url).path)

    def entries(self, url):
        response = self.feed(url)
        self.assertEqual(response.status_code, 200, response.text)
        return Calendar.from_ical(response.content).walk("VEVENT")

    def test_only_hash_is_stored_and_status_never_reveals_link(self):
        self.assertEqual(self.client.get("/users/me/calendar-subscription").json()["enabled"], False)
        url = self.create()
        token = urlsplit(url).path.split("/")[3]
        with Session(self.engine) as db:
            row = db.scalar(select(CalendarSubscription))
            self.assertEqual(row.token_hash, hash_calendar_token(token))
            self.assertNotEqual(row.token_hash, token)
        status = self.client.get("/users/me/calendar-subscription")
        self.assertTrue(status.json()["enabled"])
        self.assertNotIn("subscription_url", status.json())
        self.assertNotIn(token, status.text)
        self.assertIn("no-store", status.headers["cache-control"])

    def test_replacement_and_disable_revoke_links(self):
        old = self.create()
        self.assertEqual(self.entries(old), [])
        new = self.create()
        self.assertNotEqual(old, new)
        self.assertEqual(self.feed(old).status_code, 404)
        self.assertEqual(self.entries(new), [])
        disabled = self.client.delete("/users/me/calendar-subscription")
        self.assertEqual(disabled.status_code, 204)
        self.assertEqual(disabled.content, b"")
        self.assertEqual(self.feed(new).status_code, 404)
        self.assertEqual(self.client.delete("/users/me/calendar-subscription").status_code, 204)

    def test_feed_is_private_to_its_owner_and_ignores_saved_events(self):
        first = self.user_id
        self.add(1)
        with Session(self.engine) as db:
            db.add(EventSaved(user_id=UUID(first), event_id=3))
            db.commit()
        first_url = self.create()
        self.user_id = str(uuid4())
        self.assertFalse(self.client.get("/users/me/calendar-subscription").json()["enabled"])
        self.add(2)
        second_url = self.create()
        self.assertEqual([str(e["uid"]) for e in self.entries(first_url)], ["event-1@eventide"])
        self.assertEqual([str(e["uid"]) for e in self.entries(second_url)], ["event-2@eventide"])
        self.client.delete("/users/me/calendar-subscription")
        self.assertEqual(self.feed(first_url).status_code, 200)

    def test_feed_reflects_additions_edits_and_removals_with_stable_uids(self):
        url = self.create()
        self.assertEqual(self.entries(url), [])
        self.add(1)
        first = self.entries(url)[0]
        with Session(self.engine) as db:
            db.get(Event, 1).name = "Updated event"
            db.commit()
        updated = self.entries(url)[0]
        self.assertEqual(first["uid"], updated["uid"])
        self.assertEqual(str(updated["summary"]), "Updated event")
        self.remove(1)
        self.assertEqual(self.entries(url), [])
        response = self.feed(url)
        self.assertIn("text/calendar", response.headers["content-type"])
        self.assertIn("no-store", response.headers["cache-control"])
        self.assertIn("eventide-events.ics", response.headers["content-disposition"])

    def test_feed_is_not_limited_to_first_page(self):
        with Session(self.engine) as db:
            for event_id in range(4, 105):
                source = db.get(Event, 1)
                db.add(Event(
                    id=event_id, name=f"Event {event_id}", description="Test",
                    startdate=source.startdate, enddate=source.enddate,
                    starttime=source.starttime, endtime=source.endtime,
                    venue=1, link="https://example.com", eighteenplus=False,
                    togathereventid=f"source-{event_id}", likes=0, saves=0,
                ))
                db.add(CalendarEvent(user_id=UUID(self.user_id), event_id=event_id))
            db.commit()
        self.assertEqual(len(self.entries(self.create())), 101)

    def test_invalid_tokens_and_authentication(self):
        for token in ("bad", "a" * 43):
            response = self.client.get(f"/calendar/feeds/{token}/eventide-events.ics")
            self.assertEqual(response.status_code, 404)
        url = self.create()
        app.dependency_overrides.pop(get_current_user)
        # A calendar app needs only the feed URL, never a Supabase session.
        self.assertEqual(self.feed(url).status_code, 200)
        for method in ("GET", "POST", "DELETE"):
            response = self.client.request(method, "/users/me/calendar-subscription")
            self.assertIn(response.status_code, (401, 403))

    def test_invalid_configuration_does_not_revoke_existing_link(self):
        url = self.create()
        for invalid in ("http://example.com", "https://example.com?secret=x", "not-a-url", "https://user:password@example.com"):
            with patch.dict("os.environ", {"CALENDAR_FEED_BASE_URL": invalid}):
                self.assertEqual(self.client.post("/users/me/calendar-subscription").status_code, 503)
            self.assertEqual(self.feed(url).status_code, 200)
        with patch.dict("os.environ", {"CALENDAR_FEED_BASE_URL": "http://localhost:8000/"}):
            self.assertTrue(self.create().startswith("http://localhost:8000/calendar/feeds/"))

    def test_failures_roll_back_and_never_return_an_empty_feed(self):
        url = self.create()
        self.fail_write = True
        with self.assertLogs("api.routers.calendar_subscriptions", level="ERROR"):
            self.assertEqual(self.client.post("/users/me/calendar-subscription").status_code, 500)
            self.assertEqual(self.client.delete("/users/me/calendar-subscription").status_code, 500)
        self.fail_write = False
        self.assertEqual(self.feed(url).status_code, 200)
        self.fail_read = True
        with self.assertLogs("api.routers.calendar_subscriptions", level="ERROR"):
            self.assertEqual(self.feed(url).status_code, 503)
            self.assertEqual(self.client.get("/users/me/calendar-subscription").status_code, 500)

    def test_post_cors_preflight(self):
        response = self.client.options("/users/me/calendar-subscription", headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        })
        self.assertEqual(response.status_code, 200)

    def test_serialization_dates_locations_and_missing_times(self):
        def source(event_id, **changes):
            return SimpleNamespace(**{
                "id": event_id, "name": "Music, art; café", "description": "First\nSecond",
                "startdate": date(2026, 11, 8), "enddate": date(2026, 11, 8),
                "starttime": time(12), "endtime": time(16, 30),
                "venue_obj": SimpleNamespace(name="Venue", address="Toronto, ON"),
                **changes,
            })
        data = build_calendar_feed([
            source(1),
            source(2, starttime=None, enddate=date(2026, 11, 9)),
            source(3, endtime=None, venue_obj=None),
            source(4, startdate=None),
            source(5, startdate=date(2026, 7, 8), enddate=date(2026, 7, 8)),
            source(6, starttime=None, enddate=None),
        ])
        entries = {str(e["uid"]): e for e in Calendar.from_ical(data).walk("VEVENT")}
        self.assertEqual(len(entries), 5)
        timed = entries["event-1@eventide"]
        self.assertEqual(timed.decoded("dtstart").hour, 17)
        self.assertEqual(timed.decoded("dtstart").utcoffset().total_seconds(), 0)
        self.assertEqual(str(timed["summary"]), "Music, art; café")
        self.assertEqual(str(timed["description"]), "First\nSecond")
        self.assertEqual(str(timed["location"]), "Venue, Toronto, ON")
        self.assertEqual(entries["event-2@eventide"].decoded("dtend"), date(2026, 11, 10))
        self.assertNotIn("dtend", entries["event-3@eventide"])
        self.assertNotIn("location", entries["event-3@eventide"])
        self.assertEqual(entries["event-5@eventide"].decoded("dtstart").hour, 16)
        self.assertEqual(entries["event-6@eventide"].decoded("dtend"), date(2026, 11, 9))

    def test_access_logging_redacts_tokens_without_breaking_uvicorn(self):
        token = "s" * 43
        record = logging.LogRecord("uvicorn.access", logging.INFO, "test", 1,
            '%s - "%s %s HTTP/%s" %d',
            ("127.0.0.1", "GET", f"/calendar/feeds/{token}/eventide-events.ics", "1.1", 200), None)
        self.assertTrue(CalendarTokenFilter().filter(record))
        rendered = AccessFormatter('%(message)s', use_colors=False).format(record)
        self.assertNotIn(token, rendered)
        self.assertNotIn(token, repr(record.args))
        self.assertIn("[redacted]", rendered)
