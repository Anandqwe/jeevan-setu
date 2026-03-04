"""WebSocket event type definitions and message builders."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional


class WSEvent:
    """WebSocket event types."""
    CONNECTED = "connected"
    EMERGENCY_REQUESTED = "emergency_requested"
    INCIDENT_CREATED = "incident_created"
    AMBULANCE_ASSIGNED = "ambulance_assigned"
    HOSPITAL_ASSIGNED = "hospital_assigned"
    LOCATION_UPDATE = "location_update"
    AMBULANCE_POSITION = "ambulance_position"
    STATUS_CHANGED = "status_changed"
    BED_UPDATED = "bed_updated"
    ASSIGNMENT_OVERRIDE = "assignment_override"


def build_message(event: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Build a standardized WebSocket message."""
    return {
        "event": event,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def emergency_requested_msg(incident_data: dict) -> dict:
    return build_message(WSEvent.EMERGENCY_REQUESTED, incident_data)


def incident_created_msg(incident_data: dict) -> dict:
    return build_message(WSEvent.INCIDENT_CREATED, incident_data)


def ambulance_assigned_msg(incident_data: dict) -> dict:
    return build_message(WSEvent.AMBULANCE_ASSIGNED, incident_data)


def hospital_assigned_msg(incident_data: dict) -> dict:
    return build_message(WSEvent.HOSPITAL_ASSIGNED, incident_data)


def ambulance_position_msg(
    ambulance_id: int, latitude: float, longitude: float
) -> dict:
    return build_message(
        WSEvent.AMBULANCE_POSITION,
        {
            "ambulance_id": ambulance_id,
            "latitude": latitude,
            "longitude": longitude,
        },
    )


def status_changed_msg(incident_id: int, new_status: str) -> dict:
    return build_message(
        WSEvent.STATUS_CHANGED,
        {"incident_id": incident_id, "new_status": new_status},
    )


def bed_updated_msg(hospital_id: int, available_icu_beds: int) -> dict:
    return build_message(
        WSEvent.BED_UPDATED,
        {"hospital_id": hospital_id, "available_icu_beds": available_icu_beds},
    )
