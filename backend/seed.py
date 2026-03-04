"""
Jeevan-Setu Seed Script
Populates the database with Mumbai-based demo data.
Idempotent: checks for existing records by email before inserting.

Usage:
    cd backend
    alembic upgrade head
    python seed.py
"""

import asyncio
import sys
import os

# Add backend dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.ambulance import Ambulance, AmbulanceStatus
from app.models.hospital import Hospital
from app.core.security import hash_password
from sqlalchemy import select


# --- Seed Data ---

ADMIN = {
    "name": "Admin",
    "email": "admin@jeevan-setu.com",
    "password": "admin123",
    "role": UserRole.ADMIN,
}

HOSPITALS = [
    {"name": "LifeCare Hospital Andheri", "email": "hospital.andheri@jeevan-setu.com", "area": "Andheri West", "lat": 19.1197, "lng": 72.8464, "specialty": "emergency", "total_icu": 20, "available_icu": 12},
    {"name": "Bandra Trauma Center", "email": "hospital.bandra@jeevan-setu.com", "area": "Bandra West", "lat": 19.0544, "lng": 72.8406, "specialty": "trauma_center", "total_icu": 15, "available_icu": 8},
    {"name": "Dadar General Hospital", "email": "hospital.dadar@jeevan-setu.com", "area": "Dadar", "lat": 19.0178, "lng": 72.8478, "specialty": "general", "total_icu": 25, "available_icu": 15},
    {"name": "Powai Cardiac Institute", "email": "hospital.powai@jeevan-setu.com", "area": "Powai", "lat": 19.1176, "lng": 72.9060, "specialty": "cardiac", "total_icu": 12, "available_icu": 6},
    {"name": "Kurla Emergency Hospital", "email": "hospital.kurla@jeevan-setu.com", "area": "Kurla West", "lat": 19.0726, "lng": 72.8793, "specialty": "emergency", "total_icu": 18, "available_icu": 10},
    {"name": "Lower Parel Neuro Center", "email": "hospital.lowerparel@jeevan-setu.com", "area": "Lower Parel", "lat": 18.9980, "lng": 72.8311, "specialty": "neuro", "total_icu": 10, "available_icu": 4},
    {"name": "Borivali Multi-Specialty Hospital", "email": "hospital.borivali@jeevan-setu.com", "area": "Borivali West", "lat": 19.2307, "lng": 72.8567, "specialty": "general", "total_icu": 22, "available_icu": 14},
    {"name": "Thane City Hospital", "email": "hospital.thane@jeevan-setu.com", "area": "Thane West", "lat": 19.2183, "lng": 72.9781, "specialty": "emergency", "total_icu": 16, "available_icu": 9},
]

AMBULANCES = [
    {"driver": "Rajesh Kumar", "email": "ems.01@jeevan-setu.com", "area": "Andheri East", "lat": 19.1136, "lng": 72.8697, "capability": "advanced"},
    {"driver": "Suresh Patil", "email": "ems.02@jeevan-setu.com", "area": "Bandra East", "lat": 19.0590, "lng": 72.8497, "capability": "basic"},
    {"driver": "Amit Sharma", "email": "ems.03@jeevan-setu.com", "area": "Dadar TT", "lat": 19.0166, "lng": 72.8432, "capability": "advanced"},
    {"driver": "Vikram Singh", "email": "ems.04@jeevan-setu.com", "area": "Powai Lake", "lat": 19.1255, "lng": 72.9080, "capability": "intermediate"},
    {"driver": "Manoj Gupta", "email": "ems.05@jeevan-setu.com", "area": "Kurla Station", "lat": 19.0654, "lng": 72.8796, "capability": "basic"},
    {"driver": "Deepak Joshi", "email": "ems.06@jeevan-setu.com", "area": "Lower Parel", "lat": 19.0006, "lng": 72.8296, "capability": "advanced"},
    {"driver": "Pradeep Nair", "email": "ems.07@jeevan-setu.com", "area": "Borivali East", "lat": 19.2285, "lng": 72.8610, "capability": "intermediate"},
    {"driver": "Sandeep Rao", "email": "ems.08@jeevan-setu.com", "area": "Thane Station", "lat": 19.1860, "lng": 72.9756, "capability": "basic"},
    {"driver": "Rahul Deshmukh", "email": "ems.09@jeevan-setu.com", "area": "Goregaon West", "lat": 19.1552, "lng": 72.8494, "capability": "advanced"},
    {"driver": "Anil Pawar", "email": "ems.10@jeevan-setu.com", "area": "Malad West", "lat": 19.1874, "lng": 72.8484, "capability": "intermediate"},
    {"driver": "Sanjay Mishra", "email": "ems.11@jeevan-setu.com", "area": "Chembur", "lat": 19.0522, "lng": 72.8994, "capability": "basic"},
    {"driver": "Kiran Sawant", "email": "ems.12@jeevan-setu.com", "area": "Vile Parle East", "lat": 19.0968, "lng": 72.8563, "capability": "advanced"},
]

PATIENTS = [
    {"name": "Demo Patient Andheri", "email": "patient.01@jeevan-setu.com", "lat": 19.1255, "lng": 72.8362},
    {"name": "Demo Patient Dadar", "email": "patient.02@jeevan-setu.com", "lat": 19.0236, "lng": 72.8427},
    {"name": "Demo Patient Colaba", "email": "patient.03@jeevan-setu.com", "lat": 18.9067, "lng": 72.8147},
]

async def seed():
    """Seed the database with demo data."""
    counts = {"admin": 0, "hospitals": 0, "ambulances": 0, "patients": 0}

    async with AsyncSessionLocal() as db:

        # --- Admin ---
        result = await db.execute(select(User).where(User.email == ADMIN["email"]))
        if not result.scalar_one_or_none():
            admin_user = User(
                name=ADMIN["name"],
                email=ADMIN["email"],
                password_hash=hash_password(ADMIN["password"]),
                role=ADMIN["role"],
            )
            db.add(admin_user)
            counts["admin"] = 1
            print(f"[CREATED] Admin: {ADMIN['email']}")
        else:
            print(f"[SKIP] {ADMIN['email']} already exists")

        await db.flush()

        # --- Hospitals ---
        for h in HOSPITALS:
            result = await db.execute(select(User).where(User.email == h["email"]))
            existing = result.scalar_one_or_none()

            if not existing:
                user = User(
                    name=h["name"],
                    email=h["email"],
                    password_hash=hash_password("hospital123"),
                    role=UserRole.HOSPITAL,
                )
                db.add(user)
                await db.flush()

                hospital = Hospital(
                    user_id=user.id,
                    name=h["name"],
                    address=h["area"],
                    latitude=h["lat"],
                    longitude=h["lng"],
                    specialty=h["specialty"],
                    total_icu_beds=h["total_icu"],
                    available_icu_beds=h["available_icu"],
                )
                db.add(hospital)

                counts["hospitals"] += 1
                print(f"[CREATED] Hospital: {h['name']}")

            else:
                print(f"[SKIP] {h['email']} already exists")

        await db.flush()

        # --- Ambulances ---
        for a in AMBULANCES:
            result = await db.execute(select(User).where(User.email == a["email"]))
            existing = result.scalar_one_or_none()

            if not existing:
                user = User(
                    name=a["driver"],
                    email=a["email"],
                    password_hash=hash_password("ems123"),
                    role=UserRole.EMS,
                )
                db.add(user)
                await db.flush()

                ambulance = Ambulance(
                    user_id=user.id,
                    latitude=a["lat"],
                    longitude=a["lng"],
                    status=AmbulanceStatus.AVAILABLE,
                    capability_level=a["capability"],
                )
                db.add(ambulance)

                counts["ambulances"] += 1
                print(f"[CREATED] EMS: {a['driver']}")

            else:
                print(f"[SKIP] {a['email']} already exists")

        await db.flush()

        # --- Patients ---
        for p in PATIENTS:
            result = await db.execute(select(User).where(User.email == p["email"]))
            existing = result.scalar_one_or_none()

            if not existing:
                user = User(
                    name=p["name"],
                    email=p["email"],
                    password_hash=hash_password("patient123"),
                    role=UserRole.PATIENT,
                )
                db.add(user)

                counts["patients"] += 1
                print(f"[CREATED] Patient: {p['name']}")

            else:
                print(f"[SKIP] {p['email']} already exists")

        await db.commit()

    print(
        f"\nSeeded: {counts['admin']} admin, "
        f"{counts['hospitals']} hospitals, "
        f"{counts['ambulances']} ambulances, "
        f"{counts['patients']} patients"
    )


async def create_tables():
    """Create tables if needed (quick setup without Alembic)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("Tables created successfully.")


async def main():
    """Run seeding operations."""
    if "--create-tables" in sys.argv:
        await create_tables()

    await seed()


if __name__ == "__main__":
    print("=== Jeevan-Setu Database Seeder ===\n")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    loop.run_until_complete(main())

    loop.close()