from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.incident import Incident, IncidentStatus, VALID_TRANSITIONS
from app.models.ambulance import AmbulanceStatus
from app.repositories.incident_repo import IncidentRepository
from app.repositories.ambulance_repo import AmbulanceRepository
from app.repositories.hospital_repo import HospitalRepository
from app.websocket.manager import manager
from app.websocket.events import status_changed_msg


class IncidentService:
    """
    Manages incident lifecycle state machine.
    Validates transitions and handles side effects.
    """

    def __init__(self, db: AsyncSession):
        self.incident_repo = IncidentRepository(db)
        self.ambulance_repo = AmbulanceRepository(db)
        self.hospital_repo = HospitalRepository(db)

    async def transition_status(
        self, incident_id: int, new_status_str: str
    ) -> Incident:
        """
        Transition an incident to a new status.
        Validates the state machine and handles side effects.
        """
        incident = await self.incident_repo.get_by_id(incident_id)
        if not incident:
            raise ValueError("Incident not found")

        try:
            new_status = IncidentStatus(new_status_str)
        except ValueError:
            raise ValueError(f"Invalid status: {new_status_str}")

        # Validate transition
        allowed = VALID_TRANSITIONS.get(incident.status, [])
        if new_status not in allowed:
            raise ValueError(
                f"Invalid transition: {incident.status.value} → {new_status.value}. "
                f"Allowed: {[s.value for s in allowed]}"
            )

        # Update status
        incident = await self.incident_repo.update_status(incident_id, new_status)

        # Handle side effects
        await self._handle_side_effects(incident, new_status)

        # Broadcast status change
        await manager.broadcast_to_incident(
            incident_id,
            status_changed_msg(incident_id, new_status.value),
        )

        return incident

    async def _handle_side_effects(self, incident: Incident, new_status: IncidentStatus):
        """Handle side effects of status transitions."""

        if new_status == IncidentStatus.ARRIVED_AT_HOSPITAL:
            # Decrement hospital bed count
            if incident.hospital_id:
                hospital = await self.hospital_repo.get_by_id(incident.hospital_id)
                if hospital and hospital.available_icu_beds > 0:
                    await self.hospital_repo.update_beds(
                        incident.hospital_id,
                        hospital.available_icu_beds - 1,
                    )

        elif new_status == IncidentStatus.COMPLETED:
            # Free the ambulance
            if incident.ambulance_id:
                await self.ambulance_repo.update_status(
                    incident.ambulance_id, AmbulanceStatus.AVAILABLE
                )
            # Increment hospital bed count back
            if incident.hospital_id:
                hospital = await self.hospital_repo.get_by_id(incident.hospital_id)
                if hospital:
                    await self.hospital_repo.update_beds(
                        incident.hospital_id,
                        hospital.available_icu_beds + 1,
                    )

    async def force_close(self, incident_id: int) -> Incident:
        """Admin: Force-close an incident regardless of current state."""
        incident = await self.incident_repo.get_by_id(incident_id)
        if not incident:
            raise ValueError("Incident not found")

        if incident.status == IncidentStatus.COMPLETED:
            raise ValueError("Incident is already completed")

        # Free ambulance
        if incident.ambulance_id:
            await self.ambulance_repo.update_status(
                incident.ambulance_id, AmbulanceStatus.AVAILABLE
            )

        incident = await self.incident_repo.update_status(
            incident_id, IncidentStatus.COMPLETED
        )

        await manager.broadcast_to_incident(
            incident_id,
            status_changed_msg(incident_id, IncidentStatus.COMPLETED.value),
        )

        return incident
