import uuid
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.models.paper import Paper
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.user import UserResponse, UserStatusUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=List[UserResponse])
async def list_all_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
) -> List[UserResponse]:
    """
    List all registered users in the system with their analysis counts and login stats (Admin only).
    """
    stmt = select(User).order_by(User.created_at.desc())
    result = await db.execute(stmt)
    users = result.scalars().all()

    user_responses = []
    for u in users:
        # Count papers / analyses across user workspaces
        paper_count_stmt = (
            select(func.count(Paper.id))
            .join(Workspace, Paper.workspace_id == Workspace.id)
            .where(Workspace.user_id == u.id)
        )
        analyses_count = (await db.execute(paper_count_stmt)).scalar_one()

        res = UserResponse.model_validate(u)
        res.analyses_count = analyses_count
        user_responses.append(res)

    return user_responses


@router.patch("/users/{user_id}/status", response_model=UserResponse)
async def toggle_user_status(
    user_id: uuid.UUID,
    status_update: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
) -> UserResponse:
    """
    Enable or disable a user account (Admin only).
    """
    if user_id == admin.id and not status_update.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin cannot disable their own primary account."
        )

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    target_user = result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    target_user.is_active = status_update.is_active
    await db.commit()
    await db.refresh(target_user)

    # Compute paper count
    paper_count_stmt = (
        select(func.count(Paper.id))
        .join(Workspace, Paper.workspace_id == Workspace.id)
        .where(Workspace.user_id == target_user.id)
    )
    analyses_count = (await db.execute(paper_count_stmt)).scalar_one()

    res = UserResponse.model_validate(target_user)
    res.analyses_count = analyses_count
    return res


@router.get("/stats", response_model=Dict[str, Any])
async def get_system_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Get system-wide metrics: total users, active users, total workspaces, total papers, processing status breakdown.
    """
    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    active_users = (await db.execute(select(func.count(User.id)).where(User.is_active == True))).scalar_one()
    total_workspaces = (await db.execute(select(func.count(Workspace.id)))).scalar_one()
    total_papers = (await db.execute(select(func.count(Paper.id)))).scalar_one()

    # Status breakdown
    ready_papers = (await db.execute(select(func.count(Paper.id)).where(Paper.status == "READY"))).scalar_one()
    processing_papers = (await db.execute(select(func.count(Paper.id)).where(Paper.status == "PROCESSING"))).scalar_one()
    failed_papers = (await db.execute(select(func.count(Paper.id)).where(Paper.status == "FAILED"))).scalar_one()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_workspaces": total_workspaces,
        "total_papers": total_papers,
        "ready_papers": ready_papers,
        "processing_papers": processing_papers,
        "failed_papers": failed_papers,
        "admin": "kkssakthikumaran@gmail.com"
    }


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_account(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
) -> None:
    """
    Delete a user account and all associated workspaces and papers (Admin only).
    """
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin cannot delete their own primary account."
        )

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    target_user = result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    await db.delete(target_user)
    await db.commit()
