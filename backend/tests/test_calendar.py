"""Calendar membership tests use isolated SQLite, never the team's database."""
import os
import unittest
from datetime import date, time
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import Text, create_engine, event, func, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

with patch.dict(os.environ, {"DATABASE_URL": "postgresql+asyncpg://test:test@localhost/test"}):
    from api.main import app
    from api.db.database import get_db
    from api.models.calendar import CalendarEvent
    from api.models.event import Base, Event, Organizer, Tag, Venue, event_tags
    from api.models.user_actions import EventSaved
    from api.utils.auth import get_current_user


class CalendarTestCase(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )

        @event.listens_for(self.engine, "connect")
        def configure(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
            # These tests use null coordinates; no PostGIS installation is needed.
            connection.create_function("ST_AsGeoJSON", 1, lambda value: value)
            connection.create_function("ST_AsBinary", 1, lambda value: value)
            connection.create_function("ST_GeogFromText", 1, lambda value: value)
            connection.create_function("AsGeoJSON", -1, lambda value, *args: value)
            connection.create_function("AsBinary", -1, lambda value, *args: value)

        coordinates = Venue.__table__.c.coordinates
        original_type = coordinates.type
        coordinates.type = Text()
        try:
            Base.metadata.create_all(self.engine, tables=[
                Venue.__table__, Organizer.__table__, Event.__table__, Tag.__table__,
                event_tags, CalendarEvent.__table__, EventSaved.__table__,
            ])
        finally:
            coordinates.type = original_type

        with Session(self.engine) as db:
            venue = Venue(id=1, name="Test venue", address="Toronto", coordinates=None)
            db.add(venue)
            for event_id in (1, 2, 3):
                db.add(Event(
                    id=event_id, name=f"Event {event_id}", description="Test",
                    startdate=date(2026, 11, event_id), enddate=date(2026, 11, event_id),
                    starttime=time(10), endtime=time(12), venue_obj=venue,
                    link="https://example.com", eighteenplus=False,
                    togathereventid=f"source-{event_id}", likes=0, saves=0,
                ))
            db.commit()

        self.user_id = str(uuid4())
        self.fail_write = False
        self.fail_read = False
        self.rollbacks = 0
        owner = self

        async def test_db():
            with Session(self.engine) as db:
                class TestSession:
                    async def scalar(self, statement):
                        if owner.fail_read:
                            raise OperationalError("test", {}, Exception("simulated failure"))
                        return db.scalar(statement)

                    async def execute(self, statement):
                        write = getattr(statement, "is_insert", False) or getattr(statement, "is_delete", False)
                        if (write and owner.fail_write) or (not write and owner.fail_read):
                            raise OperationalError("test", {}, Exception("simulated failure"))
                        return db.execute(statement)

                    async def commit(self):
                        db.commit()

                    async def rollback(self):
                        owner.rollbacks += 1
                        db.rollback()
                yield TestSession()

        self.original_overrides = app.dependency_overrides.copy()
        app.dependency_overrides[get_db] = test_db
        app.dependency_overrides[get_current_user] = lambda: {"sub": self.user_id}
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        app.dependency_overrides.update(self.original_overrides)
        self.engine.dispose()

    def add(self, event_id):
        return self.client.put("/users/me/calendar", json={"id": event_id})

    def remove(self, event_id):
        return self.client.request("DELETE", "/users/me/calendar", json={"id": event_id})


class CalendarTests(CalendarTestCase):
    def test_calendar_and_saves_are_independent(self):
        with Session(self.engine) as db:
            from uuid import UUID
            db.add(EventSaved(user_id=UUID(self.user_id), event_id=2))
            db.commit()
        self.assertEqual(self.client.get("/users/me/calendar").json(), [])
        self.assertEqual(self.add(1).status_code, 200)
        data = self.client.get("/users/me/calendar").json()
        self.assertEqual([item["id"] for item in data], [1])
        self.assertEqual(data[0]["venue"]["name"], "Test venue")
        self.assertEqual(data[0]["starttime"], "10:00:00")
        with Session(self.engine) as db:
            self.assertEqual(db.scalars(select(EventSaved.event_id)).all(), [2])
        self.remove(1)
        with Session(self.engine) as db:
            self.assertEqual(db.scalars(select(EventSaved.event_id)).all(), [2])

    def test_add_and_remove_are_idempotent(self):
        self.assertEqual(self.add(1).status_code, 200)
        self.assertEqual(self.add(1).status_code, 200)
        with Session(self.engine) as db:
            self.assertEqual(db.scalar(select(func.count()).select_from(CalendarEvent)), 1)
        self.assertEqual(self.remove(1).status_code, 200)
        self.assertEqual(self.remove(1).status_code, 200)
        self.assertEqual(self.client.get("/users/me/calendar").json(), [])

    def test_accounts_are_isolated(self):
        first = self.user_id
        self.add(1)
        self.user_id = str(uuid4())
        self.assertEqual(self.client.get("/users/me/calendar").json(), [])
        self.assertEqual(self.remove(1).status_code, 200)
        self.add(2)
        self.user_id = first
        self.assertEqual([e["id"] for e in self.client.get("/users/me/calendar").json()], [1])

    def test_validates_event_ids_and_pagination(self):
        for invalid in (0, -1, "1", True):
            self.assertEqual(self.add(invalid).status_code, 422)
        self.assertEqual(self.add(999).status_code, 404)
        self.add(1)
        self.add(2)
        response = self.client.get("/users/me/calendar?skip=1&limit=1")
        self.assertEqual([e["id"] for e in response.json()], [2])
        self.assertEqual(self.client.get("/users/me/calendar?limit=101").status_code, 422)

    def test_failed_write_rolls_back_and_read_failure_is_not_empty(self):
        self.fail_write = True
        self.assertEqual(self.add(1).status_code, 500)
        self.assertEqual(self.rollbacks, 1)
        self.fail_write = False
        self.assertEqual(self.client.get("/users/me/calendar").json(), [])
        self.add(1)
        self.fail_write = True
        self.assertEqual(self.remove(1).status_code, 500)
        self.fail_write = False
        self.assertEqual(len(self.client.get("/users/me/calendar").json()), 1)
        self.fail_read = True
        self.assertEqual(self.client.get("/users/me/calendar").status_code, 500)

    def test_requires_authentication(self):
        app.dependency_overrides.pop(get_current_user)
        for method in ("GET", "PUT", "DELETE"):
            response = self.client.request(method, "/users/me/calendar", json={"id": 1})
            self.assertIn(response.status_code, (401, 403))


if __name__ == "__main__":
    unittest.main()
