"""
WebSocket connection manager for real-time event broadcasting.
Supports role-filtered and user-targeted messaging.
"""

import json
from typing import Dict, List, Optional
from fastapi import WebSocket


class ConnectionManager:
    """
    Manages WebSocket connections for real-time event dispatch.
    Connections are indexed by user_id for targeted messaging,
    and also tracked by role for role-based broadcasting.
    """

    def __init__(self):
        # user_id → WebSocket
        self.active_connections: Dict[int, WebSocket] = {}
        # user_id → role string
        self.user_roles: Dict[int, str] = {}

    async def connect(self, websocket: WebSocket, user_id: int, role: str):
        """Accept a WebSocket connection and register it."""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        self.user_roles[user_id] = role

    def disconnect(self, user_id: int):
        """Remove a WebSocket connection."""
        self.active_connections.pop(user_id, None)
        self.user_roles.pop(user_id, None)

    async def send_personal(self, user_id: int, message: dict):
        """Send a message to a specific user by user_id."""
        ws = self.active_connections.get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(user_id)

    async def broadcast(self, message: dict):
        """Broadcast a message to all connected clients."""
        disconnected = []
        for user_id, ws in self.active_connections.items():
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(user_id)
        for uid in disconnected:
            self.disconnect(uid)

    async def broadcast_to_role(self, role: str, message: dict):
        """Broadcast a message to all users with a specific role."""
        disconnected = []
        for user_id, user_role in self.user_roles.items():
            if user_role == role:
                ws = self.active_connections.get(user_id)
                if ws:
                    try:
                        await ws.send_json(message)
                    except Exception:
                        disconnected.append(user_id)
        for uid in disconnected:
            self.disconnect(uid)

    async def broadcast_to_users(self, user_ids: List[int], message: dict):
        """Broadcast a message to a specific list of users."""
        for user_id in user_ids:
            await self.send_personal(user_id, message)


# Singleton instance used across the application
manager = ConnectionManager()
