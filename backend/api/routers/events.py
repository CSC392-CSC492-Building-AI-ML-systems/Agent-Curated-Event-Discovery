from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/events")
db = {"1": {"name": "stupid event", "venue": "stupid venue"}}


@router.get("")
async def get_events():
    return {"events": db}


@router.get("/{event_id}")
async def get_event(event_id: str):
    if event_id not in db:
        raise HTTPException(status_code=404, detail="Item not found")
    return db[event_id]
