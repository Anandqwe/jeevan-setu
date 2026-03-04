import enum
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Float, Enum, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship

from app.database import Base


class IncidentSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IncidentStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    AMBULANCE_ASSIGNED = "AMBULANCE_ASSIGNED"
    EN_ROUTE_TO_PATIENT = "EN_ROUTE_TO_PATIENT"
    PATIENT_PICKED_UP = "PATIENT_PICKED_UP"
    EN_ROUTE_TO_HOSPITAL = "EN_ROUTE_TO_HOSPITAL"
    ARRIVED_AT_HOSPITAL = "ARRIVED_AT_HOSPITAL"
    TREATMENT_STARTED = "TREATMENT_STARTED"
    COMPLETED = "COMPLETED"


# Valid state transitions
VALID_TRANSITIONS = {
    IncidentStatus.REQUESTED: [IncidentStatus.AMBULANCE_ASSIGNED],
    IncidentStatus.AMBULANCE_ASSIGNED: [IncidentStatus.EN_ROUTE_TO_PATIENT],
    IncidentStatus.EN_ROUTE_TO_PATIENT: [IncidentStatus.PATIENT_PICKED_UP],
    IncidentStatus.PATIENT_PICKED_UP: [IncidentStatus.EN_ROUTE_TO_HOSPITAL],
    IncidentStatus.EN_ROUTE_TO_HOSPITAL: [IncidentStatus.ARRIVED_AT_HOSPITAL],
    IncidentStatus.ARRIVED_AT_HOSPITAL: [IncidentStatus.TREATMENT_STARTED],
    IncidentStatus.TREATMENT_STARTED: [IncidentStatus.COMPLETED],
    IncidentStatus.COMPLETED: [],
}

# Severity-to-specialty mapping for dispatch
SEVERITY_SPECIALTY_MAP = {
    IncidentSeverity.CRITICAL: ["trauma_center", "emergency"],
    IncidentSeverity.HIGH: ["emergency", "cardiac", "neuro"],
    IncidentSeverity.MEDIUM: ["general", "emergency"],
    IncidentSeverity.LOW: ["general"],
}


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    ambulance_id = Column(Integer, ForeignKey("ambulances.id"), nullable=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    severity = Column(Enum(IncidentSeverity), nullable=False, default=IncidentSeverity.MEDIUM)
    status = Column(
        Enum(IncidentStatus),
        nullable=False,
        default=IncidentStatus.REQUESTED,
        index=True,
    )
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    patient = relationship("User", back_populates="incidents", foreign_keys=[patient_id])
    ambulance = relationship("Ambulance", back_populates="incidents")
    hospital = relationship("Hospital", back_populates="incidents")

    def __repr__(self):
        return f"<Incident(id={self.id}, status={self.status}, severity={self.severity})>"
