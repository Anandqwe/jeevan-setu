from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class IncidentCreate(BaseModel):
    latitude: float
    longitude: float
    severity: str = "MEDIUM"  # LOW, MEDIUM, HIGH, CRITICAL
    description: Optional[str] = None


class IncidentResponse(BaseModel):
    id: int
    patient_id: int
    ambulance_id: Optional[int] = None
    hospital_id: Optional[int] = None
    latitude: float
    longitude: float
    severity: str
    status: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class IncidentStatusUpdate(BaseModel):
    status: str


class IncidentWithDetails(IncidentResponse):
    """Incident with related entity details."""
    patient_name: Optional[str] = None
    ambulance_vehicle: Optional[str] = None
    ambulance_lat: Optional[float] = None
    ambulance_lng: Optional[float] = None
    hospital_name: Optional[str] = None
    hospital_lat: Optional[float] = None
    hospital_lng: Optional[float] = None


class OverrideAmbulance(BaseModel):
    incident_id: int
    new_ambulance_id: int


class OverrideHospital(BaseModel):
    incident_id: int
    new_hospital_id: int
