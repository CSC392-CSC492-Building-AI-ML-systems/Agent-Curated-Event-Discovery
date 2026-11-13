-- Apply after 002_event_calendar.sql, once approved by the team.
BEGIN;

CREATE TABLE IF NOT EXISTS public.calendar_subscription (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE CHECK (length(token_hash) = 64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_subscription ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.calendar_subscription FROM anon, authenticated;

COMMIT;
