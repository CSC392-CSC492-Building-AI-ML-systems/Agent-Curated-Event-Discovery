from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, delete, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.database import get_db
from api.models.friendships import Friendship
from api.models.profile import UserProfile
from api.schemas.friendships import FriendRequestCreate, FriendRequestItem, \
    FriendRequestResponse, \
    FriendRequestsResponse, FriendResponse
from api.utils.auth import get_current_user


def order_user_ids(a: UUID, b: UUID) -> tuple[UUID, UUID]:
    return (a, b) if a.int < b.int else (b, a)


router = APIRouter(prefix="/friends", tags=["friends"])


@router.get("/requests", response_model=FriendRequestsResponse)
async def get_friend_requests(
        user: dict = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
):
    user_id = UUID(user["sub"])

    other_user_id = case(
        (Friendship.user_low_id == user_id, Friendship.user_high_id),
        else_=Friendship.user_low_id,
    )

    result = await db.execute(
        select(Friendship, UserProfile)
        .join(UserProfile, UserProfile.user_id == other_user_id)
        .where(
            Friendship.status == "pending",
            or_(
                Friendship.user_low_id == user_id,
                Friendship.user_high_id == user_id,
                ),
            )
        .order_by(Friendship.created_at.desc())
    )

    incoming = []
    outgoing = []

    for friendship, profile in result.all():
        request = FriendRequestItem(
            user_id=profile.user_id,
            username=profile.username,
            created_at=friendship.created_at,
        )

        if friendship.requested_by == user_id:
            outgoing.append(request)
        else:
            incoming.append(request)

    return FriendRequestsResponse(
        incoming=incoming,
        outgoing=outgoing,
    )


@router.post(
    "/requests",
    response_model=FriendRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_friend_request(
        request: FriendRequestCreate,
        user: UUID = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
):
    user_id = UUID(user["sub"])

    username = request.username.strip()

    if not username:
        raise HTTPException(422, "Username cannot be empty")

    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == user_id)
    )

    profile = result.scalar_one_or_none()

    if profile is None:
        raise HTTPException(409, "Complete your profile first")

    result = await db.execute(
        select(UserProfile).where(UserProfile.username == username)
    )
    target = result.scalar_one_or_none()

    if target is None:
        raise HTTPException(404, "User not found")

    if target.user_id == user_id:
        raise HTTPException(400, "Cannot add yourself")

    low, high = order_user_ids(user_id, target.user_id)

    result = await db.execute(
        insert(Friendship)
        .values(
            user_low_id=low,
            user_high_id=high,
            requested_by=user_id,
            status="pending",
        )
        .on_conflict_do_nothing(
            index_elements=[
                Friendship.user_low_id,
                Friendship.user_high_id,
            ]
        )
        .returning(Friendship.user_low_id)
    )

    created = result.scalar_one_or_none()

    if created is None:
        result = await db.execute(
            select(Friendship).where(
                Friendship.user_low_id == low,
                Friendship.user_high_id == high,
                )
        )
        existing = result.scalar_one_or_none()

        if existing is None:
            raise HTTPException(409, "Please retry the request")

        if existing.status == "accepted":
            raise HTTPException(409, "Already friends")

        if existing.requested_by == user_id:
            raise HTTPException(409, "Friend request already sent")

        raise HTTPException(
            409, "You already have an incoming request from this user"
        )

    await db.commit()

    return FriendRequestResponse(
        user_id=target.user_id,
        username=target.username,
        status="pending",
    )


@router.post("/requests/{user_id}/accept", status_code=status.HTTP_204_NO_CONTENT,)
async def accept_friend_request(
        user_id: UUID,
        user: dict = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
):
    current_user_id = UUID(user["sub"])
    low, high = order_user_ids(current_user_id, user_id)

    result = await db.execute(
        update(Friendship)
        .where(
            Friendship.user_low_id == low,
            Friendship.user_high_id == high,
            Friendship.status == "pending",
            Friendship.requested_by == user_id,
            )
        .values(
            status="accepted",
            accepted_at=func.now(),
        )
        .returning(Friendship.user_low_id)
    )

    updated = result.scalar_one_or_none()

    if updated is None:
        raise HTTPException(404, "Incoming friend request not found")

    await db.commit()

    return status.HTTP_204_NO_CONTENT


@router.delete(
    "/requests/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_friend_request(
        user_id: UUID,
        user: dict = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
):
    current_user_id = UUID(user["sub"])
    low, high = order_user_ids(current_user_id, user_id)

    result = await db.execute(
        delete(Friendship)
        .where(
            Friendship.user_low_id == low,
            Friendship.user_high_id == high,
            Friendship.status == "pending",
            )
        .returning(Friendship.user_low_id)
    )

    deleted = result.scalar_one_or_none()

    if deleted is None:
        raise HTTPException(404, "Pending friend request not found")

    await db.commit()


@router.get("", response_model=list[FriendResponse])
async def get_friends(
        user: dict = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
):
    user_id = UUID(user["sub"])

    other_user_id = case(
        (Friendship.user_low_id == user_id, Friendship.user_high_id),
        else_=Friendship.user_low_id,
    )

    result = await db.execute(
        select(Friendship, UserProfile)
        .join(UserProfile, UserProfile.user_id == other_user_id)
        .where(
            Friendship.status == "accepted",
            or_(
                Friendship.user_low_id == user_id,
                Friendship.user_high_id == user_id,
                ),
            )
        .order_by(UserProfile.username)
    )

    return [
        FriendResponse(
            user_id=profile.user_id,
            username=profile.username,
            accepted_at=friendship.accepted_at,
        )
        for friendship, profile in result.all()
    ]


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_friend(
        user_id: UUID,
        user: dict = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
):
    current_user_id = UUID(user["sub"])
    low, high = order_user_ids(current_user_id, user_id)

    result = await db.execute(
        delete(Friendship)
        .where(
            Friendship.user_low_id == low,
            Friendship.user_high_id == high,
            Friendship.status == "accepted",
            )
        .returning(Friendship.user_low_id)
    )

    deleted = result.scalar_one_or_none()

    if deleted is None:
        raise HTTPException(404, "Friendship not found")

    await db.commit()
