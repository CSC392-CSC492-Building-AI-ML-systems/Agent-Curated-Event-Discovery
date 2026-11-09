from datetime import datetime

from pydantic import BaseModel


class SubscriptionStatus(BaseModel):
    enabled: bool
    created_at: datetime | None = None


class SubscriptionCreated(SubscriptionStatus):
    subscription_url: str
