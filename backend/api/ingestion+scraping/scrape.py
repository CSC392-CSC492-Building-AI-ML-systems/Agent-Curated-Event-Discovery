from browserbase import Browserbase
from dotenv import load_dotenv
import os
from backend.api.models.event import TogatherEvent
from sqlalchemy import select, func
from datetime import date
from database import SessionLocal
from event_insertion import insert_event
from helpers import enhance_description, valid_event

load_dotenv()
bb = Browserbase(api_key=os.environ["BROWSERBASE_API_KEY"])

def get_events():
    with SessionLocal() as session:
        stmt = (select(TogatherEvent).where(TogatherEvent.inserteddate==func.to_date(date.today().isoformat(), 'YYYY-MM-DD')))
        # stmt = select(TogatherEvent)  # Use during testing to query all Togather events not just ones from today
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
        if valid_event(event):  # Only proceed if <event> is assessed as likely to be an event
            if event["locationname"] is None:
                event["locationname"] = ""

            search_response = bb.search.web(
                query=f"{event['name']}, {event['locationname']}",
                num_results=5,
            )

            for result in search_response.results:
                try:
                    fetch_response = bb.fetch_api.create(url=result.url, format='markdown')
                    if fetch_response.status_code == 200:
                        cleaned_event = enhance_description(event, fetch_response.content, result.url)
                        if cleaned_event is not None:
                            insert_event(cleaned_event)
                            break
                except Exception as e:
                    print(result)
                    print(e)


if __name__ == "__main__":
    scrape()
