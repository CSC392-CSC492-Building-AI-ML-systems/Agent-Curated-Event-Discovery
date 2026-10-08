from browserbase import Browserbase
from dotenv import load_dotenv
import os
from backend.api.models.event import TogatherEvent
from sqlalchemy import select, func
from datetime import date
from database import SessionLocal
from event_insertion import insert_event

load_dotenv()
bb = Browserbase(api_key=os.environ["BROWSERBASE_API_KEY"])

def get_events():
    with SessionLocal() as session:
        stmt = (select(TogatherEvent).where(TogatherEvent.inserteddate==func.to_date(date.today().isoformat(), 'YYYY-MM-DD')))
        events = session.execute(stmt).scalars().all()
        events_dict = [
            {
                "id": event.id,
                "name": event.name,
                "description": event.description,
                "startdate": event.startdate,
                "enddate": event.enddate,
                "locationname": event.locationname,
            }
            for event in events
        ]
        return events_dict

def scrape():
    events = get_events()
    for event in events:
        if event["locationname"] is None:
            event["locationname"] = ""

        search_response = bb.search.web(
            query=f"{event["name"]}, {event["locationName"]}",
            num_results=5,
        )

        for result in search_response.results:
            fetch_response = bb.fetch_api.create(url=result.url, format='markdown')
            if fetch_response.status_code == 200:
                # TODO: send the response and event to the llm
                # TODO: if the llm is able to generate the event object, then break out of the loop
                pass

if __name__ == "__main__":
    scrape()
