from database import SessionLocal
from sqlalchemy import insert

def insert_event(event: dict):
    """
    Insert this event and its related information into the database.
    :param event:
    :return:
    """
    pass

# TODO: will need to use google maps api to get the longitude and latitude of the venue
def find_or_create_venue(name: str, address: str, longitude: float, latitude: float) -> int:
    """
    Get this venue from the database if it exists. Otherwise create it and return its id.
    :return:
    """
    pass

def find_or_create_organizer(name: str, contact: str, socials: str) -> int:
    """
    Get this organizer from the database if it exists. Otherwise create it and return its id.
    :param name:
    :param contact:
    :param socials:
    :return:
    """
    pass

def insert_event_tags(event_id: int, tags: list[int]):
    """
    Insert the event-tag pairs into the joint table.
    :param event_id:
    :param tags:
    :return:
    """

def get_tags_by_names(names: list[str]) -> list[int]:
    """
    Get the ids of all tags in names.
    :param names:
    :return:
    """
