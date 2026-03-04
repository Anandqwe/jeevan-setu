from typing import Dict, Any
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.incident import Incident, IncidentStatus, IncidentSeverity
from app.models.ambulance import Ambulance, AmbulanceStatus
from app.models.hospital import Hospital


class AnalyticsService:
    """System-wide analytics and statistics."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_analytics(self) -> Dict[str, Any]:
        """Get system-wide analytics data."""

        # Total incidents
        total_result = await self.db.execute(select(func.count(Incident.id)))
        total_incidents = total_result.scalar() or 0

        # Active incidents (not completed)
        active_result = await self.db.execute(
            select(func.count(Incident.id)).where(
                Incident.status != IncidentStatus.COMPLETED
            )
        )
        active_incidents = active_result.scalar() or 0

        # Completed incidents
        completed_incidents = total_incidents - active_incidents

        # Incidents by severity
        severity_counts = {}
        for severity in IncidentSeverity:
            result = await self.db.execute(
                select(func.count(Incident.id)).where(
                    Incident.severity == severity
                )
            )
            severity_counts[severity.value] = result.scalar() or 0

        # Incidents by status
        status_counts = {}
        for status in IncidentStatus:
            result = await self.db.execute(
                select(func.count(Incident.id)).where(
                    Incident.status == status
                )
            )
            status_counts[status.value] = result.scalar() or 0

        # Ambulance status counts
        ambulance_total_result = await self.db.execute(select(func.count(Ambulance.id)))
        total_ambulances = ambulance_total_result.scalar() or 0

        available_result = await self.db.execute(
            select(func.count(Ambulance.id)).where(
                Ambulance.status == AmbulanceStatus.AVAILABLE
            )
        )
        available_ambulances = available_result.scalar() or 0

        busy_result = await self.db.execute(
            select(func.count(Ambulance.id)).where(
                Ambulance.status == AmbulanceStatus.BUSY
            )
        )
        busy_ambulances = busy_result.scalar() or 0

        # Hospital stats
        hospital_total_result = await self.db.execute(select(func.count(Hospital.id)))
        total_hospitals = hospital_total_result.scalar() or 0

        beds_result = await self.db.execute(select(func.sum(Hospital.available_icu_beds)))
        total_available_beds = beds_result.scalar() or 0

        # Average response time (time from REQUESTED to AMBULANCE_ASSIGNED)
        # Simplified: just return basic stats for now
        avg_response_time = None

        return {
            "total_incidents": total_incidents,
            "active_incidents": active_incidents,
            "completed_incidents": completed_incidents,
            "severity_counts": severity_counts,
            "status_counts": status_counts,
            "total_ambulances": total_ambulances,
            "available_ambulances": available_ambulances,
            "busy_ambulances": busy_ambulances,
            "total_hospitals": total_hospitals,
            "total_available_beds": total_available_beds,
            "avg_response_time_seconds": avg_response_time,
            "connected_websockets": manager.connected_count if manager else 0,
        }


# Import at bottom to avoid circular
from app.websocket.manager import manager
