from db.database_sync import SessionLocal
from sqlalchemy import select, delete, func, union_all, literal, extract
from sqlalchemy.dialects.postgresql import insert
from models.event import Event, Tag
from models.user_actions import EventLiked, EventSaved
from models.analytics import EventClicked, EventPopular, EventTrending

def update_trends() -> None:
    """
    Update the 'trending' and 'popular' tables.
    """
    HALF_LIFE_DAYS = 3
    NUM_EVENTS = 50 #only take 50 top events

    print("Starting updates...")
    with SessionLocal() as session:
        # update popular
        interactions = union_all(
            select(EventSaved.event_id, EventSaved.timestamp, literal(3).label("w")),
            select(EventLiked.event_id, EventLiked.timestamp, literal(2).label("w")),
            select(EventClicked.event_id, EventClicked.last_clicked.label("timestamp"), literal(1).label("w")),
        ).subquery("interactions")

        score = func.sum(interactions.c.w).label("score")
        last_interaction = func.max(interactions.c.timestamp).label("last_interaction")
        
        popularity_scores = (
            select(
                interactions.c.event_id,
                score,
                func.now().label("updated_at"),
            )
            .group_by(interactions.c.event_id)
            .order_by(score.desc(), last_interaction.desc(), interactions.c.event_id)
            .limit(NUM_EVENTS)
        )

        stmt = insert(EventPopular).from_select(
            ["event_id", "score", "updated_at"], popularity_scores
        )
        
        session.execute(delete(EventPopular))
        session.execute(stmt)
        
        # update trending 
        age_days = extract("epoch", func.now() - interactions.c.timestamp) / 86400.0
        decayed = interactions.c.w * func.power(0.5, age_days / HALF_LIFE_DAYS)
        score = func.sum(decayed).label("score")
        last_interaction = func.max(interactions.c.timestamp).label("last_interaction")
        trending_scores = (
            select(
                interactions.c.event_id,
                score,
                func.now().label("updated_at"),
            )
            .group_by(interactions.c.event_id)
            .having(score > 0.1)   
            .order_by(score.desc(), last_interaction.desc(), interactions.c.event_id)
            .limit(NUM_EVENTS)
        )

        stmt = insert(EventTrending).from_select(
            ["event_id", "score", "updated_at"], trending_scores
        )

        session.execute(delete(EventTrending))
        session.execute(stmt)
        session.commit()
    print("Updates done!")

def retrieve(user_id: str, number: int) -> list[Event]:
    """
    Retrieve top <number> of events that user <user_id> would likely enjoy. 
    Return as a list of events of type Event.
    """ 
    INTERVAL = '60 days'
    DISTANCE = 10
    # WHERE start_time > now() AND start_time < now() + interval '60 days'
    # AND distance <= 50km
    WEIGHTS = {"trending": 0.5, "popularity": 0.2, "recency": 0.3, "distance": 0.4, "price": 0.1, "tag": 0.1}
    SCORES = {"trending": 0, "popularity": 0, "recency": 0, "distance": 0, "price": 0, "tag": 0}
    total_interactions = 0

    # weight*0.5(age_days/half_life) recency bias
    with SessionLocal() as session:
        stmt = (select(func.count()).select_from(EventClicked).where(Event.user_id==user_id))
        total_interactions = session.execute(stmt).scalar()
        trending_score = 0
        popularity_score = 0
        recency_score = 0
        distance_score = 0
        price_score = 0
        tag_score = 0
    # if total_interactions <= 10:
    #     # if number of events this person has liked/saved/clicked is under 15
    #     # retrieve by trending > popular > recent > close in distance > price (low) > save tag > likes tag > clicks tag
    #     # score = trending*2 + popular*1 + recent*1 + close in distance * 1 + price + save tag + likes tag + clicks tag
    
    
    # else:
    #     score = 

    # # if not, then retrieve by save tag > likes tag > clicks tag > trending > popular > recent > close in distance > price (low)
    # # score = save_tag*4 + likes_tag*3 + clicks_tag*2 + trending*2 + popular*1 + recent*1 + close in distance * 1 + price*1

    # pass

def rank(events: list[Event], user_id: str, number: int):
    """
    Rank the given <events> for the user <user_id>, from most likely to save/like to least likely to save/like.
    Return a list of the top <number> of ranked events.
    """
    pass

def get_recommendations():
    """
    Get <number> of ranked, top recommendations for each user. Populate the recommended_events table in PostgreSQL accordingly.
    """

if __name__ == "__main__":
    update_trends()