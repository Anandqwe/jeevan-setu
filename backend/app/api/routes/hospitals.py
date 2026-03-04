from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user
from app.core.permissions import require_role
from app.models.user import User
from app.schemas.hospital import HospitalResponse, HospitalBedUpdate
from app.repositories.hospital_repo import HospitalRepository
from app.websocket.manager import manager
from app.websocket.events import bed_updated_msg

router = APIRouter(prefix="/api/hospitals", tags=["hospitals"])


@router.get("", response_model=List[HospitalResponse])
async def list_hospitals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all hospitals."""
    repo = HospitalRepository(db)
    return await repo.get_all()


@router.get("/{hospital_id}", response_model=HospitalResponse)
async def get_hospital(
    hospital_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get hospital details."""
    repo = HospitalRepository(db)
    hospital = await repo.get_by_id(hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hospital


@router.put("/{hospital_id}/beds", response_model=HospitalResponse)
async def update_beds(
    hospital_id: int,
    request: HospitalBedUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update ICU bed count (HOSPITAL or ADMIN only)."""
    role_check = require_role("HOSPITAL", "ADMIN")
    role_check(current_user)

    repo = HospitalRepository(db)
    hospital = await repo.update_beds(hospital_id, request.available_icu_beds)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    # Broadcast bed update to admins
    await manager.broadcast_to_role(
        "ADMIN",
        bed_updated_msg(hospital_id, request.available_icu_beds),
    )

    return hospital
