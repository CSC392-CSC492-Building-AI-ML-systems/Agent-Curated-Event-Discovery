import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import events
from .routers import tags
from .routers import users
from .routers import calendar
from .routers import calendar_subscriptions
from .routers import availability
from .utils.calendar_logging import install_calendar_log_filter
from .routers import analytics

app = FastAPI()
install_calendar_log_filter()

# Comma-separated origins can override the default local Vite addresses.
origins = [origin.strip() for origin in os.getenv(
    "FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Accept", "Authorization", "Content-Type"],
)

app.include_router(events.router)
app.include_router(tags.router)
app.include_router(users.router)
app.include_router(calendar.router)
app.include_router(calendar_subscriptions.router)
app.include_router(availability.router)
app.include_router(analytics.router)


@app.get("/")
async def root():
    return {"message": "it's working"}


