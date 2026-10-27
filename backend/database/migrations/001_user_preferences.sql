-- Apply once in the team's Supabase SQL editor. This does not alter event data.
BEGIN;

CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    age_group TEXT CHECK (age_group IS NULL OR age_group IN
        ('20_29', '30_39', '40_49', '50_59', '60_69', '70_79', '80_plus')),
    budget TEXT CHECK (budget IS NULL OR budget IN
        ('free', 'under_25', '25_to_50', '50_to_100', '100_to_200', 'over_200')),
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.user_preference_tags (
    user_id UUID NOT NULL REFERENCES public.user_preferences(user_id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES public.tag(id) ON DELETE RESTRICT,
    PRIMARY KEY (user_id, tag_id)
);

-- These tables are served by FastAPI, not by the public Supabase Data API.
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preference_tags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_preferences, public.user_preference_tags FROM anon, authenticated;

COMMIT;
