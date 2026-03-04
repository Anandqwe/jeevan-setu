from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.hospital import Hospital


class HospitalRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, hospital_id: int) -> Optional[Hospital]:
        result = await self.db.execute(
            select(Hospital).where(Hospital.id == hospital_id)
        )
        return result.scalar_one_or_none()

    async def get_by_user_id(self, user_id: int) -> Optional[Hospital]:
        result = await self.db.execute(
            select(Hospital).where(Hospital.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_all(self) -> List[Hospital]:
        result = await self.db.execute(select(Hospital))
        return list(result.scalars().all())

    async def get_with_available_beds(self) -> List[Hospital]:
        result = await self.db.execute(
            select(Hospital).where(Hospital.available_icu_beds > 0)
        )
        return list(result.scalars().all())

    async def get_by_specialty(self, specialties: List[str]) -> List[Hospital]:
        result = await self.db.execute(
            select(Hospital).where(
                Hospital.specialty.in_(specialties),
                Hospital.available_icu_beds > 0,
            )
        )
        return list(result.scalars().all())

    async def create(self, hospital: Hospital) -> Hospital:
        self.db.add(hospital)
        await self.db.flush()
        await self.db.refresh(hospital)
        return hospital

    async def update_beds(
        self, hospital_id: int, available_icu_beds: int
    ) -> Optional[Hospital]:
        hospital = await self.get_by_id(hospital_id)
        if hospital:
            hospital.available_icu_beds = available_icu_beds
            await self.db.flush()
            await self.db.refresh(hospital)
        return hospital
