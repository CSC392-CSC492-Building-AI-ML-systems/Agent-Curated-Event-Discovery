import os

from sqlalchemy.ext.asyncio import (AsyncSession,
                                    async_sessionmaker,
                                    create_async_engine)
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_async_engine(DATABASE_URL,
                             pool_size=10,
                             max_overflow=20,
                             pool_pre_ping=True)

SessionLocal = async_sessionmaker(engine,
                                  class_=AsyncSession,
                                  expire_on_commit=False)


async def get_db():
    async with SessionLocal() as session:
        yield session
