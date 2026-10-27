from database import SessionLocal
from sqlalchemy import insert, select, func, cast, Time
from sqlalchemy.dialects.postgresql import insert as pg_insert
from backend.api.models.event import Event, Venue, Organizer, Tag, event_tags
from helpers import get_coordinates
from typing import Optional

def insert_event(event: dict):
    """
    Insert this event and its related information into the database.
    :param event:
    :return:
    """
    # extract the data from the dictionary
    name = event.get("name", "")
    description = event.get("description", "")
    venue_id = find_or_create_venue(event.get("venue", ""), event.get("address", ""))
    organizer_id = find_or_create_organizer(event.get("organizer", ""), event.get("email", None), event.get("phone", None),
                                         event.get("website", None), event.get("instagram", None), event.get("facebook", None),
                                         event.get("twitter", None), event.get("linkedin", None), event.get("tiktok", None))
    price = event.get("price", None)
    link = event.get("link", None)
    eighteenplus = event.get("eighteen_plus", False)
    tags = event.get("tags", [])
    togathereventid = event.get("id")
    with SessionLocal() as session:
        for occurrance in event.get("dates", []):
            startdate = occurrance.get("startdate", None)
            enddate = occurrance.get("enddate", None)
            starttime = occurrance.get("starttime", None)
            endtime = occurrance.get("endtime", None)
            # check if the event is already in the database
            stmt = select(Event.id).where(Event.name == name,
                                          Event.startdate == func.to_date(startdate, 'YYYY-MM-DD'),
                                          Event.enddate == func.to_date(enddate, 'YYYY-MM-DD'),
                                          Event.starttime == cast(starttime, Time),
                                          Event.endtime == cast(endtime, Time) if endtime is not None else Event.endtime.is_(None),
                                          Event.venue == venue_id,
                                          Event.organizer == organizer_id)
            event_id = session.execute(stmt).scalar_one_or_none()
            if event_id is None:
                stmt = insert(Event).values(name=name, description=description,
                                            startdate=func.to_date(startdate, 'YYYY-MM-DD'),
                                            enddate=func.to_date(enddate, 'YYYY-MM-DD'),
                                            starttime=cast(starttime, Time),
                                            endtime=cast(endtime, Time),
                                            venue=venue_id,
                                            organizer=organizer_id, price=price, link=link,
                                            eighteenplus=eighteenplus,
                                            togathereventid=togathereventid
                                            ).returning(Event.id)
                event_id = session.execute(stmt).scalar_one()
            insert_event_tags(session, event_id, tags)
        session.commit()


# TODO: will need to use google maps api to get the longitude and latitude of the venue
def find_or_create_venue(name: str, address: str) -> int:
    """
    Get this venue from the database if it exists. Otherwise create it and return its id.
    :return:
    """
    coordinates = None
    if address is not None and address != '' and address.upper() != "ONLINE" and address.upper() != "VIRTUAL":
        coordinates = get_coordinates(address)
    with SessionLocal() as session:
        if not coordinates:
            # check for address in the db and insert if its not there
            stmt = select(Venue.id).where(Venue.name == name, Venue.address == address)
            venue_id = session.execute(stmt).scalar_one_or_none()
            if venue_id is not None:
                return venue_id
            stmt = (insert(Venue).values(name=name, address=address)).returning(Venue.id)
            venue_id = session.execute(stmt).scalar_one()
            session.commit()
            return venue_id
        point = func.ST_SetSRID(func.ST_MakePoint(coordinates[0], coordinates[1]), 4326).cast(Venue.coordinates.type)
        stmt = select(Venue.id).where(func.ST_DWithin(Venue.coordinates, point, 2))
        venue_id = session.execute(stmt).scalar_one_or_none()
        if venue_id is not None:
            return venue_id
        stmt = (insert(Venue).values(name=name, address=address, coordinates=point).returning(Venue.id))
        venue_id = session.execute(stmt).scalar_one()
        session.commit()
        return venue_id


def find_or_create_organizer(name: str, email: Optional[str], phone: Optional[str], website: Optional[str],
                             instagram: Optional[str], facebook: Optional[str], twitter: Optional[str],
                             linkedin: Optional[str], tiktok: Optional[str]) -> int:
    """
    Get this organizer from the database if it exists. Otherwise create it and return its id.
    :param name:
    :param email:
    :param phone:
    :param website:
    :param instagram:
    :param facebook:
    :param twitter:
    :param linkedin:
    :param tiktok:
    :return:
    """
    with SessionLocal() as session:
        stmt = None
        if email:  
            stmt = select(Organizer.id).where(Organizer.email == email)
        else:
            stmt = select(Organizer.id).where(Organizer.name == name)
        organizer_id = session.execute(stmt).scalars().first()
        print(f"id: {organizer_id}")
        if organizer_id is not None:            
            stmt = pg_insert(Organizer).values(id=organizer_id, name=name, email=email, phone=phone, website=website, instagram=instagram,
                        facebook=facebook, twitter=twitter, linkedin=linkedin, tiktok=tiktok)
            stmt = stmt.on_conflict_do_update(
                        index_elements=["id"],
                        set_={
                            c: func.coalesce(
                                func.nullif(getattr(Organizer, c), ""),   
                                func.nullif(stmt.excluded[c], ""),        
                                getattr(Organizer, c),                    
                            )
                            for c in ["name", "email", "phone", "website", "instagram", "facebook", "twitter", "linkedin", "tiktok"]
                        },
                    )
            session.execute(stmt)
        else:
            stmt = (insert(Organizer).values(name=name, email=email, phone=phone, website=website, instagram=instagram,
                                         facebook=facebook, twitter=twitter, linkedin=linkedin, tiktok=tiktok)).returning(Organizer.id)
            organizer_id = session.execute(stmt).scalar_one()
        session.commit()
        return organizer_id


def insert_event_tags(session, event_id: int, tags: list[str]):
    """
    Insert the event-tag pairs into the joint table.
    :param ensure tag is written in same transaction as event with <session>, instead of opening a new session
           which caused issues since event wasn't recorded yet, erroring when event tag was inserted into the joint table.
    :param event_id:
    :param tags:
    :return:
    """
    """tags = get_tags_by_names(tags)
    with SessionLocal() as session:
        for tag in tags:
            stmt = insert(event_tags).values(eventid=event_id, tagid=tag)
            session.execute(stmt)
            session.commit()"""
    tag_ids = get_tags_by_names(tags)
    for tag_id in tag_ids:
        stmt = insert(event_tags).values(eventid=event_id, tagid=tag_id)
        session.execute(stmt)

def get_tags_by_names(names: list[str]) -> list[int]:
    """
    Get the ids of all tags in names.
    :param names:
    :return:
    """
    with SessionLocal() as session:
        stmt = select(Tag.id).where(Tag.name.in_(names))
        return session.execute(stmt).scalars().all()
