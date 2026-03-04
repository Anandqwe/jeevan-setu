import enum
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Float, Enum, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.database import Base


class AmbulanceStatus(str, enum.Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"


class Ambulance(Base):
    __tablename__ = "ambulances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    vehicle_number = Column(String(50), nullable=True)
    latitude = Column(Float, nullable=False, default=0.0)
    longitude = Column(Float, nullable=False, default=0.0)
    status = Column(Enum(AmbulanceStatus), default=AmbulanceStatus.AVAILABLE, nullable=False, index=True)
    capability_level = Column(String(50), default="basic")  # basic, intermediate, advanced
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = relationship("User", back_populates="ambulance")
    incidents = relationship("Incident", back_populates="ambulance")

    # Composite index for geo queries
    __table_args__ = (
        Index("ix_ambulances_lat_lng", "latitude", "longitude"),
    )

    def __repr__(self):
        return f"<Ambulance(id={self.id}, status={self.status})>"
