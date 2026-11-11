-- Apply in the team's Supabase SQL editor before using profile editing.
BEGIN;
CREATE TABLE IF NOT EXISTS public.user_profile (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    username VARCHAR(30),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_profile_username_key UNIQUE (username),
    CONSTRAINT user_profile_username_format CHECK (
        username IS NULL OR (username = lower(username) AND username ~ '^[a-z0-9_]{3,30}$')
    ),
    CHECK (first_name IS NULL OR (first_name = btrim(first_name) AND length(first_name) > 0)),
    CHECK (last_name IS NULL OR (last_name = btrim(last_name) AND length(last_name) > 0))
);
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_profile FROM anon, authenticated;
COMMENT ON TABLE public.user_profile IS
    'Account profile details, accessed through authenticated FastAPI endpoints. Usernames are optional, lowercase, and unique.';
COMMIT;
