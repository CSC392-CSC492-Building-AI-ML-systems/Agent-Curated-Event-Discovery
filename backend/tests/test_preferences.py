"""Preferences tests use isolated SQLite tables and local signing keys, never Supabase."""

import os
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

# Avoid loading a real database URL even while constructing the unused async engine.
with patch.dict(os.environ, {"DATABASE_URL": "postgresql+asyncpg://test:test@localhost/test"}):
    from api.main import app
    from api.db.database import get_db
    from api.models.event import Base, Tag
    from api.models.preferences import UserPreferences, UserPreferenceTag
    from api.utils import auth


class PreferencesTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )

        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")

        Base.metadata.create_all(self.engine, tables=[
            Tag.__table__, UserPreferences.__table__, UserPreferenceTag.__table__,
        ])
        with Session(self.engine) as db:
            db.add_all([Tag(id=1, name="Art"), Tag(id=2, name="Music"), Tag(id=3, name="Tech")])
            db.commit()

        self.private_key = ec.generate_private_key(ec.SECP256R1())
        self.user_id = str(uuid4())
        self.env = patch.dict(os.environ, {"SUPABASE_URL": "https://test.supabase.co"})
        self.env.start()
        self.keys = patch.object(auth, "get_jwks_client")
        self.jwks = self.keys.start()
        self.jwks.return_value.get_signing_key_from_jwt.return_value = SimpleNamespace(
            key=self.private_key.public_key()
        )
        self.fail_tag_insert = False
        self.reads = 0

        async def test_db():
            with Session(self.engine) as db:
                owner = self

                # Execute real SQL against SQLite through the route's async interface.
                class TestSession:
                    async def execute(self, statement):
                        owner.reads += 1
                        if owner.fail_tag_insert and getattr(statement, "is_insert", False) and statement.table.name == "user_preference_tags":
                            raise OperationalError("INSERT", {}, Exception("simulated failure"))
                        return db.execute(statement)

                    async def commit(self):
                        db.commit()

                    async def rollback(self):
                        db.rollback()

                yield TestSession()

        self.previous_overrides = app.dependency_overrides.copy()
        app.dependency_overrides[get_db] = test_db
        self.client = TestClient(app)
        self.payload = {"age_group": "20_29", "budget": "under_25", "interest_tag_ids": [1, 2]}

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        app.dependency_overrides.update(self.previous_overrides)
        self.keys.stop()
        self.env.stop()
        self.engine.dispose()

    def token(self, **changes):
        claims = {
            "sub": self.user_id,
            "iss": "https://test.supabase.co/auth/v1",
            "aud": "authenticated",
            "role": "authenticated",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        }
        claims.update(changes)
        return jwt.encode(claims, self.private_key, algorithm="ES256", headers={"kid": "test"})

    def headers(self, **claims):
        return {"Authorization": f"Bearer {self.token(**claims)}"}

    def test_new_user_defaults_and_identity(self):
        response = self.client.get("/users/me/preferences", headers=self.headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "age_group": None, "budget": None, "interest_tag_ids": [], "onboarding_completed": False,
        })
        self.assertEqual(self.client.get("/users/me", headers=self.headers()).json(), {"id": self.user_id})

    def test_save_and_read_back(self):
        response = self.client.put("/users/me/preferences", headers=self.headers(), json=self.payload)
        self.assertEqual(response.status_code, 200)
        expected = {**self.payload, "onboarding_completed": True}
        self.assertEqual(response.json(), expected)
        self.assertEqual(self.client.get("/users/me/preferences", headers=self.headers()).json(), expected)

    def test_repeated_put_replaces_instead_of_duplicates(self):
        for _ in range(2):
            self.assertEqual(self.client.put("/users/me/preferences", headers=self.headers(), json=self.payload).status_code, 200)
        updated = {"age_group": None, "budget": None, "interest_tag_ids": [3]}
        self.assertEqual(self.client.put("/users/me/preferences", headers=self.headers(), json=updated).status_code, 200)
        self.assertEqual(self.client.get("/users/me/preferences", headers=self.headers()).json(), {**updated, "onboarding_completed": True})
        with Session(self.engine) as db:
            self.assertEqual(db.scalar(select(func.count()).select_from(UserPreferences)), 1)
            self.assertEqual(db.scalar(select(func.count()).select_from(UserPreferenceTag)), 1)

    def test_users_are_isolated(self):
        other_id = str(uuid4())
        self.client.put("/users/me/preferences", headers=self.headers(), json=self.payload)
        other_payload = {"age_group": "80_plus", "budget": "free", "interest_tag_ids": [3]}
        self.assertFalse(self.client.get("/users/me/preferences", headers=self.headers(sub=other_id)).json()["onboarding_completed"])
        self.assertEqual(self.client.put("/users/me/preferences", headers=self.headers(sub=other_id), json=other_payload).status_code, 200)
        self.assertEqual(self.client.get("/users/me/preferences", headers=self.headers()).json()["interest_tag_ids"], [1, 2])
        self.assertEqual(self.client.get("/users/me/preferences", headers=self.headers(sub=other_id)).json()["interest_tag_ids"], [3])

    def test_rejects_invalid_payloads(self):
        invalid = [
            {**self.payload, "age_group": "20–29"},
            {**self.payload, "budget": "cheap"},
            {**self.payload, "interest_tag_ids": []},
            {**self.payload, "interest_tag_ids": [999]},
            {**self.payload, "interest_tag_ids": [1, 1]},
            {**self.payload, "interest_tag_ids": ["1"]},
            {**self.payload, "interest_tag_ids": [True]},
            {**self.payload, "interest_tag_ids": [-1]},
            {**self.payload, "user_id": str(uuid4())},
            {**self.payload, "onboarding_completed": True},
            {"interest_tag_ids": [1]},
        ]
        for payload in invalid:
            with self.subTest(payload=payload):
                self.assertEqual(self.client.put("/users/me/preferences", headers=self.headers(), json=payload).status_code, 422)
        self.assertFalse(self.client.get("/users/me/preferences", headers=self.headers()).json()["onboarding_completed"])

    def test_invalid_tags_leave_existing_preferences_unchanged(self):
        self.client.put("/users/me/preferences", headers=self.headers(), json=self.payload)
        self.assertEqual(self.client.put("/users/me/preferences", headers=self.headers(), json={**self.payload, "interest_tag_ids": [999]}).status_code, 422)
        self.assertEqual(self.client.get("/users/me/preferences", headers=self.headers()).json(), {**self.payload, "onboarding_completed": True})

    def test_database_failure_rolls_back_entire_update(self):
        self.client.put("/users/me/preferences", headers=self.headers(), json=self.payload)
        self.fail_tag_insert = True
        response = self.client.put("/users/me/preferences", headers=self.headers(), json={**self.payload, "budget": "free", "interest_tag_ids": [3]})
        self.assertEqual(response.status_code, 500)
        self.assertEqual(self.client.get("/users/me/preferences", headers=self.headers()).json(), {**self.payload, "onboarding_completed": True})

    def test_missing_and_malformed_tokens(self):
        for headers in [{}, {"Authorization": "Basic test"}, {"Authorization": "Bearer broken"}]:
            with self.subTest(headers=headers):
                self.assertEqual(self.client.get("/users/me/preferences", headers=headers).status_code, 401)
                self.assertEqual(self.client.put("/users/me/preferences", headers=headers, json=self.payload).status_code, 401)
        self.assertEqual(self.reads, 0)

    def test_rejects_expired_wrong_issuer_audience_role_and_subject(self):
        for claims in [
            {"exp": datetime.now(timezone.utc) - timedelta(minutes=5)},
            {"iss": "https://other.supabase.co/auth/v1"},
            {"aud": "other"}, {"role": "anon"}, {"sub": "not-a-uuid"},
        ]:
            with self.subTest(claims=claims):
                self.assertEqual(self.client.get("/users/me/preferences", headers=self.headers(**claims)).status_code, 401)
        self.assertEqual(self.reads, 0)

    def test_rejects_bad_signature_and_unsigned_token(self):
        self.jwks.return_value.get_signing_key_from_jwt.return_value = SimpleNamespace(
            key=ec.generate_private_key(ec.SECP256R1()).public_key()
        )
        self.assertEqual(self.client.get("/users/me/preferences", headers=self.headers()).status_code, 401)
        unsigned = jwt.encode({"sub": self.user_id}, key="", algorithm="none")
        self.assertEqual(self.client.get("/users/me/preferences", headers={"Authorization": f"Bearer {unsigned}"}).status_code, 401)

    def test_missing_auth_configuration_and_auth_outage(self):
        with patch.dict(os.environ, {"SUPABASE_URL": ""}):
            self.assertEqual(self.client.get("/users/me/preferences", headers=self.headers()).status_code, 503)
        self.jwks.return_value.get_signing_key_from_jwt.side_effect = jwt.PyJWKClientConnectionError("offline")
        self.assertEqual(self.client.get("/users/me/preferences", headers=self.headers()).status_code, 503)

    def test_authenticated_put_cors_preflight(self):
        response = self.client.options("/users/me/preferences", headers={
            "Origin": "http://localhost:5173", "Access-Control-Request-Method": "PUT",
            "Access-Control-Request-Headers": "authorization,content-type",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:5173")


if __name__ == "__main__":
    unittest.main()
