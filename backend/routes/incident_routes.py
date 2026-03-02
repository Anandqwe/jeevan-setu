"""
Incident routes: update incident status.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Incident, IncidentStatus, Ambulance, AmbulanceStatus, Hospital
from schemas import IncidentStatusUpdate, IncidentOut
from auth import get_current_user
from websocket_manager import manager

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

VALID_TRANSITIONS = {
    "assigned": ["en_route", "cancelled"],
    "en_route": ["on_scene", "cancelled"],
    "on_scene": ["transporting", "cancelled"],
    "transporting": ["completed", "cancelled"],
}


@router.put("/{incident_id}/status", response_model=IncidentOut)
async def update_incident_status(
    incident_id: int,
    data: IncidentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update incident status with valid state transitions.
    On completion, ambulance is released back to 'available'.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Authorization: only assigned EMS, hospital, or the patient can update
    is_authorized = False
    if current_user.role.value == "ems" and incident.ambulance:
        is_authorized = incident.ambulance.user_id == current_user.id
    elif current_user.role.value == "hospital" and incident.hospital:
        is_authorized = incident.hospital.user_id == current_user.id
    elif current_user.role.value == "patient":
        is_authorized = incident.patient_id == current_user.id

    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to update this incident")

    # Validate state transition
    current_status = incident.status.value
    if data.status not in VALID_TRANSITIONS.get(current_status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{current_status}' to '{data.status}'"
        )

    incident.status = IncidentStatus(data.status)

    # On completion or cancellation, release the ambulance
    if data.status in ["completed", "cancelled"]:
        if incident.ambulance:
            incident.ambulance.status = AmbulanceStatus.available
        # If completed, decrement hospital ICU beds
        if data.status == "completed" and incident.hospital:
            hospital = db.query(Hospital).filter(Hospital.id == incident.hospital_id).first()
            if hospital and hospital.available_icu_beds > 0:
                hospital.available_icu_beds -= 1

    db.commit()
    db.refresh(incident)

    # Broadcast status update
    event = {
        "type": "incident_status_update",
        "data": {
            "incident_id": incident.id,
            "status": data.status,
            "updated_by": current_user.name,
        }
    }
    # Notify patient
    await manager.send_personal(incident.patient_id, event)
    # Notify EMS
    if incident.ambulance:
        await manager.send_personal(incident.ambulance.user_id, event)
    # Notify hospital
    if incident.hospital:
        await manager.send_personal(incident.hospital.user_id, event)

    return incident
