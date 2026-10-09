import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import events
from .routers import tags

app = FastAPI()

# Comma-separated origins can override the default local Vite addresses.
origins = [origin.strip() for origin in os.getenv(
    "FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET"],
    allow_headers=["Accept"],
)

app.include_router(events.router)
app.include_router(tags.router)


@app.get("/")
async def root():
    return {"message": "it's working"}


