import json


def build_event(event, coordinates_geojson, avg_rating=None, rating_count=0):
    event = {
        "id": event.id,
        "name": event.name,
        "description": event.description,
        "startdate": event.startdate,
        "enddate": event.enddate,
        "starttime": event.starttime,
        "endtime": event.endtime,
        "price": event.price,
        "link": event.link,
        "eighteenplus": event.eighteenplus,
        "avg_rating": (
            round(float(avg_rating), 2)
            if avg_rating is not None
            else None
        ),
        "rating_count": rating_count,
        "tags": [
            {"id": tag.id, "name": tag.name}
            for tag in event.tags
        ],
        "organizer": (
            {
                "id": event.organizer_obj.id,
                "name": event.organizer_obj.name,
                "email": event.organizer_obj.email,
                "phone": event.organizer_obj.phone,
                "website": event.organizer_obj.website,
                "instagram": event.organizer_obj.instagram,
                "facebook": event.organizer_obj.facebook,
                "twitter": event.organizer_obj.twitter,
                "linkedin": event.organizer_obj.linkedin,
                "tiktok": event.organizer_obj.tiktok,
            }
            if event.organizer_obj
            else None
        ),
        "venue": {
            "id": event.venue_obj.id,
            "name": event.venue_obj.name,
            "address": event.venue_obj.address,
            "coordinates": (
                json.loads(coordinates_geojson)
                if coordinates_geojson
                else None
            ),
        },
    }

    return event
