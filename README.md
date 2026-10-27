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

Isolated tests (SQLite storage and locally signed tokens; no Supabase access):

```bash
PYTHONPATH=backend python -m unittest discover -s backend/tests -p test_preferences.py -v
```

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
```

### SQL script for deduplication
```with cte as (select id, name, startdate, enddate, locationname, inserteddate, row_number() over (partition by name, startdate, enddate, locationname order by inserteddate desc) as rn from togatherevent)
delete from togatherevent using cte where togatherevent.id = cte.id and rn > 1;
```
