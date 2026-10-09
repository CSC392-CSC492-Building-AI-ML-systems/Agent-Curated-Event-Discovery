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
