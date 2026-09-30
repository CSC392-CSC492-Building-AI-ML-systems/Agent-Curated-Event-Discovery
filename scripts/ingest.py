import requests
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
TOGATHER_URL = "https://staging.toronto.togather.foundation/api/v1/events"

def fetch_page(after=None):
    params = {}

    if after:
        params["after"] = after

    response = requests.get(TOGATHER_URL, params=params, timeout=5)

    response.raise_for_status()

    return response.json()


def upsert_event(cur, event):
    location = event.get("location") or {}

    cur.execute(
        """
        INSERT INTO Event (
            id,
            name,
            description,
            startDate,
            endDate,
            locationName
        )
        VALUES (
            %(id)s,
            %(name)s,
            %(description)s,
            %(startDate)s,
            %(endDate)s,
            %(locationName)s
        )
        ON CONFLICT (id)
        DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            startDate = EXCLUDED.startDate,
            endDate = EXCLUDED.endDate,
            locationName = EXCLUDED.locationName;
        """,
        {
            "id": event.get("@id"),
            "name": event.get("name"),
            "description": event.get("description"),
            "startDate": event.get("startDate"),
            "endDate": event.get("endDate"),
            "locationName": location.get("name"),
        },
    )


def ingest():
    after = None
    page_number = 1
    total_events = 0

    with psycopg2.connect(DATABASE_URL) as conn:
        while True:
            print(f"page {page_number}")

            data = fetch_page(after)

            events = data.get("items", [])

            # for event in events:
            #     print(event)
            
            print(f"got {len(events)} events")

            with conn.cursor() as cur:
                cur.execute("SET search_path TO eventsthing;")
                for event in events:
                    upsert_event(cur, event)

            conn.commit()
        
            total_events += len(events)

            after = data.get("next_cursor")

            if not after:
                break

            page_number += 1

    print(f"finished, {total_events} events")

if __name__ == "__main__":
    ingest()