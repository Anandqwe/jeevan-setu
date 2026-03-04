from typing import Dict, List, Set
import json
from datetime import datetime, timezone

from fastapi import WebSocket


class ConnectionManager:
    """
    Manages WebSocket connections grouped by user_id, role, and incident rooms.
    """

    def __init__(self):
        # user_id -> WebSocket
        self.active_connections: Dict[int, WebSocket] = {}
        # role -> set of user_ids
        self.role_groups: Dict[str, Set[int]] = {}
        # incident_id -> set of user_ids
        self.incident_rooms: Dict[int, Set[int]] = {}

    async def connect(self, websocket: WebSocket, user_id: int, role: str):
        """Accept a WebSocket connection and register it."""
        await websocket.accept()
        self.active_connections[user_id] = websocket

        # Add to role group
        if role not in self.role_groups:
            self.role_groups[role] = set()
        self.role_groups[role].add(user_id)

        # Send connected acknowledgement
        await self.send_personal(user_id, {
            "event": "connected",
            "data": {"user_id": user_id, "role": role},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    def disconnect(self, user_id: int):
        """Remove a user's connection."""
        if user_id in self.active_connections:
            del self.active_connections[user_id]

        # Remove from role groups
        for role_group in self.role_groups.values():
            role_group.discard(user_id)

        # Remove from incident rooms
        for room in self.incident_rooms.values():
            room.discard(user_id)

    def join_incident_room(self, incident_id: int, user_id: int):
        """Add a user to an incident room for targeted broadcasts."""
        if incident_id not in self.incident_rooms:
            self.incident_rooms[incident_id] = set()
        self.incident_rooms[incident_id].add(user_id)

    def leave_incident_room(self, incident_id: int, user_id: int):
        """Remove a user from an incident room."""
        if incident_id in self.incident_rooms:
            self.incident_rooms[incident_id].discard(user_id)

    async def send_personal(self, user_id: int, message: dict):
        """Send a message to a specific user."""
        websocket = self.active_connections.get(user_id)
        if websocket:
            try:
                await websocket.send_json(message)
            except Exception:
                self.disconnect(user_id)

    async def broadcast_to_role(self, role: str, message: dict):
        """Broadcast a message to all users of a specific role."""
        user_ids = self.role_groups.get(role, set()).copy()
        for user_id in user_ids:
            await self.send_personal(user_id, message)

    async def broadcast_to_incident(self, incident_id: int, message: dict):
        """Broadcast a message to all participants of an incident."""
        user_ids = self.incident_rooms.get(incident_id, set()).copy()
        for user_id in user_ids:
            await self.send_personal(user_id, message)

    async def broadcast_all(self, message: dict):
        """Broadcast a message to all connected users."""
        user_ids = list(self.active_connections.keys())
        for user_id in user_ids:
            await self.send_personal(user_id, message)

    @property
    def connected_count(self) -> int:
        return len(self.active_connections)


# Singleton instance
manager = ConnectionManager()
