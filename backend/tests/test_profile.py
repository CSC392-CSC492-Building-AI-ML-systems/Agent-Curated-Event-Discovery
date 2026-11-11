"""Profile contract and persistence using an isolated SQLite database, never Supabase."""
import os
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

with patch.dict(os.environ, {"DATABASE_URL": "postgresql+asyncpg://test:test@localhost/test", "SUPABASE_URL": "https://profile-test.supabase.co"}):
    from api.main import app
    from api.db.database import get_db
    from api.models.event import Base
    from api.models.profile import UserProfile
    from api.utils import auth

PATH = "/users/me/profile"
ISSUER = "https://profile-test.supabase.co/auth/v1"
EMPTY = {"first_name": None, "last_name": None, "username": None}


class ProfileTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        self.addCleanup(self.engine.dispose)
        Base.metadata.create_all(self.engine, tables=[UserProfile.__table__])
        self.user_id = str(uuid4())
        self.key = ec.generate_private_key(ec.SECP256R1())
        issuer = patch.object(auth, "ISSUER", ISSUER)
        keys = patch.object(auth, "jwks_client", SimpleNamespace(get_signing_key_from_jwt=lambda _: SimpleNamespace(key=self.key.public_key())))
        issuer.start()
        keys.start()
        self.addCleanup(issuer.stop)
        self.addCleanup(keys.stop)
        self.fail_read = self.fail_commit = False
        owner = self

        async def test_db():
            with Session(owner.engine) as db:
                class TestSession:
                    async def execute(self, statement, parameters=None):
                        if owner.fail_read and getattr(statement, "is_select", False):
                            raise OperationalError("test", {}, Exception("simulated failure"))
                        return db.execute(statement, parameters)

                    async def commit(self):
                        if owner.fail_commit:
                            raise OperationalError("test", {}, Exception("simulated failure"))
                        db.commit()

                    async def rollback(self):
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
        token = jwt.encode({"sub": user_id or self.user_id, "role": "authenticated", "aud": "authenticated", "iss": ISSUER,
                            "exp": datetime.now(timezone.utc) + timedelta(minutes=5), **claims}, self.key, algorithm="ES256")
        return {"Authorization": f"Bearer {token}"}

    def put(self, payload, user_id=None):
        return self.client.put(PATH, json=payload, headers=self.headers(user_id))

    def get(self, user_id=None):
        return self.client.get(PATH, headers=self.headers(user_id))

    def test_default_normalization_persistence_and_same_username_update(self):
        self.assertEqual(self.get().json(), {**EMPTY, "updated_at": None})
        payload = {"first_name": "  Élodie  ", "last_name": " O'Neil-Smith ", "username": "  Jessica_Lee  "}
        result = self.put(payload)
        self.assertEqual(result.status_code, 200, result.text)
        saved = result.json()
        self.assertEqual(saved["first_name"], "Élodie")
        self.assertEqual(saved["last_name"], "O'Neil-Smith")
        self.assertEqual(saved["username"], "jessica_lee")
        self.assertIsNotNone(saved["updated_at"])
        self.assertEqual(self.get().json(), saved)
        self.assertEqual(self.put(payload).status_code, 200)
        self.assertIn("no-store", result.headers["cache-control"])
        self.assertNotIn("user_id", saved)

    def test_unique_username_and_account_isolation(self):
        other = str(uuid4())
        original = {**EMPTY, "username": "jessica"}
        self.put(original)
        self.assertEqual(self.get(other).json(), {**EMPTY, "updated_at": None})
        conflict = self.put({**EMPTY, "username": "JESSICA"}, other)
        self.assertEqual(conflict.status_code, 409, conflict.text)
        self.assertEqual(conflict.json()["detail"], "This username is already taken.")
        self.assertEqual(self.get().json()["username"], "jessica")
        self.assertEqual(self.put({**EMPTY, "username": "another"}, other).status_code, 200)
        self.assertEqual(self.get().json()["username"], "jessica")
        self.assertEqual(self.get(other).json()["username"], "another")

    def test_nullable_usernames_release_old_name(self):
        other = str(uuid4())
        self.put({**EMPTY, "username": "available"})
        self.assertEqual(self.put({"first_name": "  ", "last_name": "", "username": " "}).status_code, 200)
        self.assertEqual(self.put(EMPTY, other).status_code, 200)
        self.assertEqual(self.put({**EMPTY, "username": "available"}, other).status_code, 200)

    def test_invalid_values_and_owner_injection_are_rejected_without_changes(self):
        self.put({**EMPTY, "username": "original"})
        for payload in [{}, {**EMPTY, "user_id": str(uuid4())}, {**EMPTY, "first_name": "x" * 101},
                        {**EMPTY, "last_name": 42}, *[{**EMPTY, "username": value} for value in ["ab", "x" * 31, "hello world", "name!", "İab", 123]]]:
            with self.subTest(payload=payload):
                self.assertEqual(self.put(payload).status_code, 422)
                self.assertEqual(self.get().json()["username"], "original")

    def test_auth_required(self):
        for headers in [{}, {"Authorization": "Bearer invalid"}, self.headers(role="anon"),
                        self.headers(exp=datetime.now(timezone.utc) - timedelta(minutes=1))]:
            for method in ["GET", "PUT"]:
                response = self.client.request(method, PATH, headers=headers, **({"json": EMPTY} if method == "PUT" else {}))
                self.assertIn(response.status_code, [401, 403])

    def test_database_errors_do_not_erase_existing_profile(self):
        self.put({**EMPTY, "username": "original"})
        self.fail_commit = True
        with self.assertLogs("api.routers.profile", level="ERROR"):
            self.assertEqual(self.put({**EMPTY, "username": "changed"}).status_code, 500)
        self.fail_commit = False
        self.assertEqual(self.get().json()["username"], "original")
        self.fail_read = True
        with self.assertLogs("api.routers.profile", level="ERROR"):
            response = self.get()
        self.assertEqual(response.status_code, 500)
        self.assertIn("no-store", response.headers["cache-control"])
