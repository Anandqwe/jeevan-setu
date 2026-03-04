from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.ambulance_repo import AmbulanceRepository
from app.websocket.manager import manager
from app.websocket.events import ambulance_position_msg


class TrackingService:
    """
    Handles GPS location processing and broadcasting.
    """

    def __init__(self, db: AsyncSession):
        self.ambulance_repo = AmbulanceRepository(db)

    async def update_ambulance_location(
        self,
        ambulance_id: int,
        latitude: float,
        longitude: float,
        incident_id: int = None,
    ):
        """
        Update ambulance GPS position and broadcast to incident participants.
        Called when EMS sends location_update via WebSocket.
        """
        # Update in database
        ambulance = await self.ambulance_repo.update_location(
            ambulance_id, latitude, longitude
        )

        if not ambulance:
            return

        # Build position message
        position_msg = ambulance_position_msg(ambulance_id, latitude, longitude)

        # Broadcast to incident room if incident_id provided
        if incident_id:
            await manager.broadcast_to_incident(incident_id, position_msg)

        # Also broadcast to all admins
        await manager.broadcast_to_role("ADMIN", position_msg)
