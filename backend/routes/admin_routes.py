"""
Admin routes: system stats, user management, all incidents/ambulances/hospitals.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import (
    User, UserRole, Ambulance, Hospital, Incident, IncidentStatus,
    AmbulanceStatus, AuditLog, Severity
)
from schemas import (
    SystemStats, UserOut, IncidentDetail, AmbulanceOut, HospitalOut,
    AuditLogOut
)
from auth import require_role

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/stats", response_model=SystemStats)
def get_system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Get overall system statistics."""
    total_users = db.query(User).count()
    total_patients = db.query(User).filter(User.role == UserRole.patient).count()
    total_ems = db.query(User).filter(User.role == UserRole.ems).count()
    total_hospitals_count = db.query(User).filter(User.role == UserRole.hospital).count()

    total_incidents = db.query(Incident).count()
    active_incidents = db.query(Incident).filter(
        Incident.status.in_([
            IncidentStatus.created, IncidentStatus.assigned,
            IncidentStatus.en_route, IncidentStatus.on_scene,
            IncidentStatus.transporting,
        ])
    ).count()

    total_ambulances = db.query(Ambulance).count()
    available_ambulances = db.query(Ambulance).filter(
        Ambulance.status == AmbulanceStatus.available
    ).count()

    bed_stats = db.query(
        func.coalesce(func.sum(Hospital.total_icu_beds), 0),
        func.coalesce(func.sum(Hospital.available_icu_beds), 0),
    ).first()

    return SystemStats(
        total_users=total_users,
        total_patients=total_patients,
        total_ems=total_ems,
        total_hospitals=total_hospitals_count,
        total_incidents=total_incidents,
        active_incidents=active_incidents,
        available_ambulances=available_ambulances,
        total_ambulances=total_ambulances,
        total_hospital_beds=int(bed_stats[0]),
        available_hospital_beds=int(bed_stats[1]),
    )


@router.get("/users", response_model=list[UserOut])
def get_all_users(
    role: str = Query(None, description="Filter by role"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Get all users, optionally filtered by role."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == UserRole(role))
    return query.order_by(User.id).all()


@router.get("/incidents", response_model=list[IncidentDetail])
def get_all_incidents(
    status_filter: str = Query(None, alias="status", description="Filter by status"),
    severity_filter: str = Query(None, alias="severity", description="Filter by severity"),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Get all incidents with optional filters."""
    query = db.query(Incident)

    if status_filter:
        query = query.filter(Incident.status == IncidentStatus(status_filter))
    if severity_filter:
        query = query.filter(Incident.severity == Severity(severity_filter))

    incidents = query.order_by(Incident.created_at.desc()).limit(limit).all()

    results = []
    for inc in incidents:
        patient = inc.patient
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
            patient_name=patient.name if patient else None,
            ambulance=AmbulanceOut.model_validate(amb) if amb else None,
            hospital=HospitalOut.model_validate(hosp) if hosp else None,
        ))
    return results


@router.get("/ambulances", response_model=list[AmbulanceOut])
def get_all_ambulances(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Get all ambulances."""
    return db.query(Ambulance).all()


@router.get("/hospitals", response_model=list[HospitalOut])
def get_all_hospitals(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Get all hospitals."""
    return db.query(Hospital).all()


@router.get("/audit-logs", response_model=list[AuditLogOut])
def get_audit_logs(
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Get recent audit logs."""
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return logs
