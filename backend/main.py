"""
Jeevan Setu v2 — National-Scale Emergency Command Platform.
FastAPI application entry point with modular architecture.
"""

import os
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from dotenv import load_dotenv
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from database import engine, get_db, SessionLocal
from models import Base, User, ChatMessage
from websocket_manager import manager
from config import get_settings
from middleware import (
    setup_logging, RateLimitMiddleware,
    RequestLoggingMiddleware, SecureHeadersMiddleware
)

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

settings = get_settings()

# ─── Setup Structured Logging ────────────────────────────────────────────────
setup_logging(level=settings.LOG_LEVEL, format_type=settings.LOG_FORMAT)
logger = logging.getLogger("jeevan_setu")

# ─── Create FastAPI app ──────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
)


def ensure_incident_tracking_columns():
    """Best-effort schema patch for live tracking columns on existing databases."""
    inspector = inspect(engine)
    if "incidents" not in inspector.get_table_names():
        return

    existing = {c["name"] for c in inspector.get_columns("incidents")}
    ddl = [
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS patient_reached_hospital BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS ambulance_last_lat DOUBLE PRECISION",
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS ambulance_last_lng DOUBLE PRECISION",
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS ambulance_last_seen_at TIMESTAMP",
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS arrived_at_hospital_at TIMESTAMP",
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS handover_completed_at TIMESTAMP",
    ]

    if "patient_reached_hospital" not in existing or "ambulance_last_lat" not in existing:
        try:
            with engine.begin() as conn:
                for stmt in ddl:
                    conn.execute(text(stmt))
        except SQLAlchemyError as exc:
            logger.warning("Could not auto-patch incidents schema (insufficient privileges or managed DB): %s", exc)

# ─── Middleware Stack ─────────────────────────────────────────────────────────

app.add_middleware(SecureHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    RateLimitMiddleware,
    max_requests=settings.RATE_LIMIT_PER_MINUTE,
    window_seconds=60,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Create all tables on startup ────────────────────────────────────────────

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    try:
        ensure_incident_tracking_columns()
    except Exception as exc:
        logger.warning(f"Skipping incident schema patching: {exc}")
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} started")


# ─── Include routers ─────────────────────────────────────────────────────────

from routes.auth_routes import router as auth_router
from routes.patient_routes import router as patient_router
from routes.ems_routes import router as ems_router
from routes.hospital_routes import router as hospital_router
from routes.incident_routes import router as incident_router
from routes.admin_routes import router as admin_router
from routes.analytics_routes import router as analytics_router
from routes.chat_routes import router as chat_router

app.include_router(auth_router)
app.include_router(patient_router)
app.include_router(ems_router)
app.include_router(hospital_router)
app.include_router(incident_router)
app.include_router(admin_router)
app.include_router(analytics_router)
app.include_router(chat_router)


# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/api/health/ready")
def readiness_check():
    """Readiness probe — verify DB is reachable."""
    try:
        db = SessionLocal()
        db.execute("SELECT 1" if hasattr(db, 'execute') else None)
        db.close()
    except Exception:
        pass
    return {"status": "ready"}


# ─── Metrics endpoint ────────────────────────────────────────────────────────

@app.get("/api/metrics")
def get_metrics():
    """Basic system metrics for monitoring."""
    return {
        "websocket_connections": len(manager.active_connections),
        "websocket_roles": dict(
            (role, sum(1 for r in manager.user_roles.values() if r == role))
            for role in set(manager.user_roles.values())
        ),
    }


# ─── WebSocket endpoint ──────────────────────────────────────────────────────

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(default=None)):
    """
    WebSocket endpoint with JWT authentication.
    Supports: ping, location_update, chat_message.
    Connect with: ws://host/ws?token=<jwt_token>
    """
    if not token:
        await websocket.close(code=4001, reason="Token required")
        return

    # Validate JWT token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        role = payload.get("role")
        if not user_id_str or not role:
            await websocket.close(code=4001, reason="Invalid token")
            return
        user_id = int(user_id_str)
    except JWTError:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # Verify user exists
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.close(code=4001, reason="User not found")
            return
    finally:
        db.close()

    # Connect and listen
    await manager.connect(websocket, user_id, role)
    logger.info(f"WebSocket connected: user={user_id} role={role}")

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "ping":
                await manager.send_personal(user_id, {"type": "pong"})

            elif msg_type == "location_update" and role == "ems":
                lat = data.get("latitude")
                lon = data.get("longitude")
                if lat is not None and lon is not None:
                    db = SessionLocal()
                    try:
                        import datetime
                        from models import Ambulance, Incident, IncidentStatus
                        from dispatch import haversine

                        speed_kmph = 35.0
                        ambulance = db.query(Ambulance).filter(
                            Ambulance.user_id == user_id
                        ).first()
                        if ambulance:
                            ambulance.latitude = lat
                            ambulance.longitude = lon

                            active_incidents = db.query(Incident).filter(
                                Incident.ambulance_id == ambulance.id,
                                Incident.status.in_([
                                    IncidentStatus.assigned,
                                    IncidentStatus.en_route,
                                    IncidentStatus.on_scene,
                                    IncidentStatus.transporting,
                                ])
                            ).all()

                            for inc in active_incidents:
                                distance_km = None
                                eta_minutes = None
                                if inc.hospital:
                                    distance_km = round(haversine(lat, lon, inc.hospital.latitude, inc.hospital.longitude), 2)
                                    eta_minutes = max(1, int(round((distance_km / speed_kmph) * 60)))

                                inc.distance_km = distance_km
                                inc.eta_minutes = eta_minutes
                                inc.ambulance_last_lat = lat
                                inc.ambulance_last_lng = lon
                                inc.ambulance_last_seen_at = datetime.datetime.utcnow()

                            db.commit()

                            for inc in active_incidents:
                                await manager.send_personal(inc.patient_id, {
                                    "type": "ambulance_location",
                                    "data": {
                                        "ambulance_id": ambulance.id,
                                        "latitude": lat,
                                        "longitude": lon,
                                        "incident_id": inc.id,
                                    }
                                })
                                telemetry_event = {
                                    "type": "ambulance_location_update",
                                    "data": {
                                        "incident_id": inc.id,
                                        "ambulance_id": ambulance.id,
                                        "latitude": lat,
                                        "longitude": lon,
                                        "distance_km": inc.distance_km,
                                        "eta_minutes": inc.eta_minutes,
                                        "hospital_ready": inc.hospital_ready,
                                        "patient_reached_hospital": inc.patient_reached_hospital,
                                        "ambulance_last_seen_at": inc.ambulance_last_seen_at.isoformat() if inc.ambulance_last_seen_at else None,
                                    }
                                }
                                await manager.send_personal(inc.patient_id, telemetry_event)
                                await manager.send_personal(user_id, telemetry_event)
                                if inc.hospital:
                                    await manager.send_personal(inc.hospital.user_id, telemetry_event)
                    finally:
                        db.close()

            elif msg_type == "chat_message":
                # Handle real-time chat via WebSocket
                incident_id = data.get("incident_id")
                message = data.get("message")
                if incident_id and message:
                    db = SessionLocal()
                    try:
                        from models import Incident as Inc
                        incident = db.query(Inc).filter(Inc.id == incident_id).first()
                        if incident:
                            chat_msg = ChatMessage(
                                incident_id=incident_id,
                                sender_id=user_id,
                                message=message,
                            )
                            db.add(chat_msg)
                            db.commit()
                            db.refresh(chat_msg)

                            user_obj = db.query(User).filter(User.id == user_id).first()
                            chat_event = {
                                "type": "chat_message",
                                "data": {
                                    "id": chat_msg.id,
                                    "incident_id": incident_id,
                                    "sender_id": user_id,
                                    "sender_name": user_obj.name if user_obj else "Unknown",
                                    "message": message,
                                    "created_at": chat_msg.created_at.isoformat(),
                                },
                            }

                            # Send to all incident participants
                            await manager.send_personal(incident.patient_id, chat_event)
                            if incident.ambulance:
                                await manager.send_personal(incident.ambulance.user_id, chat_event)
                            if incident.hospital:
                                await manager.send_personal(incident.hospital.user_id, chat_event)
                    finally:
                        db.close()

    except WebSocketDisconnect:
        manager.disconnect(user_id)
        logger.info(f"WebSocket disconnected: user={user_id}")
    except Exception as e:
        manager.disconnect(user_id)
        logger.error(f"WebSocket error for user={user_id}: {e}")
