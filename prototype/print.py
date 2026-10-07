import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]

def print_events():
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

            events = cur.fetchall()
            no_desc = 0
            for event in events:
                print("-" * 80)
                print(f"ID:          {event[0]}")
                print(f"Name:        {event[1]}")
                print(f"Description: {event[2]}")
                print(f"Start:       {event[3]}")
                print(f"End:         {event[4]}")
                print(f"Location:    {event[5]}")
                if event[2] is None:
                    no_desc += 1

            print("-" * 80)
            print(f"Total events: {len(events)}")
            print(f"events with no description: {no_desc}")


if __name__ == "__main__":
    print_events()