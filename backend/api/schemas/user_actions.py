from pydantic import BaseModel, ConfigDict, Field, field_validator

class LikeOrSaveUpdate(BaseModel):
    id: int # event.id to like

class LikeOrSaveResponse(BaseModel):
    message: str
    id: int

class ErrorResponse(BaseModel):
    type: str
    status: int
    title: str
    detail: str