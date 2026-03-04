from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user
from app.core.permissions import require_role
from app.models.user import User
from app.schemas.incident import IncidentCreate, IncidentResponse
from app.services.dispatch_service import DispatchService
from app.repositories.incident_repo import IncidentRepository

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    request: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new emergency request (triggers dispatch engine)."""
    # Only PATIENT and ADMIN can create incidents
    role_check = require_role("PATIENT", "ADMIN")
    role_check(current_user)

    dispatch = DispatchService(db)
    try:
        incident = await dispatch.dispatch(
            patient_id=current_user.id,
            latitude=request.latitude,
            longitude=request.longitude,
            severity=request.severity,
            description=request.description,
        )
        return incident
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=List[IncidentResponse])
async def list_incidents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List incidents filtered by user role."""
    incident_repo = IncidentRepository(db)

    if current_user.role.value == "ADMIN":
        return await incident_repo.get_all()
    elif current_user.role.value == "PATIENT":
        return await incident_repo.get_by_patient_id(current_user.id)
    elif current_user.role.value == "EMS":
        from app.repositories.ambulance_repo import AmbulanceRepository
        amb_repo = AmbulanceRepository(db)
        ambulance = await amb_repo.get_by_user_id(current_user.id)
        if ambulance:
            return await incident_repo.get_by_ambulance_id(ambulance.id)
        return []
    elif current_user.role.value == "HOSPITAL":
        from app.repositories.hospital_repo import HospitalRepository
        hosp_repo = HospitalRepository(db)
        hospital = await hosp_repo.get_by_user_id(current_user.id)
        if hospital:
            return await incident_repo.get_by_hospital_id(hospital.id)
        return []
    return []


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get incident details."""
    incident_repo = IncidentRepository(db)
    incident = await incident_repo.get_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.patch("/{incident_id}/status", response_model=IncidentResponse)
async def update_incident_status(
    incident_id: int,
    request: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transition incident state (EMS, HOSPITAL, ADMIN only)."""
    role_check = require_role("EMS", "HOSPITAL", "ADMIN")
    role_check(current_user)

    from app.services.incident_service import IncidentService
    incident_service = IncidentService(db)
    try:
        incident = await incident_service.transition_status(
            incident_id, request.get("status", "")
        )
        return incident
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
