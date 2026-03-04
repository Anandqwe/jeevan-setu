import enum
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.orm import relationship

from app.database import Base


class UserRole(str, enum.Enum):
    PATIENT = "PATIENT"
    EMS = "EMS"
    HOSPITAL = "HOSPITAL"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    ambulance = relationship("Ambulance", back_populates="user", uselist=False)
    hospital = relationship("Hospital", back_populates="user", uselist=False)
    incidents = relationship("Incident", back_populates="patient", foreign_keys="Incident.patient_id")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
