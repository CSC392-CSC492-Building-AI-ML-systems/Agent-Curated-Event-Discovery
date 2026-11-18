"""Account deletion uses signed local JWTs and a mocked Auth service; no live deletions."""
import json
import os
import time
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import httpx
import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

with patch.dict(os.environ, {"DATABASE_URL": "postgresql+asyncpg://test:test@localhost/test", "SUPABASE_URL": "https://account-test.supabase.co"}):
    from api.main import app
    from api.db.database import get_db
    from api.routers.account import get_auth_admin_client
    from api.utils import auth
    from api.utils.account_deletion import CASCADE_TARGETS

PATH = "/users/me/account"
ISSUER = "https://account-test.supabase.co/auth/v1"
SECRET = "sb_secret_test_only"


class AccountTests(unittest.TestCase):
    def setUp(self):
        self.user_id, self.session_id = str(uuid4()), str(uuid4())
        self.key = ec.generate_private_key(ec.SECP256R1())
        self.active = True
        self.has_password = True
        self.counter_cleanup = True
        self.fail_counter_check = False
        self.cascades = list(CASCADE_TARGETS.items())
        self.requests = []
        self.queries = []
        self.response_status = 200
        self.timeout = self.fail_db = False
        for patcher in [patch.object(auth, "ISSUER", ISSUER),
                        patch.object(auth, "jwks_client", SimpleNamespace(get_signing_key_from_jwt=lambda _: SimpleNamespace(key=self.key.public_key()))),
                        patch.dict(os.environ, {"SUPABASE_URL": "https://account-test.supabase.co", "SUPABASE_SECRET_KEY": SECRET})]:
            patcher.start()
            self.addCleanup(patcher.stop)
        owner = self

        async def database():
            class Session:
                async def execute(self, statement, parameters=None):
                    owner.queries.append((str(statement), parameters))
                    if owner.fail_db:
                        raise OperationalError("test", {}, Exception("failure"))
                    if "FROM auth.sessions" in str(statement):
                        return SimpleNamespace(scalar_one=lambda: owner.active)
                    if "FROM auth.users" in str(statement):
                        return SimpleNamespace(scalar_one_or_none=lambda: owner.has_password)
                    if "FROM pg_trigger" in str(statement):
                        if owner.fail_counter_check:
                            raise OperationalError("test", {}, Exception("failure"))
                        return SimpleNamespace(scalar_one=lambda: owner.counter_cleanup)
                    return SimpleNamespace(all=lambda: owner.cascades)

                async def rollback(self):
                    pass
            yield Session()

        def transport(request):
            owner.requests.append(request)
            if owner.timeout:
                raise httpx.ReadTimeout("simulated failure", request=request)
            if owner.response_status == 200:
                owner.active = False
            return httpx.Response(owner.response_status, json={"message": "upstream details must not be exposed"})

        async def client():
            async with httpx.AsyncClient(base_url="https://account-test.supabase.co/auth/v1/", headers={"apikey": SECRET}, transport=httpx.MockTransport(transport)) as admin:
                yield admin

        self.transport = transport
        self.previous = app.dependency_overrides.copy()
        app.dependency_overrides[get_db] = database
        app.dependency_overrides[get_auth_admin_client] = client
        self.addCleanup(self.restore)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def restore(self):
        app.dependency_overrides.clear()
        app.dependency_overrides.update(self.previous)

    def headers(self, **overrides):
        claims = {"sub": self.user_id, "session_id": self.session_id, "role": "authenticated", "aud": "authenticated", "iss": ISSUER,
                  "exp": datetime.now(timezone.utc) + timedelta(minutes=5), "amr": [{"method": "password", "timestamp": int(time.time())}]}
        claims.update(overrides)
        token = jwt.encode(claims, self.key, algorithm="ES256")
        return {"Authorization": f"Bearer {token}"}

    def test_security_returns_only_password_presence_for_verified_owner(self):
        for value in [True, False]:
            self.has_password = value
            response = self.client.get(PATH + "/security", headers=self.headers())
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json(), {"has_password": value})
            self.assertIn("no-store", response.headers["cache-control"])
            self.assertEqual(self.queries[-1][1], {"user_id": self.user_id})
        self.assertEqual(self.requests, [])
        self.assertEqual(self.client.get(PATH + "/security").status_code, 401)
        self.active = False
        self.assertEqual(self.client.get(PATH + "/security", headers=self.headers()).status_code, 401)

    def test_deletes_only_verified_owner_and_revoked_token_cannot_access_protected_routes(self):
        headers = self.headers()
        response = self.client.delete(PATH, headers=headers)
        self.assertEqual(response.status_code, 204, response.text)
        self.assertEqual(response.content, b"")
        self.assertIn("no-store", response.headers["cache-control"])
        self.assertEqual(len(self.requests), 1)
        request = self.requests[0]
        self.assertEqual(request.url.path, f"/auth/v1/admin/users/{self.user_id}")
        self.assertEqual(request.headers["apikey"], SECRET)
        self.assertNotIn("authorization", request.headers)
        self.assertEqual(json.loads(request.content), {"should_soft_delete": False})
        for path in ["/users/me", "/users/me/profile", "/users/me/preferences", "/users/me/calendar", "/users/me/availability", PATH]:
            method = "DELETE" if path == PATH else "GET"
            self.assertEqual(self.client.request(method, path, headers=headers).status_code, 401)
        self.assertEqual(len(self.requests), 1)
        self.assertEqual(self.queries[0][1], {"session_id": self.session_id, "user_id": self.user_id})

    def test_missing_invalid_expired_and_sessionless_tokens_never_delete(self):
        for headers in [{}, {"Authorization": "Bearer invalid"}, self.headers(session_id=None), self.headers(sub="invalid"),
                        self.headers(exp=datetime.now(timezone.utc) - timedelta(minutes=1)), self.headers(role="anon")]:
            self.assertIn(self.client.delete(PATH, headers=headers).status_code, [401, 403])
        self.assertEqual(self.requests, [])

    def test_recent_verified_auth_required_not_just_recent_token_issue(self):
        for amr in [None, [], [{"method": "password", "timestamp": time.time() - 601}],
                    [{"method": "token_refresh", "timestamp": time.time()}], [{"method": "oauth", "timestamp": time.time() + 300}],
                    [{"method": "password", "timestamp": True}]]:
            result = self.client.delete(PATH, headers=self.headers(amr=amr, iat=int(time.time())))
            self.assertEqual(result.status_code, 403, result.text)
        self.assertEqual(self.requests, [])
        self.assertEqual(self.client.delete(PATH, headers=self.headers(amr=[{"method": "oauth", "timestamp": int(time.time())}])).status_code, 204)

    def test_owner_injection_body_and_query_are_rejected(self):
        for options in [{"json": {"user_id": str(uuid4())}}, {"params": {"user_id": str(uuid4())}}]:
            response = self.client.request("DELETE", PATH, headers=self.headers(), **options)
            self.assertEqual(response.status_code, 422)
        self.assertEqual(self.requests, [])

    def test_missing_cascade_blocks_before_any_deletion(self):
        self.cascades.pop()
        result = self.client.delete(PATH, headers=self.headers())
        self.assertEqual(result.status_code, 503)
        self.assertEqual(self.requests, [])
        self.assertTrue(self.active)

    def test_missing_counter_cleanup_blocks_before_auth_deletion(self):
        self.counter_cleanup = False
        result = self.client.delete(PATH, headers=self.headers())
        self.assertEqual(result.status_code, 503)
        self.assertIn("006_account_counter_cleanup.sql", result.json()["detail"])
        self.assertEqual(self.requests, [])
        self.assertTrue(self.active)

    def test_counter_cleanup_check_failure_blocks_before_auth_deletion(self):
        self.fail_counter_check = True
        result = self.client.delete(PATH, headers=self.headers())
        self.assertEqual(result.status_code, 503)
        self.assertEqual(self.requests, [])
        self.assertTrue(self.active)

    def test_upstream_failures_leave_account_active_and_never_expose_details(self):
        for status in [400, 401, 403, 404, 409, 500]:
            self.response_status = status
            result = self.client.delete(PATH, headers=self.headers())
            self.assertEqual(result.status_code, 502)
            self.assertNotIn("upstream", result.text)
            self.assertNotIn(SECRET, result.text)
            self.assertTrue(self.active)
        self.timeout = True
        self.assertEqual(self.client.delete(PATH, headers=self.headers()).status_code, 502)

    def test_session_database_failure_fails_closed(self):
        self.fail_db = True
        self.assertEqual(self.client.delete(PATH, headers=self.headers()).status_code, 503)
        self.assertEqual(self.requests, [])

    def test_missing_or_legacy_key_is_rejected(self):
        del app.dependency_overrides[get_auth_admin_client]
        for key in ["", "eyJlegacy"]:
            with patch.dict(os.environ, {"SUPABASE_SECRET_KEY": key}):
                self.assertEqual(self.client.delete(PATH, headers=self.headers()).status_code, 503)

    def test_real_client_configuration_uses_only_apikey_and_disables_redirects(self):
        import asyncio
        async def check():
            async for client in get_auth_admin_client():
                self.assertEqual(str(client.base_url), "https://account-test.supabase.co/auth/v1/")
                self.assertEqual(client.headers["apikey"], SECRET)
                self.assertNotIn("authorization", client.headers)
                self.assertFalse(client.follow_redirects)
        asyncio.run(check())
