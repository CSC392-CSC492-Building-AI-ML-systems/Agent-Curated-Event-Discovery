-- Run ONLY in an empty, disposable PostgreSQL database, never in Supabase.
-- psql "$ACCOUNT_COUNTER_TEST_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f backend/tests/sql/test_account_counter_cleanup.sql
\set ON_ERROR_STOP on

DO $$
BEGIN
    IF to_regclass('auth.users') IS NOT NULL OR to_regclass('public.event') IS NOT NULL THEN
        RAISE EXCEPTION 'Counter tests require an empty, disposable database';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eventide_test_auth_admin') THEN
        CREATE ROLE eventide_test_auth_admin;
    END IF;
END;
$$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE auth.users (id UUID PRIMARY KEY);
CREATE TABLE public.event (id INTEGER PRIMARY KEY, likes INTEGER, saves INTEGER);
CREATE TABLE public.event_liked (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES public.event(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, event_id)
);
CREATE TABLE public.event_saved (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES public.event(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, event_id)
);
GRANT USAGE ON SCHEMA auth TO eventide_test_auth_admin;
GRANT SELECT, DELETE ON auth.users TO eventide_test_auth_admin;

-- Apply the real migration twice to verify reapplication cannot double-fire.
\ir ../../database/migrations/006_account_counter_cleanup.sql
\ir ../../database/migrations/006_account_counter_cleanup.sql

BEGIN;
CREATE TEMP TABLE counter_cleanup_test_session (id INTEGER);
CREATE FUNCTION pg_temp.assert_counts(event_id INTEGER, expected_likes INTEGER, expected_saves INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    actual RECORD;
BEGIN
    SELECT likes, saves INTO STRICT actual FROM public.event WHERE id = event_id;
    IF actual.likes IS DISTINCT FROM expected_likes OR actual.saves IS DISTINCT FROM expected_saves THEN
        RAISE EXCEPTION 'Event %: expected (%, %), got (%, %)',
            event_id, expected_likes, expected_saves, actual.likes, actual.saves;
    END IF;
END;
$$;

INSERT INTO auth.users VALUES
    ('10000000-0000-4000-8000-000000000001'),
    ('10000000-0000-4000-8000-000000000002'),
    ('10000000-0000-4000-8000-000000000003');
INSERT INTO public.event VALUES (1, 2, 2), (2, 1, 0), (3, 0, 1), (4, 17, 23), (5, 0, NULL);
INSERT INTO public.event_liked VALUES
    ('10000000-0000-4000-8000-000000000001', 1),
    ('10000000-0000-4000-8000-000000000001', 2),
    ('10000000-0000-4000-8000-000000000001', 5),
    ('10000000-0000-4000-8000-000000000002', 1);
INSERT INTO public.event_saved VALUES
    ('10000000-0000-4000-8000-000000000001', 1),
    ('10000000-0000-4000-8000-000000000001', 5),
    ('10000000-0000-4000-8000-000000000002', 1),
    ('10000000-0000-4000-8000-000000000002', 3);
COMMIT;

-- An ordinary unlike/unsave remains API-managed, without double subtraction.
BEGIN;
DELETE FROM public.event_liked WHERE user_id = '10000000-0000-4000-8000-000000000001' AND event_id = 1;
UPDATE public.event SET likes = likes - 1 WHERE id = 1;
DELETE FROM public.event_saved WHERE user_id = '10000000-0000-4000-8000-000000000001' AND event_id = 1;
UPDATE public.event SET saves = saves - 1 WHERE id = 1;
SELECT pg_temp.assert_counts(1, 1, 1);
DELETE FROM auth.users WHERE id = '10000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_counts(1, 1, 1);
ROLLBACK;

-- The Auth role can delete without direct access to the action/event tables.
BEGIN;
SET ROLE eventide_test_auth_admin;
DELETE FROM auth.users WHERE id = '10000000-0000-4000-8000-000000000001';
RESET ROLE;
SELECT pg_temp.assert_counts(1, 1, 1);
SELECT pg_temp.assert_counts(2, 0, 0);
SELECT pg_temp.assert_counts(3, 0, 1);
SELECT pg_temp.assert_counts(4, 17, 23);
SELECT pg_temp.assert_counts(5, 0, 0);
DELETE FROM auth.users WHERE id = '10000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_counts(1, 1, 1);
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.event_liked WHERE user_id = '10000000-0000-4000-8000-000000000001')
       OR EXISTS (SELECT 1 FROM public.event_saved WHERE user_id = '10000000-0000-4000-8000-000000000001') THEN
        RAISE EXCEPTION 'Deleted account action rows did not cascade';
    END IF;
    IF (SELECT COUNT(*) FROM public.event_saved WHERE user_id = '10000000-0000-4000-8000-000000000002') <> 2 THEN
        RAISE EXCEPTION 'Another user''s actions were changed';
    END IF;
END;
$$;
ROLLBACK;

-- Rolling back Auth deletion restores the account, actions, and exact counters.
SELECT pg_temp.assert_counts(1, 2, 2);
SELECT pg_temp.assert_counts(2, 1, 0);
SELECT pg_temp.assert_counts(5, 0, NULL);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '10000000-0000-4000-8000-000000000001')
       OR (SELECT COUNT(*) FROM public.event_liked WHERE user_id = '10000000-0000-4000-8000-000000000001') <> 3 THEN
        RAISE EXCEPTION 'Rollback did not restore the account and actions';
    END IF;
END;
$$;

-- A later deletion error also rolls back counter changes, rather than claiming success.
BEGIN;
CREATE FUNCTION pg_temp.reject_account_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'simulated Auth deletion failure';
END;
$$;
CREATE TRIGGER reject_account_delete AFTER DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_account_delete();
DO $$
BEGIN
    BEGIN
        DELETE FROM auth.users WHERE id = '10000000-0000-4000-8000-000000000001';
        RAISE EXCEPTION 'Expected deletion failure';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> 'simulated Auth deletion failure' THEN
            RAISE;
        END IF;
    END;
END;
$$;
SELECT pg_temp.assert_counts(1, 2, 2);
SELECT pg_temp.assert_counts(2, 1, 0);
SELECT pg_temp.assert_counts(5, 0, NULL);
DROP TRIGGER reject_account_delete ON auth.users;
COMMIT;

-- Deleting an account with no actions leaves every counter untouched.
BEGIN;
DELETE FROM auth.users WHERE id = '10000000-0000-4000-8000-000000000003';
SELECT pg_temp.assert_counts(1, 2, 2);
SELECT pg_temp.assert_counts(4, 17, 23);
SELECT pg_temp.assert_counts(5, 0, NULL);
ROLLBACK;

-- Bulk account deletion subtracts each account once and preserves shared events.
BEGIN;
DELETE FROM auth.users WHERE id IN ('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002');
SELECT pg_temp.assert_counts(1, 0, 0);
SELECT pg_temp.assert_counts(2, 0, 0);
SELECT pg_temp.assert_counts(3, 0, 0);
SELECT pg_temp.assert_counts(4, 17, 23);
SELECT pg_temp.assert_counts(5, 0, 0);
ROLLBACK;

DO $$
BEGIN
    IF has_function_privilege('anon', 'public.cleanup_deleted_user_event_counters()', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.cleanup_deleted_user_event_counters()', 'EXECUTE') THEN
        RAISE EXCEPTION 'Cleanup function must not be exposed as a client RPC';
    END IF;
    IF (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'eventide_cleanup_deleted_user_counters' AND tgrelid = 'auth.users'::regclass) <> 1 THEN
        RAISE EXCEPTION 'Expected exactly one cleanup trigger';
    END IF;
END;
$$;

SELECT 'Account counter cleanup SQL regression tests passed' AS result;
