from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user
from app.core.permissions import require_role
from app.models.user import User
from app.schemas.incident import IncidentResponse, OverrideAmbulance, OverrideHospital
from app.services.dispatch_service import DispatchService
from app.services.incident_service import IncidentService
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/override/ambulance", response_model=IncidentResponse)
async def override_ambulance(
    request: OverrideAmbulance,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin: Reassign ambulance to an incident."""
    role_check = require_role("ADMIN")
    role_check(current_user)

    dispatch = DispatchService(db)
    try:
        incident = await dispatch.override_ambulance(
            request.incident_id, request.new_ambulance_id
        )
        return incident
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/override/hospital", response_model=IncidentResponse)
async def override_hospital(
    request: OverrideHospital,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin: Change hospital destination."""
    role_check = require_role("ADMIN")
    role_check(current_user)

    dispatch = DispatchService(db)
    try:
        incident = await dispatch.override_hospital(
            request.incident_id, request.new_hospital_id
        )
        return incident
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/incidents/{incident_id}/close", response_model=IncidentResponse)
async def force_close_incident(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin: Force-close an incident."""
    role_check = require_role("ADMIN")
    role_check(current_user)

    incident_service = IncidentService(db)
    try:
        incident = await incident_service.force_close(incident_id)
        return incident
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/analytics")
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin: Get system-wide analytics."""
    role_check = require_role("ADMIN")
    role_check(current_user)

    analytics = AnalyticsService(db)
    return await analytics.get_analytics()
