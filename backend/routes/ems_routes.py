"""
EMS routes: ambulance management, location updates, incident viewing.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Ambulance, Incident, AmbulanceStatus, IncidentStatus
from schemas import (
    AmbulanceOut, AmbulanceLocationUpdate, AmbulanceStatusUpdate,
    IncidentDetail, HospitalOut,
)
from auth import require_role
from websocket_manager import manager

router = APIRouter(prefix="/api/ems", tags=["EMS"])


@router.get("/ambulance", response_model=AmbulanceOut)
def get_my_ambulance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ems")),
):
    """Get the current EMS user's ambulance details."""
    ambulance = db.query(Ambulance).filter(Ambulance.user_id == current_user.id).first()
    if not ambulance:
        raise HTTPException(status_code=404, detail="No ambulance linked to your account")
    return ambulance


@router.put("/ambulance/location", response_model=AmbulanceOut)
async def update_location(
    data: AmbulanceLocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ems")),
):
    """Update ambulance GPS location and broadcast to relevant users."""
    ambulance = db.query(Ambulance).filter(Ambulance.user_id == current_user.id).first()
    if not ambulance:
        raise HTTPException(status_code=404, detail="No ambulance linked to your account")

    ambulance.latitude = data.latitude
    ambulance.longitude = data.longitude
    db.commit()
    db.refresh(ambulance)

    # Find active incidents assigned to this ambulance and notify the patient
    active_incidents = db.query(Incident).filter(
        Incident.ambulance_id == ambulance.id,
        Incident.status.in_([
            IncidentStatus.assigned,
            IncidentStatus.en_route,
            IncidentStatus.on_scene,
            IncidentStatus.transporting,
        ])
    ).all()

    for inc in active_incidents:
        await manager.send_personal(inc.patient_id, {
            "type": "ambulance_location",
            "data": {
                "ambulance_id": ambulance.id,
                "latitude": data.latitude,
                "longitude": data.longitude,
                "incident_id": inc.id,
            }
        })

    return ambulance


@router.put("/ambulance/status", response_model=AmbulanceOut)
async def update_status(
    data: AmbulanceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ems")),
):
    """Update ambulance status (available / busy / off_duty)."""
    ambulance = db.query(Ambulance).filter(Ambulance.user_id == current_user.id).first()
    if not ambulance:
        raise HTTPException(status_code=404, detail="No ambulance linked to your account")

    if data.status not in ["available", "busy", "off_duty"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    ambulance.status = AmbulanceStatus(data.status)
    db.commit()
    db.refresh(ambulance)
    return ambulance


@router.get("/incidents", response_model=list[IncidentDetail])
def get_my_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ems")),
):
    """Get all incidents assigned to the current EMS user's ambulance."""
    ambulance = db.query(Ambulance).filter(Ambulance.user_id == current_user.id).first()
    if not ambulance:
        raise HTTPException(status_code=404, detail="No ambulance linked to your account")

    incidents = db.query(Incident).filter(
        Incident.ambulance_id == ambulance.id
    ).order_by(Incident.created_at.desc()).all()

    results = []
    for inc in incidents:
        patient = inc.patient
        hosp = inc.hospital
        results.append(IncidentDetail(
            id=inc.id,
            patient_id=inc.patient_id,
            ambulance_id=inc.ambulance_id,
            hospital_id=inc.hospital_id,
            latitude=inc.latitude,
            longitude=inc.longitude,
            severity=inc.severity.value,
            status=inc.status.value,
            description=inc.description,
            created_at=inc.created_at,
            updated_at=inc.updated_at,
            patient_name=patient.name if patient else None,
            ambulance=AmbulanceOut.model_validate(ambulance),
            hospital=HospitalOut.model_validate(hosp) if hosp else None,
        ))
    return results
