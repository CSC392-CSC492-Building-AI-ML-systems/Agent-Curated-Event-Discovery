-- Apply after migrations 001–005 and the team's event_liked/event_saved tables.
-- Normal like/save endpoints still maintain their own counters. This trigger
-- handles only account deletion, before the user's action rows cascade away.
BEGIN;

CREATE OR REPLACE FUNCTION public.cleanup_deleted_user_event_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    removed_actions RECORD;
BEGIN
    -- Serialize with an in-flight unlike/unsave before counting its rows.
    -- New likes/saves cannot pass their auth.users FK while DELETE holds the
    -- parent row lock. Locks and counter changes roll back with Auth deletion.
    PERFORM event_id FROM public.event_liked
    WHERE user_id = OLD.id ORDER BY event_id FOR UPDATE;
    PERFORM event_id FROM public.event_saved
    WHERE user_id = OLD.id ORDER BY event_id FOR UPDATE;

    -- Update both counters together and lock shared events in a stable order.
    FOR removed_actions IN
        SELECT actions.event_id, SUM(actions.likes) AS likes, SUM(actions.saves) AS saves
        FROM (
            SELECT event_id, 1 AS likes, 0 AS saves
            FROM public.event_liked WHERE user_id = OLD.id
            UNION ALL
            SELECT event_id, 0 AS likes, 1 AS saves
            FROM public.event_saved WHERE user_id = OLD.id
        ) AS actions
        GROUP BY actions.event_id
        ORDER BY actions.event_id
    LOOP
        UPDATE public.event AS event
        SET likes = GREATEST(COALESCE(event.likes, 0) - removed_actions.likes, 0),
            saves = GREATEST(COALESCE(event.saves, 0) - removed_actions.saves, 0)
        WHERE event.id = removed_actions.event_id;
    END LOOP;

    RETURN OLD;
END;
$$;

-- Auth's deletion role does not need direct access to the public action tables.
-- The function is callable through the trigger, not as a public client RPC.
REVOKE ALL ON FUNCTION public.cleanup_deleted_user_event_counters() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS eventide_cleanup_deleted_user_counters ON auth.users;
CREATE TRIGGER eventide_cleanup_deleted_user_counters
BEFORE DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.cleanup_deleted_user_event_counters();

COMMENT ON FUNCTION public.cleanup_deleted_user_event_counters() IS
    'Subtracts a deleted account''s likes/saves before FK cascades, in the same transaction. Normal unlikes/unsaves remain API-managed.';

COMMIT;
