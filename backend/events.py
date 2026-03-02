"""
Event Bus — In-process pub/sub for decoupled event handling.
Ready for Redis Pub/Sub upgrade in production.
"""

import asyncio
import logging
from typing import Callable, Dict, List, Any
from enum import Enum

logger = logging.getLogger("jeevan_setu.events")


class EventType(str, Enum):
    """Typed event categories."""
    INCIDENT_CREATED = "incident.created"
    INCIDENT_STATUS_CHANGED = "incident.status_changed"
    AMBULANCE_ASSIGNED = "ambulance.assigned"
    AMBULANCE_LOCATION_UPDATED = "ambulance.location_updated"
    HOSPITAL_ASSIGNED = "hospital.assigned"
    HOSPITAL_BEDS_UPDATED = "hospital.beds_updated"
    CHAT_MESSAGE_SENT = "chat.message_sent"
    USER_REGISTERED = "user.registered"
    USER_LOGGED_IN = "user.logged_in"
    SURGE_MODE_ACTIVATED = "system.surge_mode"
    SYSTEM_ALERT = "system.alert"


class EventBus:
    """
    Simple in-process event bus with async/sync subscriber support.
    
    Usage:
        event_bus.subscribe(EventType.INCIDENT_CREATED, handler)
        await event_bus.publish(EventType.INCIDENT_CREATED, {"incident_id": 1})
    """

    def __init__(self):
        self._subscribers: Dict[str, List[Callable]] = {}
        self._history: List[dict] = []
        self._max_history = 1000

    def subscribe(self, event_type: str | EventType, callback: Callable):
        """Register a handler for an event type."""
        key = event_type.value if isinstance(event_type, EventType) else event_type
        if key not in self._subscribers:
            self._subscribers[key] = []
        self._subscribers[key].append(callback)
        logger.debug(f"Subscriber added for {key}")

    def unsubscribe(self, event_type: str | EventType, callback: Callable):
        """Remove a handler for an event type."""
        key = event_type.value if isinstance(event_type, EventType) else event_type
        if key in self._subscribers:
            self._subscribers[key] = [
                cb for cb in self._subscribers[key] if cb != callback
            ]

    async def publish(self, event_type: str | EventType, data: dict = None):
        """
        Publish an event to all subscribers.
        Supports both sync and async handlers.
        """
        key = event_type.value if isinstance(event_type, EventType) else event_type
        event = {
            "type": key,
            "data": data or {},
        }

        # Store in history
        self._history.append(event)
        if len(self._history) > self._max_history:
            self._history = self._history[-self._max_history:]

        logger.info(f"Event published: {key}")

        subscribers = self._subscribers.get(key, [])
        for callback in subscribers:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(event)
                else:
                    callback(event)
            except Exception as e:
                logger.error(f"Event handler error for {key}: {e}")

    def get_history(self, event_type: str = None, limit: int = 50) -> list:
        """Get recent event history, optionally filtered by type."""
        events = self._history
        if event_type:
            events = [e for e in events if e["type"] == event_type]
        return events[-limit:]


# Singleton event bus
event_bus = EventBus()
