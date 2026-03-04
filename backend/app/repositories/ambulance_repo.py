from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ambulance import Ambulance, AmbulanceStatus


class AmbulanceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, ambulance_id: int) -> Optional[Ambulance]:
        result = await self.db.execute(
            select(Ambulance).where(Ambulance.id == ambulance_id)
        )
        return result.scalar_one_or_none()

    async def get_by_user_id(self, user_id: int) -> Optional[Ambulance]:
        result = await self.db.execute(
            select(Ambulance).where(Ambulance.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_available(self) -> List[Ambulance]:
        result = await self.db.execute(
            select(Ambulance).where(Ambulance.status == AmbulanceStatus.AVAILABLE)
        )
        return list(result.scalars().all())

    async def get_all(self) -> List[Ambulance]:
        result = await self.db.execute(select(Ambulance))
        return list(result.scalars().all())

    async def create(self, ambulance: Ambulance) -> Ambulance:
        self.db.add(ambulance)
        await self.db.flush()
        await self.db.refresh(ambulance)
        return ambulance

    async def update_location(
        self, ambulance_id: int, latitude: float, longitude: float
    ) -> Optional[Ambulance]:
        ambulance = await self.get_by_id(ambulance_id)
        if ambulance:
            ambulance.latitude = latitude
            ambulance.longitude = longitude
            await self.db.flush()
            await self.db.refresh(ambulance)
        return ambulance

    async def update_status(
        self, ambulance_id: int, status: AmbulanceStatus
    ) -> Optional[Ambulance]:
        ambulance = await self.get_by_id(ambulance_id)
        if ambulance:
            ambulance.status = status
            await self.db.flush()
            await self.db.refresh(ambulance)
        return ambulance
