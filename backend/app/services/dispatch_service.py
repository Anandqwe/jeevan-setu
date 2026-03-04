from typing import Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ambulance import Ambulance, AmbulanceStatus
from app.models.hospital import Hospital
from app.models.incident import Incident, IncidentStatus, IncidentSeverity, SEVERITY_SPECIALTY_MAP
from app.repositories.ambulance_repo import AmbulanceRepository
from app.repositories.hospital_repo import HospitalRepository
from app.repositories.incident_repo import IncidentRepository
from app.utils.geo import haversine_distance
from app.websocket.manager import manager
from app.websocket.events import (
    emergency_requested_msg,
    incident_created_msg,
    ambulance_assigned_msg,
    hospital_assigned_msg,
)


class DispatchService:
    """
    Core dispatch engine implementing the 8-step synchronous pipeline.
    """

    def __init__(self, db: AsyncSession):
        self.ambulance_repo = AmbulanceRepository(db)
        self.hospital_repo = HospitalRepository(db)
        self.incident_repo = IncidentRepository(db)
        self.db = db

    async def dispatch(
        self,
        patient_id: int,
        latitude: float,
        longitude: float,
        severity: str,
        description: Optional[str] = None,
    ) -> Incident:
        """
        Execute the 8-step dispatch pipeline:
        1. Fetch available ambulances
        2. Calculate distances (Haversine)
        3. Select nearest ambulance
        4. Fetch eligible hospitals
        5. Select nearest valid hospital
        6. Create incident record
        7. Update ambulance status
        8. Broadcast events via WebSocket
        """
        severity_enum = IncidentSeverity(severity)

        # Step 1: Fetch available ambulances
        available_ambulances = await self.ambulance_repo.get_available()

        # Step 2 & 3: Calculate distances and select nearest
        nearest_ambulance = None
        if available_ambulances:
            ambulance_distances = []
            for amb in available_ambulances:
                dist = haversine_distance(latitude, longitude, amb.latitude, amb.longitude)
                ambulance_distances.append((amb, dist))
            ambulance_distances.sort(key=lambda x: x[1])
            nearest_ambulance = ambulance_distances[0][0]

        # Step 4: Fetch eligible hospitals
        required_specialties = SEVERITY_SPECIALTY_MAP.get(severity_enum, ["general"])
        eligible_hospitals = await self.hospital_repo.get_by_specialty(required_specialties)

        # Step 5: Select nearest valid hospital
        nearest_hospital = None
        if eligible_hospitals:
            hospital_distances = []
            for hosp in eligible_hospitals:
                dist = haversine_distance(latitude, longitude, hosp.latitude, hosp.longitude)
                hospital_distances.append((hosp, dist))
            hospital_distances.sort(key=lambda x: x[1])
            nearest_hospital = hospital_distances[0][0]

        # Step 6: Create incident record
        incident = Incident(
            patient_id=patient_id,
            ambulance_id=nearest_ambulance.id if nearest_ambulance else None,
            hospital_id=nearest_hospital.id if nearest_hospital else None,
            latitude=latitude,
            longitude=longitude,
            severity=severity_enum,
            status=IncidentStatus.AMBULANCE_ASSIGNED if nearest_ambulance else IncidentStatus.REQUESTED,
            description=description,
        )
        incident = await self.incident_repo.create(incident)

        # Step 7: Update ambulance status
        if nearest_ambulance:
            await self.ambulance_repo.update_status(nearest_ambulance.id, AmbulanceStatus.BUSY)

        # Step 8: Broadcast events via WebSocket
        incident_data = {
            "incident_id": incident.id,
            "patient_id": patient_id,
            "latitude": latitude,
            "longitude": longitude,
            "severity": severity,
            "status": incident.status.value,
            "ambulance_id": nearest_ambulance.id if nearest_ambulance else None,
            "hospital_id": nearest_hospital.id if nearest_hospital else None,
        }

        # Notify all admins
        await manager.broadcast_to_role("ADMIN", emergency_requested_msg(incident_data))

        # Notify patient
        await manager.send_personal(patient_id, incident_created_msg(incident_data))

        # Join incident room
        manager.join_incident_room(incident.id, patient_id)

        if nearest_ambulance:
            # Notify assigned EMS driver
            await manager.send_personal(
                nearest_ambulance.user_id,
                ambulance_assigned_msg(incident_data),
            )
            manager.join_incident_room(incident.id, nearest_ambulance.user_id)

        if nearest_hospital:
            # Notify hospital
            await manager.send_personal(
                nearest_hospital.user_id,
                hospital_assigned_msg(incident_data),
            )
            manager.join_incident_room(incident.id, nearest_hospital.user_id)

        return incident

    async def override_ambulance(
        self, incident_id: int, new_ambulance_id: int
    ) -> Incident:
        """Admin override: Reassign ambulance to an incident."""
        incident = await self.incident_repo.get_by_id(incident_id)
        if not incident:
            raise ValueError("Incident not found")

        new_ambulance = await self.ambulance_repo.get_by_id(new_ambulance_id)
        if not new_ambulance:
            raise ValueError("Ambulance not found")

        # Free old ambulance if exists
        if incident.ambulance_id:
            await self.ambulance_repo.update_status(
                incident.ambulance_id, AmbulanceStatus.AVAILABLE
            )

        # Assign new ambulance
        await self.ambulance_repo.update_status(new_ambulance_id, AmbulanceStatus.BUSY)
        incident = await self.incident_repo.update_ambulance(incident_id, new_ambulance_id)

        if incident.status == IncidentStatus.REQUESTED:
            incident = await self.incident_repo.update_status(
                incident_id, IncidentStatus.AMBULANCE_ASSIGNED
            )

        # Broadcast update
        incident_data = {
            "incident_id": incident_id,
            "new_ambulance_id": new_ambulance_id,
            "status": incident.status.value,
        }
        await manager.broadcast_to_incident(incident_id, ambulance_assigned_msg(incident_data))
        manager.join_incident_room(incident_id, new_ambulance.user_id)

        return incident

    async def override_hospital(
        self, incident_id: int, new_hospital_id: int
    ) -> Incident:
        """Admin override: Change hospital destination."""
        incident = await self.incident_repo.get_by_id(incident_id)
        if not incident:
            raise ValueError("Incident not found")

        new_hospital = await self.hospital_repo.get_by_id(new_hospital_id)
        if not new_hospital:
            raise ValueError("Hospital not found")

        incident = await self.incident_repo.update_hospital(incident_id, new_hospital_id)

        incident_data = {
            "incident_id": incident_id,
            "new_hospital_id": new_hospital_id,
        }
        await manager.broadcast_to_incident(incident_id, hospital_assigned_msg(incident_data))
        manager.join_incident_room(incident_id, new_hospital.user_id)

        return incident
