# Weekly availability contract

This contract is implemented as frontend types, selector converters, and backend
validation, database migration, authenticated GET/PUT endpoints, and frontend
loading/saving. Recommendation ranking is not connected yet. The selector holds
a draft until Save schedule succeeds.

## Database setup

After team approval, run `backend/database/migrations/004_user_availability.sql`
in the Supabase SQL editor. It creates `public.user_availability`, with one row
per weekly range: `user_id`, `day_of_week`, `start_minute`, and `end_minute`.
The migration does not run automatically and has not been applied by the agent.

The composite primary key is `(user_id, day_of_week, start_minute)`. Checks enforce
valid days, half-hour boundaries, and increasing start/end times. Deleting an
auth user cascades to their ranges. RLS is enabled and access is revoked from
`anon` and `authenticated`; the authenticated FastAPI backend owns access.
The backend normalizes ranges and performs complete replacements atomically.
No rows represents an empty `windows` array; no separate status row
or configuration flag is needed.

## Authenticated API

Both routes use the existing Supabase access token in
`Authorization: Bearer <access-token>`. The backend takes the user ID from the
verified token; the request cannot choose another account.

- `GET /users/me/availability`: returns the current `{"windows": [...]}` in
  Sunday-to-Saturday/start-time order. A user with no rows gets `{"windows": []}`.
- `PUT /users/me/availability`: accepts the payload below and replaces all of the
  user's ranges in one transaction. Returns the canonical saved payload only
  after commit. `{"windows": []}` clears all ranges for that user.

Invalid payloads return 422 without writing. Missing or invalid authentication
returns 401/403. Database failures return 500 with a retry message; a failed PUT
rolls back the replacement and a failed GET never returns a misleading empty
schedule. Responses use `Cache-Control: private, no-store`.

PUT takes a per-user PostgreSQL transaction advisory lock before deleting rows,
so concurrent replacements cannot combine schedules, including when no rows
exist yet. Locks release on commit/rollback. This needs no additional table or
migration beyond `004_user_availability.sql`.

Restart the backend after updating the code. The routes are available in
`http://localhost:8000/docs` for authenticated manual testing.

## Payload

```json
{
  "windows": [
    { "day_of_week": 1, "start_minute": 540, "end_minute": 720 },
    { "day_of_week": 1, "start_minute": 900, "end_minute": 960 }
  ]
}
```

This means Monday 9 a.m.–noon and 3–4 p.m. Minutes are measured from local
midnight. There is no user-selected timezone field: all windows use Toronto
wall-clock time (`America/Toronto`), including its daylight saving rules.

| Field | Contract |
| --- | --- |
| `windows` | Required array; at most 336 windows before normalization. |
| `day_of_week` | Required integer: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6. |
| `start_minute` | Required integer, 0–1410, divisible by 30; inclusive. |
| `end_minute` | Required integer, 30–1440, divisible by 30; exclusive and greater than start. |

Unknown fields are rejected by the backend. Booleans, strings, and floats are
not accepted as integer values. API payloads do not contain selector cell IDs
or a user ID; future endpoints must derive ownership from the authenticated user.

## Normalization and boundaries

- Windows are sorted by day and start time. Adjacent, overlapping, or duplicate
  ranges merge within the same day. Gaps remain unavailable.
- A full day is `[0, 1440)`. The time `1440` belongs only to an end boundary; it
  does not create a slot at the start of the next day.
- Overnight availability must be split into two windows. For example Saturday
  11:30 p.m.–Sunday 1 a.m. becomes day 6 `[1410, 1440)` and day 0 `[0, 60)`.
- `{ "windows": [] }` means no availability preference: recommendations use
  interests without schedule-based ranking. This covers new users, users who
  skip availability, and users who clear their schedule.
- Saving replaces the complete set of ranges. Saving an empty grid
  clears the saved schedule preference. An untouched or abandoned draft does
  not change saved preferences. There is no interaction-tracking flag.

## Code entry points

- Frontend types: `frontend/src/api/availabilityTypes.ts`.
- Selector constants: `frontend/src/data/availability.ts`.
- Converters: `selectionToAvailability`, `availabilityToSelection`, and
  `normalizeAvailability` in `frontend/src/utils/availability.ts`.
- Frontend API: `frontend/src/api/availability.ts`; loading, draft, retry, and
  saving logic: `frontend/src/hooks/useAvailability.ts`.
- Backend schema: `WeeklyAvailability` in `backend/api/schemas/availability.py`.
  Used as the GET response and PUT request/response contract.
- Backend routes: `backend/api/routers/availability.py`; ORM table mapping:
  `backend/api/models/availability.py`.
- Recommendation weekday helper: `availability_day_of_week` in
  `backend/api/utils/availability.py`. It converts aware timestamps to Toronto
  before calculating Sunday=0. Dates and naive timestamps must already be local.

The backend recommendation implementation should read saved windows directly;
it should not depend on the frontend's 48-cell-per-day encoding. Availability is
intended as a ranking preference, not automatic exclusion. Empty windows leave
recommendations based on interests without an availability preference; unknown event times are not confirmed matches.
How to score partial overlaps and unknown end times remains an algorithm decision.

## Frontend behavior

Profile → Availability loads the signed-in user's saved ranges before showing
the editor. A failed read shows Retry availability and no editable empty grid.
The editor converts between cells and ranges using the contract above.

Save schedule submits the full draft with the current user's access token.
The button is highlighted only when the draft differs from the last loaded or
saved schedule. Returning to the original selection removes the highlight.
Space is reserved for feedback so a save confirmation does not resize the panel.
While saving, the save/clear buttons and cells are disabled to prevent conflicting
edits. Schedule saved is shown only after a successful response. An error retains
the draft and offers Retry save; editing clears the old feedback. Clear all is a
draft change until Save schedule succeeds, and saving an empty grid is allowed.

Requests are cancelled on unmount. The editor is keyed by account ID so logging
out or switching accounts discards the old account's in-memory state. Tokens are
obtained from the current session and checked against the editor's account ID.

## Validation

```sh
PYTHONPATH=backend python -m unittest discover -s backend/tests -p test_availability_contract.py -v
PYTHONPATH=backend python -m unittest discover -s backend/tests -p test_availability.py -v
```

Endpoint tests execute real inserts/deletes and rollbacks in isolated SQLite,
and verify locally signed JWTs using the current authentication helper. They do
not contact Supabase. PostgreSQL's advisory lock is recorded through a SQLite
test function; actual PostgreSQL concurrency is not exercised by this suite.

From `frontend`:

```sh
npm run test:availability
```

Browser tests intercept the API and verify save/reload, editing, clearing,
loading/saving errors, delayed save confirmation, and logout/login with separate
accounts. They do not write to Supabase. After applying migration 004 and starting
both servers, verify the live connection manually:

1. Log in, select separated ranges, and click Save schedule.
2. Reload and confirm the selections return.
3. Edit and save; reload again. Then Clear all, save, and reload.
4. Log out and log in to a different account. Confirm its schedule is independent.
