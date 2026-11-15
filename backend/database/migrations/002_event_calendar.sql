-- Apply in Supabase before running the new calendar API.
-- Saved events remain saved; calendar membership starts independently.
BEGIN;

CREATE TABLE IF NOT EXISTS public.event_calendar (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES public.event(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, event_id)
);

ALTER TABLE public.event_calendar ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_calendar FROM anon, authenticated;

COMMIT;
