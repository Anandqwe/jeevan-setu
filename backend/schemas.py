"""
Pydantic schemas for request/response validation.
Jeevan Setu v2 — National-Scale Emergency Command Platform.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ─── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: str  # patient / ems / hospital

    # Optional fields for EMS registration
    ambulance_lat: Optional[float] = None
    ambulance_lon: Optional[float] = None
    capability_level: Optional[str] = "BLS"

    # Optional fields for Hospital registration
    hospital_name: Optional[str] = None
    hospital_lat: Optional[float] = None
    hospital_lon: Optional[float] = None
    specialty: Optional[str] = "general"
    total_icu_beds: Optional[int] = 10


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True


# ─── Ambulance ────────────────────────────────────────────────────────────────

class AmbulanceOut(BaseModel):
    id: int
    user_id: int
    latitude: float
    longitude: float
    status: str
    capability_level: str

    class Config:
        from_attributes = True


class AmbulanceLocationUpdate(BaseModel):
    latitude: float
    longitude: float


class AmbulanceStatusUpdate(BaseModel):
    status: str  # available / busy / off_duty


# ─── Hospital ────────────────────────────────────────────────────────────────

class HospitalOut(BaseModel):
    id: int
    user_id: int
    name: str
    latitude: float
    longitude: float
    specialty: str
    total_icu_beds: int
    available_icu_beds: int

    class Config:
        from_attributes = True


class HospitalBedsUpdate(BaseModel):
    available_icu_beds: int


# ─── Incident ────────────────────────────────────────────────────────────────

class EmergencyRequest(BaseModel):
    latitude: float
    longitude: float
    severity: str = "medium"  # low / medium / high / critical
    description: str = ""


class MockLocationOut(BaseModel):
    latitude: float
    longitude: float
    label: str = ""


class IncidentOut(BaseModel):
    id: int
    patient_id: int
    ambulance_id: Optional[int] = None
    hospital_id: Optional[int] = None
    latitude: float
    longitude: float
    severity: str
    status: str
    description: str
    hospital_ready: bool = False
    patient_reached_hospital: bool = False
    eta_minutes: Optional[int] = None
    distance_km: Optional[float] = None
    ambulance_last_lat: Optional[float] = None
    ambulance_last_lng: Optional[float] = None
    ambulance_last_seen_at: Optional[datetime] = None
    arrived_at_hospital_at: Optional[datetime] = None
    handover_completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IncidentDetail(BaseModel):
    """Extended incident info with related entity details."""
    id: int
    patient_id: int
    ambulance_id: Optional[int] = None
    hospital_id: Optional[int] = None
    latitude: float
    longitude: float
    severity: str
    status: str
    description: str
    hospital_ready: bool = False
    patient_reached_hospital: bool = False
    eta_minutes: Optional[int] = None
    distance_km: Optional[float] = None
    ambulance_last_lat: Optional[float] = None
    ambulance_last_lng: Optional[float] = None
    ambulance_last_seen_at: Optional[datetime] = None
    arrived_at_hospital_at: Optional[datetime] = None
    handover_completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    patient_name: Optional[str] = None
    ambulance: Optional[AmbulanceOut] = None
    hospital: Optional[HospitalOut] = None

    class Config:
        from_attributes = True


class IncidentStatusUpdate(BaseModel):
    status: str  # en_route / on_scene / transporting / completed / cancelled


class HospitalReadinessUpdate(BaseModel):
    hospital_ready: bool


class IncidentArrivalUpdate(BaseModel):
    patient_reached_hospital: bool


class IncidentHandoverUpdate(BaseModel):
    handover_completed: bool


# ─── Incident Timeline ──────────────────────────────────────────────────────

class TimelineEntry(BaseModel):
    id: int
    incident_id: int
    event: str
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    details: str = ""
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Chat ─────────────────────────────────────────────────────────────────────

class ChatMessageCreate(BaseModel):
    incident_id: int
    message: str


class ChatMessageOut(BaseModel):
    id: int
    incident_id: int
    sender_id: int
    sender_name: Optional[str] = None
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Notifications ────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    is_read: bool
    incident_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Admin / Analytics ────────────────────────────────────────────────────────

class SystemStats(BaseModel):
    total_users: int
    total_patients: int
    total_ems: int
    total_hospitals: int
    total_incidents: int
    active_incidents: int
    available_ambulances: int
    total_ambulances: int
    total_hospital_beds: int
    available_hospital_beds: int


class IncidentTrend(BaseModel):
    date: str
    count: int
    severity_breakdown: dict = {}


class ResponseTimeStats(BaseModel):
    average_seconds: float
    median_seconds: float
    min_seconds: float
    max_seconds: float
    by_severity: dict = {}


class AmbulanceUtilization(BaseModel):
    ambulance_id: int
    capability_level: str
    total_incidents: int
    status: str


class HospitalOccupancy(BaseModel):
    hospital_id: int
    name: str
    specialty: str
    total_beds: int
    available_beds: int
    occupancy_rate: float
    active_cases: int


# ─── WebSocket Events ────────────────────────────────────────────────────────

class WSEvent(BaseModel):
    type: str
    data: dict = {}


class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    resource: Optional[str] = None
    resource_id: Optional[int] = None
    details: str = ""
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
