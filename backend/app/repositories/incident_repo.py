from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.incident import Incident, IncidentStatus


class IncidentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, incident_id: int) -> Optional[Incident]:
        result = await self.db.execute(
            select(Incident).where(Incident.id == incident_id)
        )
        return result.scalar_one_or_none()

    async def get_by_patient_id(self, patient_id: int) -> List[Incident]:
        result = await self.db.execute(
            select(Incident)
            .where(Incident.patient_id == patient_id)
            .order_by(Incident.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_ambulance_id(self, ambulance_id: int) -> List[Incident]:
        result = await self.db.execute(
            select(Incident)
            .where(Incident.ambulance_id == ambulance_id)
            .order_by(Incident.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_hospital_id(self, hospital_id: int) -> List[Incident]:
        result = await self.db.execute(
            select(Incident)
            .where(Incident.hospital_id == hospital_id)
            .order_by(Incident.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_active(self) -> List[Incident]:
        result = await self.db.execute(
            select(Incident)
            .where(Incident.status != IncidentStatus.COMPLETED)
            .order_by(Incident.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_all(self) -> List[Incident]:
        result = await self.db.execute(
            select(Incident).order_by(Incident.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(self, incident: Incident) -> Incident:
        self.db.add(incident)
        await self.db.flush()
        await self.db.refresh(incident)
        return incident

    async def update_status(
        self, incident_id: int, status: IncidentStatus
    ) -> Optional[Incident]:
        incident = await self.get_by_id(incident_id)
        if incident:
            incident.status = status
            await self.db.flush()
            await self.db.refresh(incident)
        return incident

    async def update_ambulance(
        self, incident_id: int, ambulance_id: int
    ) -> Optional[Incident]:
        incident = await self.get_by_id(incident_id)
        if incident:
            incident.ambulance_id = ambulance_id
            await self.db.flush()
            await self.db.refresh(incident)
        return incident

    async def update_hospital(
        self, incident_id: int, hospital_id: int
    ) -> Optional[Incident]:
        incident = await self.get_by_id(incident_id)
        if incident:
            incident.hospital_id = hospital_id
            await self.db.flush()
            await self.db.refresh(incident)
        return incident
