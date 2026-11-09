from database import SessionLocal
from sqlalchemy.dialects.postgresql import insert
from backend.api.models.event import Event, Tag
# with SessionLocal() as session:
#     stmt = (insert(TogatherEvent).values(values).on_conflict_do_nothing())
#     session.execute(stmt)
#     session.commit()

def retrieve(user_id: str, number: int) -> list[Event]:
    """
    Retrieve top <number> of events that user <user_id> would likely enjoy. 
    Return as a list of events of type Event.
    """
    pass

def rank(events: list[Event], user_id: str, number: int):
    """
    Rank the given <events> for the user <user_id>, from most likely to save/like to least likely to save/like.
    Return a list of the top <number> of ranked events.
    """
    pass