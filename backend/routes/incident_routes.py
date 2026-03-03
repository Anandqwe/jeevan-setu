"""
Incident routes: update incident status.
"""

import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Incident, IncidentStatus, Ambulance, AmbulanceStatus, Hospital
from schemas import (
    IncidentStatusUpdate,
    IncidentOut,
    HospitalReadinessUpdate,
    IncidentArrivalUpdate,
    IncidentHandoverUpdate,
)
from auth import get_current_user
from websocket_manager import manager

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

VALID_TRANSITIONS = {
    "assigned": ["en_route", "cancelled"],
    "en_route": ["on_scene", "cancelled"],
    "on_scene": ["transporting", "cancelled"],
    "transporting": ["completed", "cancelled"],
}


def _incident_snapshot(incident: Incident, updated_by: str):
    return {
        "incident_id": incident.id,
        "status": incident.status.value,
        "updated_by": updated_by,
        "hospital_ready": incident.hospital_ready,
        "patient_reached_hospital": incident.patient_reached_hospital,
        "eta_minutes": incident.eta_minutes,
        "distance_km": incident.distance_km,
        "ambulance_last_lat": incident.ambulance_last_lat,
        "ambulance_last_lng": incident.ambulance_last_lng,
        "ambulance_last_seen_at": incident.ambulance_last_seen_at.isoformat() if incident.ambulance_last_seen_at else None,
        "arrived_at_hospital_at": incident.arrived_at_hospital_at.isoformat() if incident.arrived_at_hospital_at else None,
        "handover_completed_at": incident.handover_completed_at.isoformat() if incident.handover_completed_at else None,
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

    if data.status == "transporting" and incident.arrived_at_hospital_at is not None:
        incident.arrived_at_hospital_at = None
        incident.patient_reached_hospital = False

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
        "data": _incident_snapshot(incident, current_user.name)
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


@router.put("/{incident_id}/hospital-readiness", response_model=IncidentOut)
async def update_hospital_readiness(
    incident_id: int,
    data: HospitalReadinessUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if current_user.role.value != "hospital" or not incident.hospital or incident.hospital.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only assigned hospital can update readiness")

    incident.hospital_ready = data.hospital_ready
    db.commit()
    db.refresh(incident)

    event = {
        "type": "hospital_readiness_update",
        "data": _incident_snapshot(incident, current_user.name),
    }
    await manager.send_personal(incident.patient_id, event)
    if incident.ambulance:
        await manager.send_personal(incident.ambulance.user_id, event)
    if incident.hospital:
        await manager.send_personal(incident.hospital.user_id, event)
    return incident


@router.put("/{incident_id}/arrival", response_model=IncidentOut)
async def update_patient_arrival(
    incident_id: int,
    data: IncidentArrivalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    is_ems = current_user.role.value == "ems" and incident.ambulance and incident.ambulance.user_id == current_user.id
    is_hospital = current_user.role.value == "hospital" and incident.hospital and incident.hospital.user_id == current_user.id
    if not (is_ems or is_hospital):
        raise HTTPException(status_code=403, detail="Not authorized to update arrival")

    incident.patient_reached_hospital = data.patient_reached_hospital
    incident.arrived_at_hospital_at = datetime.datetime.utcnow() if data.patient_reached_hospital else None
    db.commit()
    db.refresh(incident)

    event = {
        "type": "patient_arrival_update",
        "data": _incident_snapshot(incident, current_user.name),
    }
    await manager.send_personal(incident.patient_id, event)
    if incident.ambulance:
        await manager.send_personal(incident.ambulance.user_id, event)
    if incident.hospital:
        await manager.send_personal(incident.hospital.user_id, event)
    return incident


@router.put("/{incident_id}/handover", response_model=IncidentOut)
async def update_handover(
    incident_id: int,
    data: IncidentHandoverUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if current_user.role.value != "hospital" or not incident.hospital or incident.hospital.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only assigned hospital can update handover")

    incident.handover_completed_at = datetime.datetime.utcnow() if data.handover_completed else None
    if data.handover_completed and incident.status.value != "completed":
        incident.status = IncidentStatus.completed
        if incident.ambulance:
            incident.ambulance.status = AmbulanceStatus.available

    db.commit()
    db.refresh(incident)

    event = {
        "type": "patient_handover_update",
        "data": _incident_snapshot(incident, current_user.name),
    }
    await manager.send_personal(incident.patient_id, event)
    if incident.ambulance:
        await manager.send_personal(incident.ambulance.user_id, event)
    if incident.hospital:
        await manager.send_personal(incident.hospital.user_id, event)
    return incident
