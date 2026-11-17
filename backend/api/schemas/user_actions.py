from pydantic import BaseModel

class SaveUpdate(BaseModel):
    id: int # event.id to save

class SaveResponse(BaseModel):
    message: str
    id: int

class ErrorResponse(BaseModel):
    type: str
    status: int
    title: str
    detail: str