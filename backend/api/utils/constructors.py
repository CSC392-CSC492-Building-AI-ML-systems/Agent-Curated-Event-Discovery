import json


def build_event(event, coordinates_geojson):
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
        "likes": event.likes,
        "saves": event.saves,
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
