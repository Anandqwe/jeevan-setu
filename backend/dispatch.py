"""
Intelligent Dispatch Engine — Jeevan Setu v2
Weighted scoring: distance(0.5) + severity_match(0.25) + workload(0.15) + capability(0.1)
Includes surge mode detection and hospital load balancing.
"""

import math
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import Ambulance, Hospital, AmbulanceStatus, Incident, IncidentStatus

# Earth's radius in kilometers
EARTH_RADIUS_KM = 6371.0

# Maximum distance in km for scoring normalization
MAX_DISPATCH_DISTANCE_KM = 50.0

# ─── Scoring Weights ─────────────────────────────────────────────────────────
W_DISTANCE = 0.50
W_SEVERITY = 0.25
W_WORKLOAD = 0.15
W_CAPABILITY = 0.10

# Severity → specialty mapping for hospital matching
SEVERITY_SPECIALTY_MAP = {
    "low": ["general"],
    "medium": ["general", "trauma"],
    "high": ["trauma", "cardiac", "general"],
    "critical": ["trauma", "cardiac", "neuro", "burn", "general"],
}

# Capability scoring: higher = better for severity match
CAPABILITY_RANK = {
    "BLS": 1,
    "ALS": 2,
    "Critical Care": 3,
}

# Severity → minimum capability preference
SEVERITY_CAPABILITY_MAP = {
    "low": 1,       # BLS is fine
    "medium": 1,    # BLS is fine
    "high": 2,      # Prefer ALS
    "critical": 3,  # Prefer Critical Care
}

# Surge mode threshold: if active incidents exceed this ratio of available ambulances
SURGE_THRESHOLD = 0.8


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on Earth
    using the Haversine formula. Returns distance in kilometers.
    """
    lat1_r, lat2_r = math.radians(lat1), math.radians(lat2)
    lon1_r, lon2_r = math.radians(lon1), math.radians(lon2)

    dlat = lat2_r - lat1_r
    dlon = lon2_r - lon1_r

    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))

    return EARTH_RADIUS_KM * c


def _distance_score(distance_km: float) -> float:
    """Normalize distance to 0-1 score (closer = higher)."""
    return max(0.0, 1.0 - (distance_km / MAX_DISPATCH_DISTANCE_KM))


def _severity_match_score(ambulance_capability: str, severity: str) -> float:
    """Score how well ambulance capability matches incident severity."""
    cap_rank = CAPABILITY_RANK.get(ambulance_capability, 1)
    required_rank = SEVERITY_CAPABILITY_MAP.get(severity, 1)

    if cap_rank >= required_rank:
        return 1.0
    elif cap_rank == required_rank - 1:
        return 0.6
    else:
        return 0.3


def _workload_score(ambulance: Ambulance, db: Session) -> float:
    """Score based on current workload (fewer active incidents = higher score)."""
    active_count = db.query(Incident).filter(
        Incident.ambulance_id == ambulance.id,
        Incident.status.in_([
            IncidentStatus.assigned,
            IncidentStatus.en_route,
            IncidentStatus.on_scene,
            IncidentStatus.transporting,
        ])
    ).count()

    if active_count == 0:
        return 1.0
    elif active_count == 1:
        return 0.5
    else:
        return max(0.1, 1.0 - (active_count * 0.3))


def _capability_score(ambulance_capability: str) -> float:
    """Higher capabilities get slight preference (a tiebreaker)."""
    rank = CAPABILITY_RANK.get(ambulance_capability, 1)
    return rank / 3.0


def is_surge_mode(db: Session) -> bool:
    """Detect if the system is in surge mode (high incident-to-ambulance ratio)."""
    total_ambulances = db.query(Ambulance).count()
    if total_ambulances == 0:
        return True

    active_incidents = db.query(Incident).filter(
        Incident.status.in_([
            IncidentStatus.created,
            IncidentStatus.assigned,
            IncidentStatus.en_route,
            IncidentStatus.on_scene,
            IncidentStatus.transporting,
        ])
    ).count()

    return (active_incidents / total_ambulances) >= SURGE_THRESHOLD


def find_nearest_ambulance(lat: float, lon: float, db: Session, severity: str = "medium") -> Ambulance | None:
    """
    Find the best ambulance using weighted scoring.

    Scoring: distance(0.5) + severity_match(0.25) + workload(0.15) + capability(0.1)

    In surge mode, relaxes availability constraints.
    """
    ambulances = db.query(Ambulance).filter(
        Ambulance.status == AmbulanceStatus.available
    ).all()

    if not ambulances:
        # Surge fallback: consider busy ambulances if no available ones
        if is_surge_mode(db):
            ambulances = db.query(Ambulance).filter(
                Ambulance.status != AmbulanceStatus.off_duty
            ).all()

    if not ambulances:
        return None

    scored = []
    for amb in ambulances:
        dist = haversine(lat, lon, amb.latitude, amb.longitude)

        d_score = _distance_score(dist)
        s_score = _severity_match_score(amb.capability_level, severity)
        w_score = _workload_score(amb, db)
        c_score = _capability_score(amb.capability_level)

        total = (
            W_DISTANCE * d_score +
            W_SEVERITY * s_score +
            W_WORKLOAD * w_score +
            W_CAPABILITY * c_score
        )

        scored.append((amb, total, dist))

    # Sort by total score descending (best first)
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[0][0] if scored else None


def find_nearest_hospital(lat: float, lon: float, severity: str, db: Session) -> Hospital | None:
    """
    Find the best hospital with load balancing.

    Considers specialty match, distance, and occupancy rate.
    """
    valid_specialties = SEVERITY_SPECIALTY_MAP.get(severity, ["general"])

    hospitals = db.query(Hospital).filter(
        Hospital.available_icu_beds > 0,
        Hospital.specialty.in_(valid_specialties)
    ).all()

    if not hospitals:
        # Fallback: any hospital with available beds
        hospitals = db.query(Hospital).filter(
            Hospital.available_icu_beds > 0
        ).all()

    if not hospitals:
        return None

    # Score hospitals: distance (0.6) + capacity (0.4)
    scored = []
    for hosp in hospitals:
        dist = haversine(lat, lon, hosp.latitude, hosp.longitude)
        dist_score = _distance_score(dist)

        # Capacity score: prefer hospitals with more available beds
        capacity_score = hosp.available_icu_beds / max(hosp.total_icu_beds, 1)

        # Specialty bonus: exact match gets bonus
        specialty_bonus = 0.1 if hosp.specialty in valid_specialties else 0.0

        total = 0.6 * dist_score + 0.3 * capacity_score + 0.1 + specialty_bonus
        scored.append((hosp, total))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[0][0] if scored else None
