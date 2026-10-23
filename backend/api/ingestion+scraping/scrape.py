from browserbase import Browserbase
from dotenv import load_dotenv
import os
from backend.api.models.event import TogatherEvent
from sqlalchemy import select, update, func
from database import SessionLocal
from event_insertion import insert_event
from helpers import enhance_description, valid_event
from datetime import datetime

load_dotenv()
bb = Browserbase(api_key=os.environ["BROWSERBASE_API_KEY"])

"""def get_events():
    with SessionLocal() as session:
        stmt = (select(TogatherEvent)).where(TogatherEvent.scrapeddate == None).order_by(TogatherEvent.inserteddate).limit(400)
        # stmt = select(TogatherEvent).limit(20).r  # Use during testing to query all Togather events not just ones from today
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
        return events_dict"""


def get_events(limit: int=400):
    """
    Pull Togather events from the DB and group togather duplicates that have the same 'name', 'description', and 'location'
    but different start/end dates (making them different events of the same type).

    :param upper limit on the number of events read from the database that you want returned in the list.
    :return List of deduplicated Togather events
    """
    with SessionLocal() as session:
        stmt = (select(TogatherEvent)).where(TogatherEvent.scrapeddate == None).order_by(TogatherEvent.inserteddate)
        events = session.execute(stmt).scalars().all()
        grouped_events = {}
        for event in events:
            key = (event.name, event.description, event.location)
            if key not in grouped_events:
                grouped_events[key] = {"ids": [event.id],
                                      "name": event.name,
                                      "description": event.description,
                                      "locationname": event.locationname,
                                      "dates": []}
        date_pair = {"start_date": event.startdate, "end_date": event.enddate}
        if date_pair not in grouped_events[key]["dates"]:
            grouped_events[key]["dates"].append(date_pair)
        return list(grouped_events.values())


def scrape():
    date_string = datetime.now().strftime("%Y-%m-%d")
    events = get_events()
    # print(f"events: {events}") list(my_dict.values())
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
                        print("Fetched")
                        cleaned_event = enhance_description(event, fetch_response.content, result.url)
                        print("Cleaned")
                        if cleaned_event is not None:
                            insert_event(cleaned_event)
                            with SessionLocal() as session:
                                stmt = (update(TogatherEvent)).where(TogatherEvent.id==event["id"]).values(scrapeddate=date_string)
                                session.execute(stmt)
                                session.commit()
                            break
                except Exception as e:
                    print(result)
                    print(e)
                    #break
            #pass

if __name__ == "__main__":
    scrape()
