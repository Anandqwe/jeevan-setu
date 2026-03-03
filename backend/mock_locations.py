"""Shared mock locations for seeded patient demo accounts."""

PATIENT_MOCK_LOCATIONS = {
    "aarav@patient.com": {"latitude": 28.6129, "longitude": 77.2295, "label": "India Gate"},
    "priya@patient.com": {"latitude": 28.5437, "longitude": 77.1982, "label": "Hauz Khas"},
    "rahul@patient.com": {"latitude": 28.5244, "longitude": 77.1855, "label": "Saket"},
    "meera@patient.com": {"latitude": 28.6315, "longitude": 77.2167, "label": "Connaught Place"},
    "karan@patient.com": {"latitude": 28.7041, "longitude": 77.1025, "label": "North Delhi"},
}


def get_patient_mock_location(email: str):
    return PATIENT_MOCK_LOCATIONS.get(email, {"latitude": 28.6139, "longitude": 77.2090, "label": "Central Delhi"})
