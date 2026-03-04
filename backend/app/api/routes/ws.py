from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json

from app.core.security import decode_token
from app.websocket.manager import manager
from app.websocket.events import WSEvent
from app.database import AsyncSessionLocal
from app.services.tracking_service import TrackingService
from app.repositories.ambulance_repo import AmbulanceRepository

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    """
    WebSocket endpoint for real-time communication.
    Connect with: ws://host/ws?token=<JWT>
    """
    # Validate token
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    payload = decode_token(token)
    if not payload:
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = int(payload.get("sub", 0))
    role = payload.get("role", "")

    if not user_id:
        await websocket.close(code=4001, reason="Invalid token payload")
        return

    # Connect
    await manager.connect(websocket, user_id, role)

    try:
        while True:
            # Receive messages from client
            data = await websocket.receive_text()
            message = json.loads(data)
            event = message.get("event", "")

            if event == WSEvent.LOCATION_UPDATE:
                # EMS sending GPS update
                location_data = message.get("data", {})
                async with AsyncSessionLocal() as db:
                    tracking = TrackingService(db)
                    # Get ambulance for this EMS user
                    amb_repo = AmbulanceRepository(db)
                    ambulance = await amb_repo.get_by_user_id(user_id)
                    if ambulance:
                        await tracking.update_ambulance_location(
                            ambulance_id=ambulance.id,
                            latitude=location_data.get("latitude", 0),
                            longitude=location_data.get("longitude", 0),
                            incident_id=location_data.get("incident_id"),
                        )
                    await db.commit()

    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception:
        manager.disconnect(user_id)
