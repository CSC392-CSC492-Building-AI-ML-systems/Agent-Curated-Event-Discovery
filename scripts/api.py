from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]

origins = [
    "http://localhost:3000",      # Common React development port
]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,           # Allows requests from specified origins
    allow_credentials=True,          # Allows cookies/auth headers (e.g., HTTP Basic, Bearer)
    allow_methods=["*"],             # Allows all standard HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],             # Allows all request headers (e.g., Content-Type, Authorization)
)


@app.get("/")
def test():
    return {"message": "test"}

@app.get("/events")
def get_events():
    with psycopg2.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("SET search_path TO eventsthing;")
            cur.execute("""
                SELECT
                    id,
                    name,
                    description,
                    startDate,
                    endDate,
                    locationName
                FROM Event
                ORDER BY startDate;
            """)

            rows = cur.fetchall()

    events = []

    for row in rows:
        events.append({
            "id": row[0],
            "name": row[1],
            "description": row[2],
            "startDate": row[3],
            "endDate": row[4],
            "locationName": row[5],
        })

    return events