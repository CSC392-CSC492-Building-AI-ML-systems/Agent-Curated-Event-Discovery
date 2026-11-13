"""Availability endpoints: SQLite transactions and locally verified JWTs, no Supabase."""
import os
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

with patch.dict(os.environ, {
    "DATABASE_URL": "postgresql+asyncpg://test:test@localhost/test",
    "SUPABASE_URL": "https://availability-test.supabase.co",
}):
    from api.main import app
    from api.db.database import get_db
    from api.models.event import Base
    from api.models.availability import UserAvailability
    from api.utils import auth

PATH = "/users/me/availability"
ISSUER = "https://availability-test.supabase.co/auth/v1"
MONDAY = {"day_of_week": 1, "start_minute": 540, "end_minute": 720}


class AvailabilityTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        self.addCleanup(self.engine.dispose)
        self.lock_keys = []

        @event.listens_for(self.engine, "connect")
        def configure(connection, _):
            # SQLite has no advisory locks. Record their requested keys; these
            # tests verify the lock precedes writes, not PostgreSQL concurrency.
            connection.create_function("pg_advisory_xact_lock", 1, lambda key: self.lock_keys.append(key))

        Base.metadata.create_all(self.engine, tables=[UserAvailability.__table__])
        self.user_id = str(uuid4())
        self.key = ec.generate_private_key(ec.SECP256R1())
        self.issuer = patch.object(auth, "ISSUER", ISSUER)
        self.issuer.start()
        self.addCleanup(self.issuer.stop)
        self.signing_keys = patch.object(auth, "jwks_client", SimpleNamespace(
            get_signing_key_from_jwt=lambda _: SimpleNamespace(key=self.key.public_key())
        ))
        self.signing_keys.start()
        self.addCleanup(self.signing_keys.stop)
        self.fail_read = self.fail_insert = self.fail_commit = False
        self.rollbacks = 0
        self.statements = []
        owner = self

        async def test_db():
            with Session(self.engine) as db:
                class TestSession:
                    async def execute(self, statement, parameters=None):
                        owner.statements.append(str(statement))
                        if (owner.fail_read and getattr(statement, "is_select", False)) or (
                            owner.fail_insert and getattr(statement, "is_insert", False)
                        ):
                            raise OperationalError("test", {}, Exception("simulated failure"))
                        return db.execute(statement, parameters)

                    async def commit(self):
                        if owner.fail_commit:
                            raise OperationalError("test", {}, Exception("simulated commit failure"))
                        db.commit()

                    async def rollback(self):
                        owner.rollbacks += 1
                        db.rollback()
                yield TestSession()

        previous = app.dependency_overrides.copy()
        app.dependency_overrides[get_db] = test_db

        def restore():
            app.dependency_overrides.clear()
            app.dependency_overrides.update(previous)
        self.addCleanup(restore)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def headers(self, user_id=None, **claims):
        token = jwt.encode({
            "sub": user_id or self.user_id, "role": "authenticated", "aud": "authenticated",
            "iss": ISSUER, "exp": datetime.now(timezone.utc) + timedelta(minutes=5), **claims,
        }, self.key, algorithm="ES256")
        return {"Authorization": f"Bearer {token}"}

    def get(self, user_id=None):
        return self.client.get(PATH, headers=self.headers(user_id))

    def put(self, windows, user_id=None):
        return self.client.put(PATH, json={"windows": windows}, headers=self.headers(user_id))

    def test_new_user_save_read_and_response_privacy(self):
        self.assertEqual(self.get().json(), {"windows": []})
        response = self.put([MONDAY])
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), {"windows": [MONDAY]})
        read = self.get()
        self.assertEqual(read.json(), response.json())
        for result in (read, response):
            self.assertIn("no-store", result.headers["cache-control"])
            self.assertNotIn("user_id", result.json())

    def test_normalization_replacement_repeated_save_and_clear(self):
        adjacent = {"day_of_week": 1, "start_minute": 720, "end_minute": 750}
        separate = {"day_of_week": 1, "start_minute": 900, "end_minute": 960}
        self.assertEqual(self.put([separate, adjacent, MONDAY]).json(), {"windows": [
            {**MONDAY, "end_minute": 750}, separate,
        ]})
        for _ in range(2):
            self.assertEqual(self.put([separate]).json(), {"windows": [separate]})
            self.assertEqual(self.get().json(), {"windows": [separate]})
        self.assertEqual(self.put([]).json(), {"windows": []})
        self.assertEqual(self.get().json(), {"windows": []})
        self.assertTrue(self.lock_keys)
        self.assertEqual(len(set(self.lock_keys)), 1)
        writes = [index for index, sql in enumerate(self.statements) if sql.startswith("DELETE")]
        for index in writes:
            self.assertIn("pg_advisory_xact_lock", self.statements[index - 1])

    def test_accounts_are_isolated_including_empty_replacement(self):
        other = str(uuid4())
        saturday = {"day_of_week": 6, "start_minute": 1410, "end_minute": 1440}
        self.put([MONDAY])
        self.assertEqual(self.get(other).json(), {"windows": []})
        self.put([saturday], other)
        self.assertEqual(self.get().json(), {"windows": [MONDAY]})
        self.put([], other)
        self.assertEqual(self.get(other).json(), {"windows": []})
        self.assertEqual(self.get().json(), {"windows": [MONDAY]})
        self.assertEqual(len(set(self.lock_keys)), 2)

    def test_invalid_payloads_do_not_touch_existing_schedule(self):
        self.put([MONDAY])
        for payload in (
            {}, {"windows": None}, {"windows": [], "user_id": str(uuid4())},
            {"windows": [], "configured": True},
            {"windows": [{**MONDAY, "day_of_week": 7}]},
            {"windows": [{**MONDAY, "start_minute": 541}]},
            {"windows": [{**MONDAY, "end_minute": 540}]},
        ):
            with self.subTest(payload=payload):
                result = self.client.put(PATH, json=payload, headers=self.headers())
                self.assertEqual(result.status_code, 422, result.text)
                self.assertEqual(self.get().json(), {"windows": [MONDAY]})

    def test_missing_expired_wrong_role_and_invalid_tokens_are_rejected(self):
        invalid_headers = [
            {}, {"Authorization": "Bearer invalid"},
            self.headers(exp=datetime.now(timezone.utc) - timedelta(minutes=1)),
            self.headers(role="anon"), self.headers(iss="https://wrong.example/auth/v1"),
            self.headers(aud="wrong"),
        ]
        for headers in invalid_headers:
            for method in ("GET", "PUT"):
                with self.subTest(method=method, headers_present=bool(headers)):
                    result = self.client.request(method, PATH, headers=headers,
                        **({"json": {"windows": []}} if method == "PUT" else {}))
                    self.assertIn(result.status_code, (401, 403))
        self.assertEqual(self.statements, [])

    def test_failed_insert_or_commit_rolls_back_deletion(self):
        self.put([MONDAY])
        for failure in ("fail_insert", "fail_commit"):
            setattr(self, failure, True)
            with self.assertLogs("api.routers.availability", level="ERROR"):
                response = self.put([{"day_of_week": 0, "start_minute": 0, "end_minute": 30}])
            self.assertEqual(response.status_code, 500)
            self.assertEqual(response.json()["detail"], "Unable to save availability; please retry")
            setattr(self, failure, False)
            self.assertEqual(self.get().json(), {"windows": [MONDAY]})
        self.assertEqual(self.rollbacks, 2)

    def test_database_read_failure_is_not_an_empty_schedule(self):
        self.fail_read = True
        with self.assertLogs("api.routers.availability", level="ERROR"):
            response = self.get()
        self.assertEqual(response.status_code, 500)
        self.assertIn("no-store", response.headers["cache-control"])

    def test_cors_and_openapi_contract(self):
        response = self.client.options(PATH, headers={
            "Origin": "http://localhost:5173", "Access-Control-Request-Method": "PUT",
            "Access-Control-Request-Headers": "authorization,content-type",
        })
        self.assertEqual(response.status_code, 200)
        schema = self.client.get("/openapi.json").json()
        self.assertIn("get", schema["paths"][PATH])
        self.assertIn("put", schema["paths"][PATH])
        self.assertEqual(schema["components"]["schemas"]["WeeklyAvailability"]["required"], ["windows"])
