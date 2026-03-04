from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user
from app.core.permissions import require_role
from app.models.user import User
from app.schemas.incident import IncidentResponse
from app.repositories.incident_repo import IncidentRepository

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.get("/incidents", response_model=List[IncidentResponse])
async def get_my_incidents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get incidents for the current patient."""
    role_check = require_role("PATIENT", "ADMIN")
    role_check(current_user)

    repo = IncidentRepository(db)
    return await repo.get_by_patient_id(current_user.id)


@router.get("/incidents/active", response_model=List[IncidentResponse])
async def get_active_incidents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get active (non-completed) incidents for the current patient."""
    role_check = require_role("PATIENT", "ADMIN")
    role_check(current_user)

    repo = IncidentRepository(db)
    all_incidents = await repo.get_by_patient_id(current_user.id)
    return [i for i in all_incidents if i.status.value != "COMPLETED"]
