from typing import Dict, Any
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.incident import Incident, IncidentStatus, IncidentSeverity
from app.models.ambulance import Ambulance, AmbulanceStatus
from app.models.hospital import Hospital
from app.websocket.manager import manager


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

        # Ambulance stats
        ambulance_total_result = await self.db.execute(select(func.count(Ambulance.id)))
        total_ambulances = ambulance_total_result.scalar() or 0

        ambulance_status_counts = {}
        for amb_status in AmbulanceStatus:
            result = await self.db.execute(
                select(func.count(Ambulance.id)).where(
                    Ambulance.status == amb_status
                )
            )
            ambulance_status_counts[amb_status.value] = result.scalar() or 0

        # Hospital stats
        hospital_total_result = await self.db.execute(select(func.count(Hospital.id)))
        total_hospitals = hospital_total_result.scalar() or 0

        available_beds_result = await self.db.execute(
            select(func.sum(Hospital.available_icu_beds))
        )
        total_available_beds = available_beds_result.scalar() or 0

        total_beds_result = await self.db.execute(
            select(func.sum(Hospital.total_icu_beds))
        )
        total_icu_beds = total_beds_result.scalar() or 0

        # Connected WebSocket clients
        ws_count = 0
        try:
            ws_count = manager.connected_count
        except Exception:
            pass

        return {
            "total_incidents": total_incidents,
            "active_incidents": active_incidents,
            "completed_incidents": completed_incidents,
            "incidents_by_severity": severity_counts,
            "incidents_by_status": status_counts,
            "total_ambulances": total_ambulances,
            "available_ambulances": ambulance_status_counts.get("available", 0),
            "busy_ambulances": ambulance_status_counts.get("busy", 0),
            "ambulances_by_status": ambulance_status_counts,
            "total_hospitals": total_hospitals,
            "total_icu_beds": total_icu_beds,
            "available_icu_beds": total_available_beds,
            "bed_occupancy_percent": round(
                ((total_icu_beds - total_available_beds) / total_icu_beds * 100)
                if total_icu_beds > 0 else 0, 1
            ),
            "connected_websockets": ws_count,
        }


# Import at bottom to avoid circular
from app.websocket.manager import manager
