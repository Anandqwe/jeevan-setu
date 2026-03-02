# Jeevan Setu — Real-Time Multi-Agent Emergency Coordination System

A distributed, event-driven Progressive Web App (PWA) that models real-time emergency dispatch coordination between patients, ambulances (EMS), and hospitals.

Built for academic research and demonstration of multi-agent coordination architecture.

---

## 🏗 Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React.js (Vite), Leaflet.js, PWA |
| Backend  | FastAPI, SQLAlchemy, WebSocket   |
| Database | PostgreSQL                        |
| Auth     | JWT + bcrypt                      |
| Maps     | OpenStreetMap (free tiles)        |

---

## 📦 Project Structure

```
jeevan-setu/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── database.py           # DB engine + session
│   ├── models.py             # SQLAlchemy ORM models
│   ├── schemas.py            # Pydantic schemas
│   ├── auth.py               # JWT + bcrypt auth
│   ├── dispatch.py           # Haversine + assignment logic
│   ├── websocket_manager.py  # Real-time event broadcasting
│   ├── seed.py               # Sample data seeder
│   └── routes/
│       ├── auth_routes.py
│       ├── patient_routes.py
│       ├── ems_routes.py
│       ├── hospital_routes.py
│       └── incident_routes.py
├── frontend/
│   ├── public/
│   │   ├── manifest.json     # PWA manifest
│   │   ├── sw.js             # Service worker
│   │   ├── offline.html      # Offline fallback
│   │   └── icons/
│   └── src/
│       ├── services/         # API + WebSocket clients
│       ├── context/          # Auth context
│       ├── components/       # Shared components
│       └── pages/            # Role-specific dashboards
├── .env.example
├── requirements.txt
└── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **PostgreSQL** (running locally or remote)

### 1. Clone and configure

```bash
cd jeevan-setu
cp .env.example .env
# Edit .env → set your DATABASE_URL and SECRET_KEY
```

### 2. Create the database

```bash
# Connect to PostgreSQL
psql -U postgres
CREATE DATABASE jeevan_setu;
\q
```

### 3. Backend setup

```bash
# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Seed sample data
cd backend
python seed.py

# Start backend server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:5173**

---

## 🧪 Sample Test Accounts

All accounts use password: `password123`

| Role     | Email                      |
|----------|----------------------------|
| Patient  | aarav@patient.com          |
| Patient  | priya@patient.com          |
| Patient  | rahul@patient.com          |
| EMS      | alpha@ems.com              |
| EMS      | beta@ems.com               |
| EMS      | gamma@ems.com              |
| EMS      | delta@ems.com              |
| Hospital | aiims@hospital.com         |
| Hospital | safdarjung@hospital.com    |
| Hospital | max@hospital.com           |

---

## ⚡ Core Features

- **Multi-role auth** — Patient / EMS / Hospital with JWT
- **Emergency dispatch** — Auto-assigns nearest ambulance + best hospital
- **Haversine distance** — Real geographic distance calculation
- **Real-time tracking** — WebSocket-based ambulance GPS updates
- **Live map** — OpenStreetMap with Leaflet.js
- **PWA** — Installable, offline fallback, background sync
- **Role dashboards** — Tailored UI for each user type

---

## 🔄 Emergency Flow

1. Patient submits emergency with location + severity
2. System finds nearest available ambulance (Haversine)
3. System finds best hospital (capacity + specialty match)
4. Incident record created, ambulance marked busy
5. WebSocket events broadcast to all parties
6. EMS tracks via GPS, patient sees live ambulance on map
7. Status transitions: assigned → en_route → on_scene → transporting → completed
8. On completion, ambulance released, hospital bed decremented

---

## 🌐 Production Deployment

### Backend → Render

1. Push to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from `.env`
6. Add a PostgreSQL database in Render

### Frontend → Vercel

1. Import frontend directory on [Vercel](https://vercel.com)
2. Set env variable: `VITE_API_URL=https://your-backend.onrender.com`
3. Set env variable: `VITE_WS_URL=wss://your-backend.onrender.com`
4. Deploy

---

## 📄 License

Academic / Research use. Built as a demonstration of distributed multi-agent coordination architecture.
