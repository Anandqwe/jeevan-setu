# Jeevan-Setu 🚑

**Real-Time Emergency Coordination System — Mumbai**

A full-stack Progressive Web App that connects patients, ambulances (EMS), hospitals, and administrators in real time for faster emergency medical response.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Quick Start](#quick-start)
5. [Environment Variables](#environment-variables)
6. [Database & Migrations](#database--migrations)
7. [Seeded Demo Accounts](#seeded-demo-accounts)
8. [API Reference](#api-reference)
9. [WebSocket Events](#websocket-events)
10. [Role Features](#role-features)
11. [Dispatch Engine](#dispatch-engine)
12. [Incident State Machine](#incident-state-machine)
13. [PWA & Offline Support](#pwa--offline-support)
14. [Known Issues & Fixes](#known-issues--fixes)

---

## Architecture

```
Client (React PWA)
      │
      ├── REST API (HTTP/JSON)  ──►  FastAPI  ──►  PostgreSQL
      │                                │
      └── WebSocket (ws://)  ──────────┘
```

**Layered backend architecture:**
```
Router → Service → Repository → SQLAlchemy Model → PostgreSQL
```

---

## Tech Stack

| Layer          | Technology                                              |
| -------------- | ------------------------------------------------------- |
| Backend        | FastAPI (Python 3.11+), Uvicorn                         |
| Database       | PostgreSQL 15, SQLAlchemy 2.0 (async), asyncpg          |
| Migrations     | Alembic                                                 |
| Auth           | JWT (python-jose) — access (30 min) + refresh (7 days) |
| Password Hash  | bcrypt (direct, no passlib)                             |
| Frontend       | React 18, Vite 5, React Router v6                       |
| State          | Zustand (4 stores)                                      |
| Real-Time      | WebSockets (websockets library)                         |
| Maps           | Leaflet.js + OpenStreetMap (no API key needed)          |
| Styling        | CSS Modules + global CSS                                |
| PWA            | Service Worker, Web App Manifest                        |

---

## Project Structure

```
jeevan-setu/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py               # get_current_user dependency
│   │   │   └── routes/
│   │   │       ├── auth.py           # /api/auth — login, register, refresh
│   │   │       ├── patients.py       # /api/patients — patient profile
│   │   │       ├── ambulances.py     # /api/ambulances — CRUD + location update
│   │   │       ├── hospitals.py      # /api/hospitals — CRUD + bed management
│   │   │       ├── incidents.py      # /api/incidents — create, update status
│   │   │       ├── admin.py          # /api/admin — overrides, analytics, force-close
│   │   │       └── ws.py             # /ws — WebSocket endpoint
│   │   ├── core/
│   │   │   ├── config.py             # Pydantic BaseSettings
│   │   │   ├── security.py           # hash_password, verify_password, create_*_token, decode_token
│   │   │   └── permissions.py        # require_role() RBAC dependency factory
│   │   ├── models/
│   │   │   ├── user.py               # User + UserRole enum
│   │   │   ├── ambulance.py          # Ambulance + AmbulanceStatus enum
│   │   │   ├── hospital.py           # Hospital
│   │   │   └── incident.py           # Incident + IncidentStatus/Severity enums + FSM transitions
│   │   ├── repositories/
│   │   │   ├── user_repo.py
│   │   │   ├── ambulance_repo.py
│   │   │   ├── hospital_repo.py
│   │   │   └── incident_repo.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── user.py
│   │   │   ├── ambulance.py
│   │   │   ├── hospital.py
│   │   │   └── incident.py
│   │   ├── services/
│   │   │   ├── auth_service.py       # register, login, refresh
│   │   │   ├── dispatch_service.py   # Haversine dispatch pipeline
│   │   │   ├── incident_service.py   # FSM transition + side effects
│   │   │   ├── tracking_service.py   # GPS update + WS broadcast
│   │   │   └── analytics_service.py  # system-wide stats
│   │   ├── websocket/
│   │   │   ├── manager.py            # ConnectionManager singleton
│   │   │   └── events.py             # WSEvent constants + message builders
│   │   ├── utils/
│   │   │   └── geo.py                # Haversine distance formula
│   │   ├── database.py               # AsyncSession factory, Base, get_db
│   │   └── main.py                   # FastAPI app factory, CORS, routers
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │       └── 2f379424c930_initial_schema.py
│   ├── seed.py                       # Mumbai demo data (idempotent)
│   ├── requirements.txt
│   ├── .env
│   ├── alembic.ini
│   └── Dockerfile
├── frontend/
│   ├── public/
│   │   ├── manifest.json             # PWA manifest
│   │   ├── sw.js                     # Service worker (network-first)
│   │   └── offline.html              # Offline fallback page
│   └── src/
│       ├── api/
│       │   ├── client.js             # Axios instance + JWT interceptor + auto-refresh
│       │   ├── auth.js
│       │   ├── incidents.js
│       │   ├── ambulances.js
│       │   └── hospitals.js
│       ├── components/
│       │   ├── common/
│       │   │   ├── Navbar.jsx
│       │   │   ├── ProtectedRoute.jsx
│       │   │   ├── LoadingSpinner.jsx
│       │   │   └── StatusBadge.jsx
│       │   ├── maps/
│       │   │   └── TrackingMap.jsx   # Leaflet map, custom markers, click handler
│       │   └── incidents/
│       │       ├── EmergencyForm.jsx
│       │       ├── IncidentCard.jsx
│       │       └── IncidentTimeline.jsx
│       ├── hooks/
│       │   ├── useWebSocket.js       # WS connection, auto-reconnect, event dispatch
│       │   ├── useGeolocation.js     # Browser geolocation + Mumbai fallback
│       │   └── useAuth.js            # Role guard + redirect
│       ├── pages/
│       │   ├── auth/                 # LoginPage, RegisterPage
│       │   ├── patient/              # PatientDashboard
│       │   ├── ems/                  # EMSDashboard
│       │   ├── hospital/             # HospitalDashboard
│       │   └── admin/                # AdminDashboard (4 tabs)
│       ├── stores/
│       │   ├── authStore.js
│       │   ├── incidentStore.js
│       │   ├── trackingStore.js
│       │   └── hospitalStore.js
│       ├── styles/
│       │   └── global.css
│       ├── utils/
│       │   └── constants.js
│       ├── App.jsx                   # Main router + role-based routing
│       └── main.jsx                  # Entry point + SW registration
├── docker-compose.yml
└── README.md
```

---

## Quick Start

### Option 1: Docker Compose

```bash
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Interactive API Docs: http://localhost:8000/docs

### Option 2: Manual Setup

**Prerequisites:** Python 3.11+, Node.js 20+, PostgreSQL 15+

**Backend:**
```bash
cd backend

# Create and activate virtualenv
python -m venv venv
venv\Scripts\activate          # Windows PowerShell
# source venv/bin/activate     # Linux / macOS

# Install dependencies
pip install -r requirements.txt

# Apply migrations
.\venv\Scripts\alembic.exe upgrade head
# (or on Linux: alembic upgrade head)

# Seed demo data
.\venv\Scripts\python.exe seed.py
# (or: python seed.py)

# Start server
.\venv\Scripts\uvicorn.exe app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

> **Windows note:** If `alembic` / `uvicorn` is not on PATH after activating the venv,
> use the full path: `.\venv\Scripts\alembic.exe` and `.\venv\Scripts\uvicorn.exe`.

---

## Environment Variables

File: `backend/.env`

| Variable                     | Default                                      | Description                          |
| ---------------------------- | -------------------------------------------- | ------------------------------------ |
| `DATABASE_URL`               | `postgresql+asyncpg://postgres:...@.../...`  | Async PostgreSQL connection string   |
| `JWT_SECRET_KEY`             | `jeevan-setu-super-secret-key-...`           | JWT signing secret (change in prod)  |
| `JWT_ALGORITHM`              | `HS256`                                      | JWT algorithm                        |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| `30`                                         | Access token lifetime                |
| `REFRESH_TOKEN_EXPIRE_DAYS`  | `7`                                          | Refresh token lifetime               |
| `CORS_ORIGINS`               | `http://localhost:5173,http://localhost:3000` | Allowed frontend origins             |

---

## Database & Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Roll back one migration
alembic downgrade -1

# Roll back to empty DB
alembic downgrade base

# Check current revision
alembic current

# Auto-generate migration after model changes
alembic revision --autogenerate -m "description"
```

**Full DB reset (development only):**
```python
# Run via Python if you need a completely clean slate
import asyncio, asyncpg

async def reset():
    conn = await asyncpg.connect('postgresql://user:pass@localhost:5432/dbname')
    await conn.execute("""
        DROP TABLE IF EXISTS incidents, hospitals, ambulances, users, alembic_version CASCADE;
        DROP TYPE IF EXISTS userrole, ambulancestatus, incidentseverity, incidentstatus CASCADE;
    """)
    await conn.close()

asyncio.run(reset())
```

---

## Seeded Demo Accounts

Run `python seed.py` to populate. All records are idempotent (safe to re-run).

### Admin

| Email                  | Password   |
| ---------------------- | ---------- |
| admin@jeevan-setu.com  | admin123   |

### Hospitals — password: `hospital123`

| Email                                  | Hospital Name                     | Specialty      | Area          |
| -------------------------------------- | --------------------------------- | -------------- | ------------- |
| hospital.andheri@jeevan-setu.com       | LifeCare Hospital Andheri         | emergency      | Andheri West  |
| hospital.bandra@jeevan-setu.com        | Bandra Trauma Center              | trauma_center  | Bandra West   |
| hospital.dadar@jeevan-setu.com         | Dadar General Hospital            | general        | Dadar         |
| hospital.powai@jeevan-setu.com         | Powai Cardiac Institute           | cardiac        | Powai         |
| hospital.kurla@jeevan-setu.com         | Kurla Emergency Hospital          | emergency      | Kurla West    |
| hospital.lowerparel@jeevan-setu.com    | Lower Parel Neuro Center          | neuro          | Lower Parel   |
| hospital.borivali@jeevan-setu.com      | Borivali Multi-Specialty Hospital | general        | Borivali West |
| hospital.thane@jeevan-setu.com         | Thane City Hospital               | emergency      | Thane West    |

### EMS / Ambulances — password: `ems123`

| Email                       | Driver Name     | Area              | Capability    |
| --------------------------- | --------------- | ----------------- | ------------- |
| ems.01@jeevan-setu.com      | Rajesh Kumar    | Andheri East      | advanced      |
| ems.02@jeevan-setu.com      | Suresh Patil    | Bandra East       | basic         |
| ems.03@jeevan-setu.com      | Amit Sharma     | Dadar TT          | advanced      |
| ems.04@jeevan-setu.com      | Vikram Singh    | Powai Lake        | intermediate  |
| ems.05@jeevan-setu.com      | Manoj Gupta     | Kurla Station     | basic         |
| ems.06@jeevan-setu.com      | Deepak Joshi    | Lower Parel       | advanced      |
| ems.07@jeevan-setu.com      | Pradeep Nair    | Borivali East     | intermediate  |
| ems.08@jeevan-setu.com      | Sandeep Rao     | Thane Station     | basic         |
| ems.09@jeevan-setu.com      | Rahul Deshmukh  | Goregaon West     | advanced      |
| ems.10@jeevan-setu.com      | Anil Pawar      | Malad West        | intermediate  |
| ems.11@jeevan-setu.com      | Sanjay Mishra   | Chembur           | basic         |
| ems.12@jeevan-setu.com      | Kiran Sawant    | Vile Parle East   | advanced      |

### Patients — password: `patient123`

| Email                        | Name                  | Location (lat, lng)       |
| ---------------------------- | --------------------- | ------------------------- |
| patient.01@jeevan-setu.com   | Demo Patient Andheri  | 19.1255, 72.8362          |
| patient.02@jeevan-setu.com   | Demo Patient Dadar    | 19.0236, 72.8427          |
| patient.03@jeevan-setu.com   | Demo Patient Colaba   | 18.9067, 72.8147          |

---

## API Reference

Interactive Swagger UI: **http://localhost:8000/docs**

### Auth — `/api/auth`

| Method | Path        | Auth | Description                     |
| ------ | ----------- | ---- | ------------------------------- |
| POST   | `/register` | —    | Create account (any role)       |
| POST   | `/login`    | —    | Returns access + refresh tokens |
| POST   | `/refresh`  | —    | Exchange refresh for new tokens |
| GET    | `/me`       | JWT  | Get current user profile        |

### Incidents — `/api/incidents`

| Method | Path              | Role             | Description               |
| ------ | ----------------- | ---------------- | ------------------------- |
| POST   | `/`               | PATIENT          | Create emergency request  |
| GET    | `/`               | EMS, HOSPITAL    | List all active incidents |
| GET    | `/my`             | PATIENT          | My incidents              |
| GET    | `/{id}`           | Any              | Get incident detail       |
| PATCH  | `/{id}/status`    | EMS, HOSPITAL    | Advance FSM status        |

### Ambulances — `/api/ambulances`

| Method | Path                  | Role        | Description              |
| ------ | --------------------- | ----------- | ------------------------ |
| GET    | `/`                   | Any         | List all ambulances      |
| GET    | `/{id}`               | Any         | Get ambulance detail     |
| PATCH  | `/{id}/location`      | EMS         | Update GPS position      |
| PATCH  | `/{id}/status`        | EMS, ADMIN  | Update availability      |

### Hospitals — `/api/hospitals`

| Method | Path          | Role       | Description          |
| ------ | ------------- | ---------- | -------------------- |
| GET    | `/`           | Any        | List all hospitals   |
| GET    | `/{id}`       | Any        | Get hospital detail  |
| PATCH  | `/{id}/beds`  | HOSPITAL   | Update ICU bed count |

### Admin — `/api/admin`

| Method | Path                               | Role  | Description                          |
| ------ | ---------------------------------- | ----- | ------------------------------------ |
| POST   | `/incidents/{id}/override-ambulance` | ADMIN | Re-assign ambulance manually         |
| POST   | `/incidents/{id}/override-hospital`  | ADMIN | Re-assign hospital manually          |
| POST   | `/incidents/{id}/force-close`        | ADMIN | Force incident to COMPLETED          |
| GET    | `/analytics`                         | ADMIN | System-wide stats (counts, beds, etc)|

### WebSocket — `/ws`

```
ws://localhost:8000/ws?token=<access_token>
```

---

## WebSocket Events

### Client → Server

| Event             | Payload                                              | Description                    |
| ----------------- | ---------------------------------------------------- | ------------------------------ |
| `location_update` | `{ latitude, longitude, incident_id? }`              | EMS sends GPS position         |
| `join_incident`   | `{ incident_id }`                                    | Subscribe to incident room     |
| `leave_incident`  | `{ incident_id }`                                    | Unsubscribe from incident room |

### Server → Client

| Event                | Sent to                  | Description                          |
| -------------------- | ------------------------ | ------------------------------------ |
| `ambulance_position` | All connected clients    | Real-time ambulance GPS update       |
| `status_changed`     | Incident room members    | FSM status transition broadcast      |
| `incident_assigned`  | Patient + EMS            | Dispatch result (ambulance+hospital) |
| `bed_updated`        | Admin + Hospital         | ICU bed count changed                |

---

## Role Features

### Patient
- Submit emergency request with GPS pin (auto-detected or map-click)
- Choose severity: LOW / MEDIUM / HIGH / CRITICAL
- Watch ambulance move on live map
- View incident history with timeline

### EMS (Ambulance Driver)
- See active assignments on dashboard
- Toggle GPS tracking (broadcasts position every 5 sec via WebSocket)
- Advance incident through FSM stages with one-click buttons
- View patient location on map

### Hospital
- View incoming patients (EN_ROUTE → ARRIVED → TREATMENT)
- Confirm patient intake / mark treatment complete
- Manage ICU bed count with visual capacity bar

### Admin
- **Overview tab**: system stats (active incidents, available ambulances, free ICU beds) + manual override controls
- **Map tab**: live city-wide map with all ambulances, hospitals, and active incidents
- **Incidents tab**: full incident table with force-close action
- **Analytics tab**: breakdown by severity, status, ambulance availability, bed capacity

---

## Dispatch Engine

When a patient submits an emergency, the dispatch pipeline runs automatically:

1. Load all `AVAILABLE` ambulances from DB
2. Compute Haversine distance from each ambulance to the patient's coordinates
3. Sort by distance, pick the nearest
4. Determine required hospital specialty from incident severity (`SEVERITY_SPECIALTY_MAP`)
5. Load hospitals with `available_icu_beds > 0` matching the specialty
6. Sort hospitals by distance to patient, pick the nearest match
7. Assign ambulance + hospital to the incident, set status → `AMBULANCE_ASSIGNED`
8. Mark ambulance as `BUSY`, decrement hospital's `available_icu_beds`
9. Broadcast `incident_assigned` event via WebSocket

**Severity → Specialty mapping:**

| Severity | Specialty      |
| -------- | -------------- |
| LOW      | general        |
| MEDIUM   | general        |
| HIGH     | emergency      |
| CRITICAL | trauma_center  |

---

## Incident State Machine

```
REQUESTED
    │
    ▼
AMBULANCE_ASSIGNED
    │
    ▼
EN_ROUTE_TO_PATIENT
    │
    ▼
PATIENT_PICKED_UP
    │
    ▼
EN_ROUTE_TO_HOSPITAL
    │
    ▼
ARRIVED_AT_HOSPITAL
    │
    ▼
TREATMENT_STARTED
    │
    ▼
COMPLETED  ◄── Admin can force-close from any state
```

Invalid transitions are rejected with HTTP 400.

---

## PWA & Offline Support

- **Installable** — Web App Manifest with `theme_color: #dc2626`
- **Service Worker** — network-first strategy; falls back to cache
- **Offline page** — styled fallback with Mumbai emergency numbers (100/108/112)
- **Background sync stub** — ready for queuing emergency requests offline

---

## Known Issues & Fixes

### `alembic` not recognized in PowerShell
```powershell
# Use full venv path instead of relying on PATH activation
.\venv\Scripts\alembic.exe upgrade head
.\venv\Scripts\uvicorn.exe app.main:app --reload
.\venv\Scripts\python.exe seed.py
```

### `passlib` + `bcrypt >= 4.0` incompatibility
`passlib` is unmaintained and breaks with modern `bcrypt`. This project uses `bcrypt` directly — `passlib` is **not** in `requirements.txt`.

### `DateTime` vs `DateTime(timezone=True)` with asyncpg 0.31+
asyncpg 0.31 enforces timezone-aware datetime objects for `TIMESTAMPTZ` columns. All `DateTime` columns in the models use `DateTime(timezone=True)` and all defaults use `datetime.now(timezone.utc)`.

### `pydantic-core` build failure on Python 3.14
Pin-free version ranges in `requirements.txt` allow pip to pull pre-built wheels for Python 3.14 instead of compiling from source.

