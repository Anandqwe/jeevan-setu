from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AmbulanceBase(BaseModel):
    vehicle_number: Optional[str] = None
    latitude: float = 0.0
    longitude: float = 0.0
    capability_level: str = "basic"


class AmbulanceCreate(AmbulanceBase):
    user_id: int


class AmbulanceResponse(AmbulanceBase):
    id: int
    user_id: int
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AmbulanceLocationUpdate(BaseModel):
    latitude: float
    longitude: float


class AmbulanceStatusUpdate(BaseModel):
    status: str  # available, busy, offline
