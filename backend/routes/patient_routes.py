"""
Patient routes: create emergency, view own incidents.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, Incident, AmbulanceStatus, IncidentStatus, Severity
from schemas import EmergencyRequest, IncidentOut, IncidentDetail, AmbulanceOut, HospitalOut
from auth import require_role
from dispatch import find_nearest_ambulance, find_nearest_hospital
from websocket_manager import manager

router = APIRouter(prefix="/api/emergencies", tags=["Patient / Emergencies"])


@router.post("/", response_model=IncidentDetail, status_code=status.HTTP_201_CREATED)
async def create_emergency(
    data: EmergencyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("patient")),
):
    """
    Full emergency creation flow (8 steps):
    1. Fetch available ambulances
    2. Calculate distances using Haversine
    3. Select nearest ambulance
    4. Filter hospitals by capacity + specialty
    5. Select nearest valid hospital
    6. Create incident record
    7. Update ambulance status → busy
    8. Broadcast WebSocket events
    """
    # Steps 1-3: Find nearest ambulance (weighted scoring)
    ambulance = find_nearest_ambulance(data.latitude, data.longitude, db, severity=data.severity)
    if not ambulance:
        raise HTTPException(status_code=503, detail="No ambulances available at this time")

    # Steps 4-5: Find nearest hospital
    hospital = find_nearest_hospital(data.latitude, data.longitude, data.severity, db)
    if not hospital:
        raise HTTPException(status_code=503, detail="No hospitals with available beds found")

    # Step 6: Create incident
    incident = Incident(
        patient_id=current_user.id,
        ambulance_id=ambulance.id,
        hospital_id=hospital.id,
        latitude=data.latitude,
        longitude=data.longitude,
        severity=Severity(data.severity),
        status=IncidentStatus.assigned,
        description=data.description,
    )
    db.add(incident)

    # Step 7: Update ambulance status
    ambulance.status = AmbulanceStatus.busy
    db.commit()
    db.refresh(incident)

    # Build response
    result = IncidentDetail(
        id=incident.id,
        patient_id=incident.patient_id,
        ambulance_id=incident.ambulance_id,
        hospital_id=incident.hospital_id,
        latitude=incident.latitude,
        longitude=incident.longitude,
        severity=incident.severity.value,
        status=incident.status.value,
        description=incident.description,
        created_at=incident.created_at,
        updated_at=incident.updated_at,
        patient_name=current_user.name,
        ambulance=AmbulanceOut.model_validate(ambulance) if ambulance else None,
        hospital=HospitalOut.model_validate(hospital) if hospital else None,
    )

    # Step 8: Broadcast WebSocket events
    event_data = {
        "incident_id": incident.id,
        "patient_name": current_user.name,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "severity": data.severity,
        "ambulance_id": ambulance.id,
        "hospital_id": hospital.id,
        "hospital_name": hospital.name,
    }

    # Notify the patient
    await manager.send_personal(current_user.id, {
        "type": "incident_created",
        "data": event_data,
    })

    # Notify the assigned EMS
    await manager.send_personal(ambulance.user_id, {
        "type": "ambulance_assigned",
        "data": event_data,
    })

    # Notify the assigned hospital
    await manager.send_personal(hospital.user_id, {
        "type": "hospital_assigned",
        "data": event_data,
    })

    # Broadcast to all EMS and hospital roles
    await manager.broadcast_to_role("ems", {
        "type": "incident_update",
        "data": event_data,
    })
    await manager.broadcast_to_role("hospital", {
        "type": "incident_update",
        "data": event_data,
    })

    return result


@router.get("/my", response_model=list[IncidentDetail])
def get_my_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("patient")),
):
    """Get all incidents for the current patient."""
    incidents = db.query(Incident).filter(
        Incident.patient_id == current_user.id
    ).order_by(Incident.created_at.desc()).all()

    results = []
    for inc in incidents:
        amb = inc.ambulance
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
            patient_name=current_user.name,
            ambulance=AmbulanceOut.model_validate(amb) if amb else None,
            hospital=HospitalOut.model_validate(hosp) if hosp else None,
        ))
    return results
