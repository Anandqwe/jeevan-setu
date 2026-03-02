"""
Analytics routes: incident trends, response times, ambulance utilization, hospital occupancy.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta

from database import get_db
from models import (
    User, Ambulance, Hospital, Incident, IncidentStatus,
    AmbulanceStatus, Severity
)
from schemas import (
    IncidentTrend, ResponseTimeStats, AmbulanceUtilization, HospitalOccupancy
)
from auth import require_role

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/incident-trends", response_model=list[IncidentTrend])
def get_incident_trends(
    days: int = Query(30, le=365, description="Number of days to look back"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "ems", "hospital")),
):
    """Get incident counts grouped by day with severity breakdown."""
    start_date = datetime.utcnow() - timedelta(days=days)

    incidents = db.query(Incident).filter(
        Incident.created_at >= start_date
    ).all()

    # Group by date
    daily_data: dict = {}
    for inc in incidents:
        date_key = inc.created_at.strftime("%Y-%m-%d")
        if date_key not in daily_data:
            daily_data[date_key] = {"count": 0, "severity_breakdown": {}}
        daily_data[date_key]["count"] += 1
        sev = inc.severity.value
        daily_data[date_key]["severity_breakdown"][sev] = \
            daily_data[date_key]["severity_breakdown"].get(sev, 0) + 1

    # Fill missing dates
    results = []
    current = start_date
    while current <= datetime.utcnow():
        date_key = current.strftime("%Y-%m-%d")
        data = daily_data.get(date_key, {"count": 0, "severity_breakdown": {}})
        results.append(IncidentTrend(
            date=date_key,
            count=data["count"],
            severity_breakdown=data["severity_breakdown"],
        ))
        current += timedelta(days=1)

    return results


@router.get("/response-times", response_model=ResponseTimeStats)
def get_response_time_stats(
    days: int = Query(30, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "ems", "hospital")),
):
    """Get response time statistics."""
    start_date = datetime.utcnow() - timedelta(days=days)

    incidents = db.query(Incident).filter(
        Incident.created_at >= start_date,
        Incident.response_time_seconds.isnot(None),
    ).all()

    if not incidents:
        return ResponseTimeStats(
            average_seconds=0, median_seconds=0,
            min_seconds=0, max_seconds=0, by_severity={}
        )

    times = [inc.response_time_seconds for inc in incidents]
    times.sort()

    by_severity = {}
    for inc in incidents:
        sev = inc.severity.value
        if sev not in by_severity:
            by_severity[sev] = []
        by_severity[sev].append(inc.response_time_seconds)

    avg_by_severity = {}
    for sev, sev_times in by_severity.items():
        avg_by_severity[sev] = sum(sev_times) / len(sev_times)

    median_idx = len(times) // 2

    return ResponseTimeStats(
        average_seconds=sum(times) / len(times),
        median_seconds=times[median_idx],
        min_seconds=min(times),
        max_seconds=max(times),
        by_severity=avg_by_severity,
    )


@router.get("/ambulance-utilization", response_model=list[AmbulanceUtilization])
def get_ambulance_utilization(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "ems")),
):
    """Get utilization stats for each ambulance."""
    ambulances = db.query(Ambulance).all()

    results = []
    for amb in ambulances:
        total_incidents = db.query(Incident).filter(
            Incident.ambulance_id == amb.id
        ).count()

        results.append(AmbulanceUtilization(
            ambulance_id=amb.id,
            capability_level=amb.capability_level,
            total_incidents=total_incidents,
            status=amb.status.value,
        ))

    return results


@router.get("/hospital-occupancy", response_model=list[HospitalOccupancy])
def get_hospital_occupancy(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hospital")),
):
    """Get occupancy stats for each hospital."""
    hospitals = db.query(Hospital).all()

    results = []
    for hosp in hospitals:
        active_cases = db.query(Incident).filter(
            Incident.hospital_id == hosp.id,
            Incident.status.in_([
                IncidentStatus.assigned, IncidentStatus.en_route,
                IncidentStatus.on_scene, IncidentStatus.transporting,
            ])
        ).count()

        occupancy = 1.0 - (hosp.available_icu_beds / max(hosp.total_icu_beds, 1))

        results.append(HospitalOccupancy(
            hospital_id=hosp.id,
            name=hosp.name,
            specialty=hosp.specialty,
            total_beds=hosp.total_icu_beds,
            available_beds=hosp.available_icu_beds,
            occupancy_rate=round(occupancy, 2),
            active_cases=active_cases,
        ))

    return results
