from ..db.database_sync import SessionLocal
from sqlalchemy import select, func, union_all, literal, extract, text, or_
from sqlalchemy.orm import selectinload
from ..models.event import Event, Tag, Venue
from ..models.user_actions import EventLiked, EventSaved
from ..models.analytics import EventClicked, EventPopular, EventTrending
from ..models.preferences import UserPreferences, UserPreferenceTag
from ..models.friendships import Friendship
from ..models.profile import UserProfile
from datetime import datetime, timedelta, timezone
from google import genai
from google.genai import types
import os
import json

gemini = genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def generate_description(event: dict, data: dict):
    """
    This function takes the event details as well as user data, and calls gemini to generate a
    description of why the user would like the event based on the information given.
    """
    prompt = f"""Here is information about this event which was recommended for the user {event}. Here is some data 
    about the user {data}. Keep in mind that friends saved event gives the user's friends who have saved the event.
    Return a JSON object with the following keys:
    - "description": A 3-5 sentence summary of why the user would enjoy the event. The description should feel like you 
    are a friend recommending the event to the user.
    """

    # argument 3 forces gemini to return a valid and parseable JSON string over text or markdown
    response = gemini.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json")
    )
    try:
        dictionary = json.loads(response.text)
        if isinstance(dictionary, list):  # if returned a JSON wrapped in list
            dictionary = dictionary[0] if dictionary else {}
        return dictionary  # returns the json as a python dictionary
    except (json.JSONDecodeError, TypeError):
        return None

def generate_description_for_recommended_event(event_id, user_id):
    with SessionLocal() as session:
        # get event from database
        stmt = select(Event).options(selectinload(Event.tags)).where(Event.id == event_id)
        event = session.execute(stmt).scalars().first()
        # haven't added organizer or venue stuff yet
        # will add it if recommendation algorithm takes it into consideration
        event = {"id": event.id, "name": event.name, "description": event.description,
                   "startdate": event.startdate, "enddate": event.enddate, "price": event.price,
                   "eighteenplus": event.eighteenplus, "tags": [tag.name for tag in event.tags], "clicks": event.clicks,
                   "likes": event.likes, "saves": event.saves}
        # get user preferences from database
        stmt = select(UserPreferences.age_group, UserPreferences.budget).where(UserPreferences.user_id == user_id)
        preferences = session.execute(stmt).scalars().first()
        preferences = {"age_group": preferences[0], "budget": preferences[1]}
        # get the tags the user follows from database
        stmt = select(Tag.name).join(UserPreferenceTag, Tag.id == UserPreferenceTag.tag_id).where(UserPreferenceTag.user_id == user_id)
        tags = session.execute(stmt).scalars().all()
        # get the 5 most recently saved events by the user from database
        stmt = (select(Event).join(EventSaved, Event.id == EventSaved.event_id).where(EventSaved.user_id == user_id).order_by(EventSaved.timestamp.desc()).limit(5))
        recently_saved_events = session.execute(stmt).scalars().all()
        recently_saved_events = [{"id": event.id, "name": event.name, "description": event.description,
                   "startdate": event.startdate, "enddate": event.enddate, "price": event.price,
                   "eighteenplus": event.eighteenplus, "tags": [tag.name for tag in event.tags], "clicks": event.clicks,
                   "likes": event.likes, "saves": event.saves} for event in recently_saved_events]
        # get the 5 most clicked events by the user where last clicked was in the past month
        one_month_ago = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=30)
        stmt = (
                select(Event)
                .join(EventClicked, Event.id == EventClicked.event_id)
                .where(
                    EventClicked.user_id == user_id,
                    EventClicked.last_clicked >= one_month_ago
                )
                .order_by(
                    EventClicked.num_clicks.desc(),
                    EventClicked.last_clicked.desc()
                )
                .limit(5)
              )
        recently_clicked_events = session.execute(stmt).scalars().all()
        recently_clicked_events = [{"id": event.id, "name": event.name, "description": event.description,
                                  "startdate": event.startdate, "enddate": event.enddate, "price": event.price,
                                  "eighteenplus": event.eighteenplus, "tags": [tag.name for tag in event.tags],
                                  "clicks": event.clicks,
                                  "likes": event.likes, "saves": event.saves} for event in recently_clicked_events]
        # get the usernames of the friends who have saved the event instead of the number
        stmt = (
            select(UserProfile.username)
            .select_from(Friendship)
            .join(
                EventSaved,
                or_(
                    EventSaved.user_id == Friendship.user_low_id,
                    EventSaved.user_id == Friendship.user_high_id,
                )
            )
            .join(
                UserProfile,
                UserProfile.user_id == EventSaved.user_id,
            )
            .where(
                Friendship.status == "accepted",
                or_(
                    Friendship.user_low_id == user_id,
                    Friendship.user_high_id == user_id,
                ),
                EventSaved.user_id != user_id,
                EventSaved.event_id == event_id,
            )
        )

        friends_saved = session.execute(stmt).scalars().all()
    # give all this data to gemini and get it to generate a description for why the user would enjoy the event
    user_data = {"age group": preferences["age_group"], "budget": preferences["budget"], "followed tags": tags,
                 "recently saved events": recently_saved_events, "recent most clicked events": recently_clicked_events,
                 "friends saved event": friends_saved}
    description = generate_description(event, user_data)
    if description:
        return description.get("description", "")
    return ""

if __name__ == '__main__':
    # about this event:
    # i have clicked on it before
    # i have clicked on and saved astro coffee before
    # i have a friend who has saved this event
    generate_description_for_recommended_event(44, '3954c72a-307e-4e17-bd12-87aaf17513ad')
