"""
Seed script: populate the database with sample data for demonstration.
Jeevan Setu v2 — includes admin users, multi-city data, sample incidents.

Run: python seed.py
Run: python seed.py --force    # clears existing data and re-seeds
Run: python seed.py --append   # adds seed accounts without clearing existing users
"""

import sys
import os
import datetime
sys.path.insert(0, os.path.dirname(__file__))

from database import engine, SessionLocal
from models import (
    Base, User, UserRole, Ambulance, AmbulanceStatus, Hospital,
    Incident, IncidentStatus, Severity
)
from auth import hash_password

# Create all tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

force = "--force" in sys.argv
append = "--append" in sys.argv

try:
    existing = db.query(User).first()
    if existing and not force and not append:
        print("Database already has data. Skipping seed.")
        print("Use --force to clear and re-seed, or --append to add seed accounts alongside existing data.")
        sys.exit(0)

    if force and existing:
        print("⚠️  Force mode: clearing existing data...")
        # Clear in dependency order
        from models import ChatMessage, IncidentTimeline, Notification, RefreshToken, AuditLog
        db.query(ChatMessage).delete()
        db.query(IncidentTimeline).delete()
        db.query(Notification).delete()
        db.query(RefreshToken).delete()
        db.query(AuditLog).delete()
        db.query(Incident).delete()
        db.query(Ambulance).delete()
        db.query(Hospital).delete()
        db.query(User).delete()
        db.commit()
        print("   Cleared. Re-seeding...")

    existing_emails = {u.email for u in db.query(User.email).all()}

    DEFAULT_PASSWORD = hash_password("password123")

    # ─── Admin Users ──────────────────────────────────────────────────────────
    admins = [
        User(name="Admin User", email="admin@jeevansetu.gov.in", password_hash=DEFAULT_PASSWORD, role=UserRole.admin),
    ]
    admins = [a for a in admins if a.email not in existing_emails]
    db.add_all(admins)
    db.flush()

    # ─── Patients ─────────────────────────────────────────────────────────────
    patients = [
        User(name="Aarav Sharma", email="aarav@patient.com", password_hash=DEFAULT_PASSWORD, role=UserRole.patient),
        User(name="Priya Patel", email="priya@patient.com", password_hash=DEFAULT_PASSWORD, role=UserRole.patient),
        User(name="Rahul Verma", email="rahul@patient.com", password_hash=DEFAULT_PASSWORD, role=UserRole.patient),
        User(name="Meera Singh", email="meera@patient.com", password_hash=DEFAULT_PASSWORD, role=UserRole.patient),
        User(name="Karan Gupta", email="karan@patient.com", password_hash=DEFAULT_PASSWORD, role=UserRole.patient),
    ]
    patients = [p for p in patients if p.email not in existing_emails]
    db.add_all(patients)
    db.flush()

    # ─── EMS Users + Ambulances (Delhi & Mumbai) ─────────────────────────────
    all_ems_defs = [
        # Delhi
        ("EMS Unit Alpha", "alpha@ems.com", 28.6139, 77.2090, "ALS"),
        ("EMS Unit Beta",  "beta@ems.com",  28.5355, 77.3910, "BLS"),
        ("EMS Unit Gamma", "gamma@ems.com", 28.4595, 77.0266, "Critical Care"),
        ("EMS Unit Delta", "delta@ems.com", 28.7041, 77.1025, "ALS"),
        # Mumbai
        ("EMS Unit Mumbai-1", "mumbai1@ems.com", 19.0760, 72.8777, "ALS"),
        ("EMS Unit Mumbai-2", "mumbai2@ems.com", 19.0330, 72.8474, "BLS"),
        # Bangalore
        ("EMS Unit BLR-1", "blr1@ems.com", 12.9716, 77.5946, "Critical Care"),
    ]
    new_ems_users = []
    for name, email, lat, lng, cap in all_ems_defs:
        if email not in existing_emails:
            u = User(name=name, email=email, password_hash=DEFAULT_PASSWORD, role=UserRole.ems)
            db.add(u)
            new_ems_users.append((u, lat, lng, cap))
    db.flush()

    for u, lat, lng, cap in new_ems_users:
        db.add(Ambulance(user_id=u.id, latitude=lat, longitude=lng,
                         status=AmbulanceStatus.available, capability_level=cap))

    # ─── Hospital Users + Hospitals (Delhi, Mumbai, Bangalore) ────────────────
    all_hospital_defs = [
        # Delhi
        ("AIIMS Delhi",         "aiims@hospital.com",       28.5672, 77.2100, "trauma",  20, 8),
        ("Safdarjung Hospital", "safdarjung@hospital.com",  28.5685, 77.2065, "general", 15, 5),
        ("Max Super Specialty", "max@hospital.com",         28.5535, 77.2588, "cardiac", 25, 12),
        ("Fortis Vasant Kunj",  "fortis@hospital.com",      28.5187, 77.1456, "neuro",   18, 10),
        # Mumbai
        ("Kokilaben Hospital",  "kokilaben@hospital.com",   19.1310, 72.8253, "cardiac", 30, 15),
        ("Lilavati Hospital",   "lilavati@hospital.com",    19.0509, 72.8283, "general", 20, 8),
        # Bangalore
        ("Manipal Hospital BLR", "manipal@hospital.com",    12.9593, 77.6494, "trauma",  22, 11),
    ]
    for hosp_name, email, lat, lng, spec, total, avail in all_hospital_defs:
        if email not in existing_emails:
            u = User(name=hosp_name, email=email, password_hash=DEFAULT_PASSWORD, role=UserRole.hospital)
            db.add(u)
            db.flush()
            db.add(Hospital(user_id=u.id, name=hosp_name, latitude=lat, longitude=lng,
                            specialty=spec, total_icu_beds=total, available_icu_beds=avail))

    db.commit()

    # ─── Sample Incidents (for demo analytics) ───────────────────────────────
    # Only create if force mode and we have users
    if force:
        aarav = db.query(User).filter(User.email == "aarav@patient.com").first()
        priya = db.query(User).filter(User.email == "priya@patient.com").first()
        alpha_user = db.query(User).filter(User.email == "alpha@ems.com").first()

        if aarav and alpha_user:
            alpha_amb = db.query(Ambulance).filter(Ambulance.user_id == alpha_user.id).first()
            aiims_hosp = db.query(Hospital).filter(Hospital.name == "AIIMS Delhi").first()

            if alpha_amb and aiims_hosp:
                sample_incidents = [
                    Incident(
                        patient_id=aarav.id,
                        ambulance_id=alpha_amb.id,
                        hospital_id=aiims_hosp.id,
                        latitude=28.6129, longitude=77.2295,
                        severity=Severity.high,
                        status=IncidentStatus.completed,
                        description="Road accident near India Gate",
                        response_time_seconds=420,
                        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=5),
                    ),
                    Incident(
                        patient_id=aarav.id,
                        ambulance_id=alpha_amb.id,
                        hospital_id=aiims_hosp.id,
                        latitude=28.5244, longitude=77.1855,
                        severity=Severity.medium,
                        status=IncidentStatus.completed,
                        description="Chest pain at Saket Mall",
                        response_time_seconds=360,
                        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=3),
                    ),
                    Incident(
                        patient_id=aarav.id,
                        ambulance_id=alpha_amb.id,
                        hospital_id=aiims_hosp.id,
                        latitude=28.6315, longitude=77.2167,
                        severity=Severity.critical,
                        status=IncidentStatus.completed,
                        description="Heart attack at Connaught Place",
                        response_time_seconds=300,
                        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1),
                    ),
                ]

                if priya:
                    sample_incidents.append(Incident(
                        patient_id=priya.id,
                        ambulance_id=alpha_amb.id,
                        hospital_id=aiims_hosp.id,
                        latitude=28.5437, longitude=77.1982,
                        severity=Severity.low,
                        status=IncidentStatus.completed,
                        description="Minor injury at Hauz Khas",
                        response_time_seconds=600,
                        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=2),
                    ))

                db.add_all(sample_incidents)
                db.commit()
                print(f"   Added {len(sample_incidents)} sample incidents.")

    print("✅ Database seeded successfully!")
    print()
    print("Sample Accounts (password: password123):")
    print("─" * 50)
    print("Admin:     admin@jeevansetu.gov.in")
    print("Patients:  aarav@patient.com")
    print("           priya@patient.com")
    print("           rahul@patient.com")
    print("           meera@patient.com")
    print("           karan@patient.com")
    print("EMS:       alpha@ems.com")
    print("           beta@ems.com")
    print("           gamma@ems.com")
    print("           delta@ems.com")
    print("           mumbai1@ems.com")
    print("           mumbai2@ems.com")
    print("           blr1@ems.com")
    print("Hospitals: aiims@hospital.com")
    print("           safdarjung@hospital.com")
    print("           max@hospital.com")
    print("           fortis@hospital.com")
    print("           kokilaben@hospital.com")
    print("           lilavati@hospital.com")
    print("           manipal@hospital.com")
    print("─" * 50)

except Exception as e:
    db.rollback()
    print(f"❌ Seed error: {e}")
    raise
finally:
    db.close()
