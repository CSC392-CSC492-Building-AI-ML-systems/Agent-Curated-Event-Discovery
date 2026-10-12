from database import SessionLocal
from sqlalchemy import select
from backend.api.models.event import Tag
from sqlalchemy.dialects.postgresql import insert

all_tags = [{"name": "AI"},
            {"name": "Art"},
            {"name": "Books"},
            {"name": "Comedy"},
            {"name": "Culture"},
            {"name": "Film"},
            {"name": "Fitness"},
            {"name": "Food"},
            {"name": "Games"},
            {"name": "Music"},
            {"name": "Outdoors"},
            {"name": "Social"},
            {"name": "Sports"},
            {"name": "Student"},
            {"name": "Tech"},
            {"name": "Wellness"},
            {"name": "Free"}]

def insert_all_tags():
    with SessionLocal() as session:
        stmt = insert(Tag).values(all_tags).on_conflict_do_nothing()
        session.execute(stmt)
        session.commit()

def get_all_tags_by_name():
    with SessionLocal() as session:
        return session.execute(select(Tag.name)).scalars().all()

if __name__ == '__main__':
    insert_all_tags()