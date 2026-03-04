from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user
from app.core.permissions import require_role
from app.models.user import User
from app.schemas.ambulance import AmbulanceResponse, AmbulanceLocationUpdate, AmbulanceStatusUpdate
from app.repositories.ambulance_repo import AmbulanceRepository
from app.services.tracking_service import TrackingService

router = APIRouter(prefix="/api/ambulances", tags=["ambulances"])


@router.get("", response_model=List[AmbulanceResponse])
async def list_ambulances(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all ambulances (admin sees all, EMS sees own)."""
    repo = AmbulanceRepository(db)
    if current_user.role.value == "ADMIN":
        return await repo.get_all()
    elif current_user.role.value == "EMS":
        ambulance = await repo.get_by_user_id(current_user.id)
        return [ambulance] if ambulance else []
    return await repo.get_all()


@router.get("/{ambulance_id}", response_model=AmbulanceResponse)
async def get_ambulance(
    ambulance_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get ambulance details."""
    repo = AmbulanceRepository(db)
    ambulance = await repo.get_by_id(ambulance_id)
    if not ambulance:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    return ambulance


@router.put("/{ambulance_id}/location", response_model=AmbulanceResponse)
async def update_location(
    ambulance_id: int,
    request: AmbulanceLocationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update ambulance GPS position (EMS only)."""
    role_check = require_role("EMS")
    role_check(current_user)

    tracking = TrackingService(db)
    await tracking.update_ambulance_location(
        ambulance_id=ambulance_id,
        latitude=request.latitude,
        longitude=request.longitude,
    )

    repo = AmbulanceRepository(db)
    ambulance = await repo.get_by_id(ambulance_id)
    if not ambulance:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    return ambulance


@router.patch("/{ambulance_id}/status", response_model=AmbulanceResponse)
async def update_ambulance_status(
    ambulance_id: int,
    request: AmbulanceStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update ambulance availability status."""
    role_check = require_role("EMS", "ADMIN")
    role_check(current_user)

    from app.models.ambulance import AmbulanceStatus
    try:
        new_status = AmbulanceStatus(request.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {request.status}")

    repo = AmbulanceRepository(db)
    ambulance = await repo.update_status(ambulance_id, new_status)
    if not ambulance:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    return ambulance
