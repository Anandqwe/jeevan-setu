"""
SQLAlchemy ORM models for all database entities.
Jeevan Setu v2 — National-Scale Emergency Command Platform.
"""

import datetime
import uuid
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text,
    Enum as SAEnum, Index
)
from sqlalchemy.orm import relationship
from database import Base
import enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    patient = "patient"
    ems = "ems"
    hospital = "hospital"
    admin = "admin"


class AmbulanceStatus(str, enum.Enum):
    available = "available"
    busy = "busy"
    off_duty = "off_duty"


class IncidentStatus(str, enum.Enum):
    created = "created"
    assigned = "assigned"
    en_route = "en_route"
    on_scene = "on_scene"
    transporting = "transporting"
    completed = "completed"
    cancelled = "cancelled"


class Severity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class NotificationType(str, enum.Enum):
    incident_created = "incident_created"
    ambulance_assigned = "ambulance_assigned"
    hospital_assigned = "hospital_assigned"
    status_update = "status_update"
    chat_message = "chat_message"
    system_alert = "system_alert"


# ─── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    ambulance = relationship("Ambulance", back_populates="user", uselist=False)
    hospital = relationship("Hospital", back_populates="user", uselist=False)


class Ambulance(Base):
    __tablename__ = "ambulances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    latitude = Column(Float, nullable=False, default=0.0)
    longitude = Column(Float, nullable=False, default=0.0)
    status = Column(SAEnum(AmbulanceStatus), default=AmbulanceStatus.available, nullable=False)
    capability_level = Column(String(50), default="BLS")  # BLS / ALS / Critical Care
    active_incident_count = Column(Integer, default=0)

    # Relationships
    user = relationship("User", back_populates="ambulance")


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    name = Column(String(200), nullable=False, default="Unnamed Hospital")
    latitude = Column(Float, nullable=False, default=0.0)
    longitude = Column(Float, nullable=False, default=0.0)
    specialty = Column(String(100), default="general")  # general, trauma, cardiac, neuro, burn
    total_icu_beds = Column(Integer, default=10)
    available_icu_beds = Column(Integer, default=10)

    # Relationships
    user = relationship("User", back_populates="hospital")

    @property
    def occupancy_rate(self) -> float:
        if self.total_icu_beds == 0:
            return 1.0
        return 1.0 - (self.available_icu_beds / self.total_icu_beds)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ambulance_id = Column(Integer, ForeignKey("ambulances.id"), nullable=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    severity = Column(SAEnum(Severity), default=Severity.medium, nullable=False)
    status = Column(SAEnum(IncidentStatus), default=IncidentStatus.created, nullable=False)
    description = Column(String(500), default="")
    response_time_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    patient = relationship("User", foreign_keys=[patient_id])
    ambulance = relationship("Ambulance", foreign_keys=[ambulance_id])
    hospital = relationship("Hospital", foreign_keys=[hospital_id])
    timeline = relationship("IncidentTimeline", back_populates="incident", order_by="IncidentTimeline.created_at")

    __table_args__ = (
        Index("ix_incidents_status", "status"),
        Index("ix_incidents_severity", "severity"),
        Index("ix_incidents_created_at", "created_at"),
    )


class IncidentTimeline(Base):
    """Tracks every state change and event for an incident."""
    __tablename__ = "incident_timelines"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    event = Column(String(100), nullable=False)  # e.g., "status_change", "ambulance_assigned"
    from_status = Column(String(50), nullable=True)
    to_status = Column(String(50), nullable=True)
    details = Column(Text, default="")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    incident = relationship("Incident", back_populates="timeline")
    user = relationship("User")

    __table_args__ = (
        Index("ix_timeline_incident", "incident_id"),
    )


class AuditLog(Base):
    """Audit trail for security-sensitive actions."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    resource = Column(String(100), nullable=True)
    resource_id = Column(Integer, nullable=True)
    details = Column(Text, default="")
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")

    __table_args__ = (
        Index("ix_audit_created", "created_at"),
        Index("ix_audit_user", "user_id"),
    )


class ChatMessage(Base):
    """Real-time chat messages linked to incidents."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sender = relationship("User")
    incident = relationship("Incident")

    __table_args__ = (
        Index("ix_chat_incident", "incident_id"),
    )


class Notification(Base):
    """Persistent notifications for users."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(SAEnum(NotificationType), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, default="")
    is_read = Column(Boolean, default=False)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")

    __table_args__ = (
        Index("ix_notif_user_read", "user_id", "is_read"),
    )


class RefreshToken(Base):
    """Refresh tokens for token rotation."""
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")

    __table_args__ = (
        Index("ix_refresh_token", "token"),
    )
