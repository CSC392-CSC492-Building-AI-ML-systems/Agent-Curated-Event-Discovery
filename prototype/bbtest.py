from browserbase import Browserbase
from google import genai

from dotenv import load_dotenv
import os

import psycopg2

load_dotenv()

bb = Browserbase(api_key=os.environ["BB_API_KEY"])
gemini_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
DATABASE_URL = os.environ["DATABASE_URL"]

events = []
with psycopg2.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("SET search_path TO eventsthing;")
            cur.execute("""
                SELECT * FROM event LIMIT 5;
            """)

            rows = cur.fetchall()
            for row in rows:
                    events.append({
                        "id": row[0],
                        "name": row[1],
                        "description": row[2],
                        "startDate": row[3],
                        "endDate": row[4],
                        "locationName": row[5],
                    })

summaries = []
for event in events:
    search_response = bb.search.web(
        query=f"{event["name"]}, {event["locationName"]}",
        num_results=5,
    )

    print("SEARCH RESULTS: ")
    print(f"Request ID: {search_response.request_id}")
    for result in search_response.results:
        print(f"{result.title} - {result.url}")

    print("----------------")
    print("FETCH RESPONSE:")
    fetch_response = bb.fetch_api.create(url=search_response.results[0].url, format='markdown')
    print(fetch_response.status_code)
    print(fetch_response.content)

    print("----------------")
    print("GPT SUMMARY:")
    response = gemini_client.models.generate_content(
        model="gemini-3.5-flash-lite",  # Or your preferred model like gpt-5-mini, gpt-4o-mini, etc.
        contents=f"""You are given the following event: {event}
        A web search has also given you the following markdown: {fetch_response.content}
        Create an event object with the fields Name, Description, StartTime, EndTime (if applicable), Location (venue name)
        For the description, summarize the event instead of copying the description from the website.
        Format the response as a JSON object.
        """
        \
    )
    summaries.append(response.text)
    print(response.text)

print("-------------------")
print("ALL SUMMARIES:")
for summary in summaries:
      print(summary)