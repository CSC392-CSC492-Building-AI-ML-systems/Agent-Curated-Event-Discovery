-- Apply in the team's Supabase SQL editor once approved.
-- Weekly ranges use Toronto local time, not UTC timestamps.
-- No rows for a user means no availability preference.
BEGIN;

CREATE TABLE IF NOT EXISTS public.user_availability (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_minute SMALLINT NOT NULL CHECK (
        start_minute BETWEEN 0 AND 1410 AND start_minute % 30 = 0
    ),
    end_minute SMALLINT NOT NULL CHECK (
        end_minute BETWEEN 30 AND 1440 AND end_minute % 30 = 0
    ),
    CHECK (end_minute > start_minute),
    PRIMARY KEY (user_id, day_of_week, start_minute)
);

COMMENT ON TABLE public.user_availability IS
    'Weekly availability in America/Toronto. No rows means no schedule preference. Served through authenticated FastAPI endpoints.';
COMMENT ON COLUMN public.user_availability.day_of_week IS
    'Sunday = 0 through Saturday = 6.';
COMMENT ON COLUMN public.user_availability.start_minute IS
    'Inclusive minutes after local midnight, in 30-minute increments.';
COMMENT ON COLUMN public.user_availability.end_minute IS
    'Exclusive minutes after local midnight; 1440 is the end of the day. Overnight ranges must be split.';

-- The primary key also supports fetching all ranges for a user in order.
-- FastAPI will merge overlapping/adjacent ranges and replace the schedule
-- in a transaction. Public Supabase clients cannot read or modify these rows.
ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_availability FROM anon, authenticated;

COMMIT;
