# Agent-Curated-Event-Discovery

## Frontend 
Dependencies:
- git
- NodeJS and NPM (https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

To run the frontend follow the steps below:
1. Clone this repo
``` bash 
git clone https://github.com/CSC392-CSC492-Building-AI-ML-systems/Agent-Curated-Event-Discovery.git
```
2. Run the following and open the localhost link:
```
cd frontend
npm install
npm run dev
```
3. To run the Playwright tests, run the following:
``` 
npx playwright test
npx playwright show-report
```
### Backend API client

The shared fetch functions are in `frontend/src/api/events.ts` and
`frontend/src/api/tags.ts`. They default to `http://localhost:8000`.
Create `frontend/.env` with `VITE_API_BASE_URL` and `VITE_MAPBOX_TOKEN` to configure
the API URL and Mapbox token locally, then restart Vite. The backend must allow the frontend's
origin through CORS for browser requests to work.

```ts
import { getEvents, getEvent } from './api/events';
import { getTags, getTag, getTagEvents } from './api/tags';

const controller = new AbortController();
const options = { signal: controller.signal };
const events = await getEvents({ skip: 0, limit: 20, ...options });
const tags = await getTags(options);
// Detail requests use IDs returned by the API:
if (events.length) {
  const event = await getEvent(events[0].id, options);
}
if (tags.length) {
  const tag = await getTag(tags[0].id, options);
  const tagEvents = await getTagEvents(tag.id, options);
}
// Call controller.abort() when a component unmounts or its query changes.
```

These functions return backend field names and throw on failed requests; callers handle loading,
errors, and conversion to UI fields. Discover now loads `/events` through
`useEvents` and `loadEventCatalog`, which retrieve all pages and adapt them for
Discover, Your Events, and tag pages. Map still uses its separate mock events.
Search, date filters, and sorting run locally over the fetched catalog.
Only `/events` currently supports pagination (`skip`, `limit`);
search, filtering, and sorting parameters are not implemented by the backend.

Use `toEventideEvent` from `frontend/src/api/adapters.ts` when passing API data
to the UI: `const events = (await getEvents()).map(toEventideEvent)`.
The adapter retains tag IDs and maps names into `categories` for existing components.
It normalizes timestamps to ISO instants; display helpers show them in Toronto time.
Timestamps without an offset are interpreted as Toronto local time. Ambiguous
fall-back times and nonexistent spring-forward times must include an explicit
offset from the API. Venue IDs are retained without inventing addresses or coordinates.

The backend allows `http://localhost:5173` and `http://127.0.0.1:5173` by default.
For another frontend port, set `FRONTEND_ORIGINS` to a comma-separated list of
allowed origins when starting the backend. Restart the backend after changes.

### Calendar events

Saved events and calendar events are independent. The bookmark keeps an event
in **Saved**; the **+** button beside it adds the event to **Your Calendar** and
becomes **−** to remove it. Removing a bookmark does not remove a calendar entry,
and removing a calendar entry does not remove its bookmark.

Before using the calendar API, apply
`backend/database/migrations/002_event_calendar.sql` in the Supabase SQL editor,
then restart the backend. The migration creates `public.event_calendar` and
does not copy or modify existing saved events. Existing bookmarks stay saved;
calendar membership starts empty. FastAPI's database connection needs access
to this table and must bypass its RLS, as with the preferences tables.

The authenticated API is:

- `GET /users/me/calendar?skip=0&limit=100` — list the current user's calendar events.
- `PUT /users/me/calendar` with `{ "id": 123 }` — add an event, idempotently.
- `DELETE /users/me/calendar` with `{ "id": 123 }` — remove an event, idempotently.

All requests require `Authorization: Bearer <Supabase access token>`; the user ID
comes from the verified token. Calendar actions do not affect like/save counts.
Calendar membership persists across reloads. Failed requests leave the calendar
unchanged and display an error. The calendar screen supports retry if loading
fails.

Conflict notifications compare calendar entries only, after a successful addition.
ICS export downloads calendar entries only as `eventide-events.ics`.

Validate with `npm run test:scheduling` from `frontend`, and
`PYTHONPATH=backend python -m unittest discover -s backend/tests -p test_calendar.py -v`
from the project root. Tests use isolated data and do not apply the migration to
the shared database.

### iCal subscriptions

**Subscribe to calendar** beside **Export events** opens the subscription dialog.
It can create a private link, copy it, or disable the subscription with
confirmation. To generate a new link, disable the subscription and enable it again. The feed contains **calendar entries**, not bookmarks or
external Google appointments. The existing download remains a one-time snapshot.

Setup, after the tables are approved:

1. Install the backend dependencies with `python -m pip install -r backend/requirements.txt`.
   The feed formatter uses `icalendar==7.3.0`.
2. Apply `002_event_calendar.sql`, then
   `backend/database/migrations/003_calendar_subscription.sql` in Supabase.
   The latter creates `public.calendar_subscription`; only a SHA-256 hash of
   each user's randomly generated feed token is stored. These scripts are not
   applied automatically.
3. Set `CALENDAR_FEED_BASE_URL=http://localhost:8000` in the root `.env` for local
   testing (this is also the default). For external subscriptions, use the
   public HTTPS backend URL, including an API path prefix if applicable.
4. Restart the backend. No Google OAuth credentials or Google API keys are needed.

Authenticated subscription-management endpoints:

- `GET /users/me/calendar-subscription` returns `{ "enabled": false, "created_at": null }`
  or the active subscription's status and creation time. It never returns a token.
- `POST /users/me/calendar-subscription` creates or replaces the link, returning
  `enabled`, `created_at`, and `subscription_url`. Replacement revokes the old
  link only after the transaction succeeds.
- `DELETE /users/me/calendar-subscription` disables it and returns HTTP 204.

These management endpoints require a Supabase user access token. The private
`GET /calendar/feeds/{token}/eventide-events.ics` endpoint instead uses the feed
token in its URL, allowing calendar apps to fetch it without a login cookie or
Supabase session. Invalid/revoked links return 404. Empty calendars return valid
ICS; database failures return 503 rather than an empty feed. Feed responses are
not cached by Eventide. Calendar apps may still retain and refresh their own
copies on their own schedules.

Copy a generated link before closing the dialog. The raw token is not stored,
so after reopening the dialog, users can see status but must disable and re-enable
the subscription if they have lost the link. Existing subscribers must use the new link.
Anyone with the link can read the feed. Revoking a link
stops future access; it does not erase already downloaded copies. Uvicorn access
logging redacts feed tokens; configure any external proxy/access logs to redact
these paths too.

The feed exports timed events in UTC using Toronto's timezone, date-only events
as all-day entries with exclusive end dates, available venue information, and
stable event IDs. Events without start dates are omitted. Known start times
without end times are kept without guessing an end. Additions, source-event
edits, and removals are reflected on the next feed request.

Local validation:

```bash
PYTHONPATH=backend python -m unittest discover -s backend/tests -p 'test_calendar*.py' -v
```

Run `npm run test:scheduling` from `frontend` for calendar and subscription UI
tests. These tests use isolated SQLite and mocked browser responses, not the
shared Supabase database. Real Google/Apple/Outlook subscription testing is
deferred until a publicly reachable HTTPS backend (or development tunnel) is
available. Google cannot fetch localhost; on its desktop website, add the public
feed via **Other calendars → + → From URL**. Refresh timing is controlled by the
calendar app, so updates are not guaranteed to be immediate.

### User preferences API

The backend now supports `GET /users/me`, `GET /users/me/preferences`, and
`PUT /users/me/preferences`. All require a Supabase **user access token**, sent
as `Authorization: Bearer <access_token>`. A publishable API key is not a user
access token. The user ID comes from the verified token and cannot be supplied
in the request body.

Setup:

1. Install the backend requirements, including `PyJWT[crypto]`.
2. Add `SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co` to the **root `.env`**
   alongside `DATABASE_URL`. Use the same project as the frontend's
   `VITE_SUPABASE_URL`. No signing secret or service-role key is needed.
   Verification supports Supabase's ES256 and RS256 asymmetric signing keys.
3. Have the database owner apply
   `backend/database/migrations/001_user_preferences.sql` in the Supabase SQL
   editor. This creates two tables, references `auth.users` and the existing
   `public.tag`, and disables direct access by Supabase's public Data API roles.
   FastAPI's database connection must have access to these tables and bypass
   their RLS (the existing postgres connection can do this). No migration runs
   automatically at server startup.
4. Restart the backend. `/docs` has an **Authorize** button for testing with
   a signed-in user's access token.

`PUT /users/me/preferences` replaces the complete set of preferences:

```json
{
  "age_group": "20_29",
  "budget": "under_25",
  "interest_tag_ids": [1, 5, 12]
}
```

All three fields are required. Age and budget accept `null` when skipped.
Allowed age groups are `20_29`, `30_39`, `40_49`, `50_59`, `60_69`, `70_79`,
and `80_plus`. Allowed budgets are `free`, `under_25`, `25_to_50`, `50_to_100`,
`100_to_200`, and `over_200`. These represent typical per-event spending in CAD,
not an enforced spending cap: `free` means zero, `under_25` means above zero and
below 25, the middle bands include their lower bound and exclude their upper
bound, and `over_200` means 200 or more. Interest IDs must be distinct positive
integers, must exist in `/tags`, and must contain at least one selection.
Unknown fields (including a client-supplied user ID or completion flag) are rejected.

A successful save returns HTTP 200 with the saved fields, sorted interest IDs,
and `onboarding_completed: true`. Saving again updates the same user's profile;
old interest selections are replaced in the same transaction. For a user with
no profile, GET returns:

```json
{
  "age_group": null,
  "budget": null,
  "interest_tag_ids": [],
  "onboarding_completed": false
}
```

Errors: 401 for missing/invalid/expired sessions, 422 for invalid preferences,
503 for unavailable or unconfigured authentication, and 500 if saving fails.
Failed writes roll back without changing existing preferences. CORS permits
the authenticated JSON PUT from configured frontend origins.

The onboarding UI loads real `/tags` options and these saved preferences after
login. It submits stable age/budget values and tag IDs with the current session's
access token. Skipped answers are `null`. The curation screen stays visible for
at least three seconds on success, and longer if the save is still pending.
A failed save keeps the answers for retry. Completion is
shown only after a successful response. Saving preferences does not generate
recommendations.

The shared Supabase session provider restores login on reload and responds to
sign-in, token refresh, and logout. The header shows Profile and Log out for
signed-in users. `/profile` displays stored preferences and links back to edit
them. Discover's For You is hidden for signed-out users, shows an onboarding
prompt for incomplete profiles, and acknowledges saved preferences for completed
profiles. Recommendation generation is still pending. Preferences and local
saved/followed selections are scoped to the active account, so switching accounts
does not display the previous user's selections.

Frontend auth requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in
`frontend/.env`; restart Vite after changing them. Use the same Supabase project
as the backend. Both providers fetch data only after a session is available;
the page provides loading and retry states instead of guessing completion status
when the preferences request fails.

Browser integration tests use a separate Vite server with fake Supabase
credentials and intercepted API responses, never live accounts or database
writes. They cover reload persistence, account isolation, skips, saving/retry,
and dynamic tags:

```bash
cd frontend
npx playwright install chromium --only-shell
npm run test:onboarding
```

For live verification, log in, finish onboarding, reload `/profile`, and check
that the stored answers return. Log out and use a second account to verify its
profile starts independently. This requires the migration and configuration
above; the isolated browser tests alone do not verify your Supabase deployment.


## INFO
I'm just putting this here so we have it, info for running Playwright tests.

Playwright Test project at `\Agent-Curated-Event-Discovery\frontend`

Inside that directory, you can run several commands:

  npx playwright test
    Runs the end-to-end tests.

  npx playwright test --ui
    Starts the interactive UI mode.

  npx playwright test --project=chromium
    Runs the tests only on Desktop Chrome.

  npx playwright test example
    Runs the tests in a specific file.

  npx playwright test --debug
    Runs the tests in debug mode.

  npx playwright codegen
    Auto generate tests with Codegen.

We suggest that you begin by typing:

    npx playwright test

And check out the following files:
  - .\tests\example.spec.ts - Example end-to-end test
  - .\playwright.config.ts - Playwright Test configuration

Visit https://playwright.dev/docs/intro for more information.

### Environment File Frontend Requirements Agent-Curated-Event-Discovery/frontend/.env
```ts
VITE_MAPBOX_TOKEN=
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

### Environment File Backend Requirements Agent-Curated-Event-Discovery/.env 
```ts
GEMINI_API_KEY=
GOOGLE_MAPS_API_KEY= 
BROWSERBASE_API_KEY=
DATABASE_URL=
DATABASE_URL_SYNC=
TYPESAFE_API_KEY=
SUPABASE_URL=
CALENDAR_FEED_BASE_URL=http://localhost:8000
```

### SQL script for deduplication
```with cte as (select id, name, startdate, enddate, locationname, inserteddate, row_number() over (partition by name, startdate, enddate, locationname order by inserteddate desc) as rn from togatherevent)
delete from togatherevent using cte where togatherevent.id = cte.id and rn > 1;
```

### Weekly availability contract

The availability selector uses Sunday=0 through Saturday=6, with Toronto-local
30-minute ranges and exclusive end times. Adjacent selections merge into ranges;
separate selections remain separate. The frontend and backend contract, examples,
and recommendation handoff are documented in [docs/weekly-availability.md](docs/weekly-availability.md).
The storage migration is `backend/database/migrations/004_user_availability.sql`;
apply it in Supabase after team approval. Authenticated
`GET /users/me/availability` reads ranges and `PUT /users/me/availability`
replaces them atomically. Both return `{"windows": [...]}`; an empty array clears
the schedule preference. Restart the backend for the new routes. Profile's
Availability editor restores saved ranges and submits them through Save schedule,
with loading, saving, confirmation, and retry states. Recommendation integration
is the remaining step; empty schedules add no availability preference.

### Profile settings

The profile overview includes an avatar placeholder, name/username, and
existing event preferences. The profile pencil opens inline first-name,
last-name, and username fields; the check saves changes and Escape discards edits.
The form loads and saves through authenticated `GET` and `PUT /users/me/profile`.
PUT replaces all three fields: `first_name`, `last_name`, and `username` (each
nullable). Responses contain these fields plus `updated_at` (null before the
first save). A new account starts with empty profile details; existing auth
metadata is not automatically copied into the profile table.

Names are trimmed, optional, and at most 100 characters. Usernames are optional,
trimmed, stored lowercase, and restricted to 3–30 ASCII letters, numbers, or
underscores. The database enforces unique usernames; blank usernames become null.
A duplicate returns HTTP 409 with `{"detail":"This username is already taken."}`;
invalid input returns HTTP 422. Requests cannot specify another user's ID: the
backend derives ownership from the verified access token. Failed saves retain
the form's draft and allow retry; changes appear only after a successful save.

The preferences pencil opens the existing onboarding editor, which retains its
current persistence behavior. Profile navigation includes availability, account
security, liked/saved events, Your Calendar, and a disabled Friends placeholder.
Security forms and photo uploads are not implemented.

**Setup:** Apply `backend/database/migrations/005_user_profile.sql` in Supabase,
then restart the backend. This creates `public.user_profile`, enables RLS, and
restricts direct public-client access. No new dependencies or environment
variables are required; use the existing backend database/Supabase configuration
and frontend API/Supabase configuration.

Run `npm run test:profile` from `frontend` for desktop/mobile profile interaction
checks, including persistence, account isolation, duplicate usernames, and failed
saves. From `backend`, run `python -m unittest discover -s tests -p test_profile.py`
for isolated database/API tests. These tests use SQLite and locally signed JWTs;
they do not apply the migration or verify concurrent writes on live PostgreSQL.
