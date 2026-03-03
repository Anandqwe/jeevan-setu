"""
Hospital routes: hospital info, bed management, incoming incidents.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Hospital, Incident
from schemas import HospitalOut, HospitalBedsUpdate, IncidentDetail, AmbulanceOut
from auth import require_role

router = APIRouter(prefix="/api/hospitals", tags=["Hospitals"])


@router.get("/my", response_model=HospitalOut)
def get_my_hospital(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("hospital")),
):
    """Get the current hospital user's details."""
    hospital = db.query(Hospital).filter(Hospital.user_id == current_user.id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="No hospital linked to your account")
    return hospital


@router.put("/beds", response_model=HospitalOut)
def update_beds(
    data: HospitalBedsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("hospital")),
):
    """Update available ICU bed count."""
    hospital = db.query(Hospital).filter(Hospital.user_id == current_user.id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="No hospital linked to your account")

    if data.available_icu_beds < 0:
        raise HTTPException(status_code=400, detail="Bed count cannot be negative")
    if data.available_icu_beds > hospital.total_icu_beds:
        raise HTTPException(status_code=400, detail="Available beds cannot exceed total beds")

    hospital.available_icu_beds = data.available_icu_beds
    db.commit()
    db.refresh(hospital)
    return hospital


@router.get("/incidents", response_model=list[IncidentDetail])
def get_hospital_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("hospital")),
):
    """Get all incidents assigned to the current hospital."""
    hospital = db.query(Hospital).filter(Hospital.user_id == current_user.id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="No hospital linked to your account")

    incidents = db.query(Incident).filter(
        Incident.hospital_id == hospital.id
    ).order_by(Incident.created_at.desc()).all()

    results = []
    for inc in incidents:
        patient = inc.patient
        amb = inc.ambulance
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
            hospital_ready=inc.hospital_ready,
            patient_reached_hospital=inc.patient_reached_hospital,
            eta_minutes=inc.eta_minutes,
            distance_km=inc.distance_km,
            ambulance_last_lat=inc.ambulance_last_lat,
            ambulance_last_lng=inc.ambulance_last_lng,
            ambulance_last_seen_at=inc.ambulance_last_seen_at,
            arrived_at_hospital_at=inc.arrived_at_hospital_at,
            handover_completed_at=inc.handover_completed_at,
            created_at=inc.created_at,
            updated_at=inc.updated_at,
            patient_name=patient.name if patient else None,
            ambulance=AmbulanceOut.model_validate(amb) if amb else None,
            hospital=HospitalOut.model_validate(hospital),
        ))
    return results
