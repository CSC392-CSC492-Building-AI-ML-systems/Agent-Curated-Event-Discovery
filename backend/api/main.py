from fastapi import FastAPI
from .routers import events
from .routers import tags

app = FastAPI()

app.include_router(events.router)
app.include_router(tags.router)


@app.get("/")
async def root():
    return {"message": "it's working"}


