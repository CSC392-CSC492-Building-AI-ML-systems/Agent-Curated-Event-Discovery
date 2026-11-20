import requests
from dotenv import load_dotenv
import os
from backend.api.models.event import TogatherEvent
from .database import SessionLocal
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import func
from datetime import date
from dateutil.relativedelta import relativedelta


load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
TOGATHER_URL = "https://staging.toronto.togather.foundation/api/v1/events"


def fetch_page(after=None):
    params = {"context": "document", "limit": 200}

    today = date.today()
    future_date = today + relativedelta(months=+2)
    params["startDate"] = today.isoformat()
    params["endDate"] = future_date.isoformat()

    if after:
        params["after"] = after

    response = requests.get(TOGATHER_URL, params=params, timeout=5)

    response.raise_for_status()

    return response.json()


def ingest():
    after = None
    page_number = 1
    total_events = 0

    while True:
        print(f"page {page_number}")

        data = fetch_page(after)

        events = data.get("items", [])

        print(f"got {len(events)} events")

        values = []
        for event in events:
            location = event.get("location", {})
            
            address = location.get("address", {})
            print(f"address: {address}")
            if location.get("@type", "") == "VirtualLocation":
                location["name"] = "Virtual"
                address["streetAddress"] = location.get("url", {})
                
            latitude = location.get("geo", {}).get("latitude")
            longitude = location.get("geo", {}).get("longitude")
            if latitude:
                latitude = float(latitude)
            if longitude:
                longitude = float(longitude)
            values.append(
                {
                    "id": event.get("@id"),
                    "name": event.get("name"),
                    "description": event.get("description"),
                    "startdate": event.get("startDate"),
                    "enddate": event.get("endDate"),
                    "locationname": location.get("name"),
                    "locationaddress": address.get("streetAddress", None),
                    "city": address.get("addressLocality", None),
                    "locationpostalcode": address.get("postalCode", None),
                    "latitude": latitude,
                    "longitude": longitude,
                }
            )

        with SessionLocal() as session:
            if values:
                stmt = (insert(TogatherEvent).values(values))
                stmt = stmt.on_conflict_do_update(
                    index_elements=["id"],
                    set_={
                        c: func.coalesce(
                            func.nullif(getattr(TogatherEvent, c), "") if (c != "latitude" and c != "longitude") else getattr(TogatherEvent, c),
                            func.nullif(stmt.excluded[c], "") if (c != "latitude" and c != "longitude") else stmt.excluded[c],
                            getattr(TogatherEvent, c),
                        )
                        for c in ["name", "description", "startdate", "enddate", "locationname", "locationaddress", "city", "locationpostalcode", "latitude", "longitude"]
                    },
                )
                session.execute(stmt)
                session.commit()

        total_events += len(events)

        after = data.get("next_cursor")

        if not after:
            break

        page_number += 1

    print(f"finished, {total_events} events")


if __name__ == "__main__":
    ingest()