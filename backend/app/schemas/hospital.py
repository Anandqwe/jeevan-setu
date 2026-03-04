from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class HospitalBase(BaseModel):
    name: str
    address: Optional[str] = None
    latitude: float = 0.0
    longitude: float = 0.0
    specialty: str
    total_icu_beds: int = 0
    available_icu_beds: int = 0
    phone: Optional[str] = None


class HospitalCreate(HospitalBase):
    user_id: int


class HospitalResponse(HospitalBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class HospitalBedUpdate(BaseModel):
    available_icu_beds: int
