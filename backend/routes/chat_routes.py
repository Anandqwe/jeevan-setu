"""
Chat routes: CRUD for incident-based real-time chat messages.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User, Incident, ChatMessage
from schemas import ChatMessageCreate, ChatMessageOut
from auth import get_current_user
from websocket_manager import manager

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("/", response_model=ChatMessageOut, status_code=201)
async def send_message(
    data: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a chat message related to an incident."""
    # Verify incident exists
    incident = db.query(Incident).filter(Incident.id == data.incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Authorization: only participants can chat
    is_participant = False
    if current_user.role.value == "patient" and incident.patient_id == current_user.id:
        is_participant = True
    elif current_user.role.value == "ems" and incident.ambulance and incident.ambulance.user_id == current_user.id:
        is_participant = True
    elif current_user.role.value == "hospital" and incident.hospital and incident.hospital.user_id == current_user.id:
        is_participant = True
    elif current_user.role.value == "admin":
        is_participant = True

    if not is_participant:
        raise HTTPException(status_code=403, detail="Not a participant in this incident")

    # Create message
    msg = ChatMessage(
        incident_id=data.incident_id,
        sender_id=current_user.id,
        message=data.message,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    result = ChatMessageOut(
        id=msg.id,
        incident_id=msg.incident_id,
        sender_id=msg.sender_id,
        sender_name=current_user.name,
        message=msg.message,
        created_at=msg.created_at,
    )

    # Broadcast to all incident participants via WebSocket
    chat_event = {
        "type": "chat_message",
        "data": {
            "id": msg.id,
            "incident_id": msg.incident_id,
            "sender_id": msg.sender_id,
            "sender_name": current_user.name,
            "message": msg.message,
            "created_at": msg.created_at.isoformat(),
        },
    }

    # Notify patient
    await manager.send_personal(incident.patient_id, chat_event)
    # Notify EMS
    if incident.ambulance:
        await manager.send_personal(incident.ambulance.user_id, chat_event)
    # Notify hospital
    if incident.hospital:
        await manager.send_personal(incident.hospital.user_id, chat_event)

    return result


@router.get("/incident/{incident_id}", response_model=list[ChatMessageOut])
def get_incident_messages(
    incident_id: int,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get chat messages for an incident."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Authorization check
    is_participant = False
    if current_user.role.value == "patient" and incident.patient_id == current_user.id:
        is_participant = True
    elif current_user.role.value == "ems" and incident.ambulance and incident.ambulance.user_id == current_user.id:
        is_participant = True
    elif current_user.role.value == "hospital" and incident.hospital and incident.hospital.user_id == current_user.id:
        is_participant = True
    elif current_user.role.value == "admin":
        is_participant = True

    if not is_participant:
        raise HTTPException(status_code=403, detail="Not a participant in this incident")

    messages = db.query(ChatMessage).filter(
        ChatMessage.incident_id == incident_id
    ).order_by(ChatMessage.created_at.asc()).limit(limit).all()

    results = []
    for msg in messages:
        sender = msg.sender
        results.append(ChatMessageOut(
            id=msg.id,
            incident_id=msg.incident_id,
            sender_id=msg.sender_id,
            sender_name=sender.name if sender else None,
            message=msg.message,
            created_at=msg.created_at,
        ))
    return results
