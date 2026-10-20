from fastapi import APIRouter, Depends
from ..utils.auth import get_current_user

router = APIRouter(prefix="/users")


@router.get("/me")
async def get_active_user(user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    print(user)
    return {'id': user_id}
