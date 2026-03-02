"""
Middleware — Rate limiting, audit logging, structured JSON logging, secure headers.
"""

import time
import json
import logging
import sys
from collections import defaultdict
from typing import Callable
from datetime import datetime

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


# ─── Structured JSON Logging ─────────────────────────────────────────────────

class JSONFormatter(logging.Formatter):
    """Output structured JSON log entries."""

    def format(self, record):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id
        if record.exc_info and record.exc_info[0]:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


def setup_logging(level: str = "INFO", format_type: str = "json"):
    """Configure structured logging for the application."""
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)

    if format_type == "json":
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
        ))

    root_logger.addHandler(handler)

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


# ─── Rate Limiting Middleware ─────────────────────────────────────────────────

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiter per IP address.
    Uses a sliding window approach.
    """

    def __init__(self, app, max_requests: int = 120, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for WebSocket, health checks
        if request.url.path in ["/ws", "/api/health", "/api/health/ready"]:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - self.window_seconds

        # Clean old entries
        self.requests[client_ip] = [
            t for t in self.requests[client_ip] if t > window_start
        ]

        if len(self.requests[client_ip]) >= self.max_requests:
            return Response(
                content=json.dumps({
                    "detail": "Rate limit exceeded. Please try again later.",
                    "retry_after": self.window_seconds,
                }),
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": str(self.window_seconds)},
            )

        self.requests[client_ip].append(now)
        return await call_next(request)


# ─── Request Logging Middleware ───────────────────────────────────────────────

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all HTTP requests with timing information."""

    def __init__(self, app):
        super().__init__(app)
        self.logger = logging.getLogger("jeevan_setu.access")

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.time()
        response = await call_next(request)
        duration_ms = (time.time() - start) * 1000

        self.logger.info(
            f"{request.method} {request.url.path} → {response.status_code} "
            f"({duration_ms:.1f}ms)"
        )

        return response


# ─── Secure Headers Middleware ────────────────────────────────────────────────

class SecureHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(self)"

        return response
