"""
Request / response logging middleware.

Emits one structured log line per request containing:
  - A unique request ID (echoed back in the X-Request-ID response header)
  - HTTP method, path, and query string
  - Response status code
  - Wall-clock duration in milliseconds
  - Client IP address

The request ID is either taken from an incoming X-Request-ID header (useful
when an upstream proxy already stamps requests) or generated fresh as a UUID4.
The ID is added to every response header so clients and proxies can correlate
log lines with specific requests.

Health-check requests to /health are logged at DEBUG level to avoid cluttering
production logs with liveness-probe noise.
"""

from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

logger = logging.getLogger("healthdash.access")

# Paths whose successful responses are demoted to DEBUG to reduce noise.
_QUIET_PATHS = frozenset({"/health"})


class LoggingMiddleware(BaseHTTPMiddleware):
    """Structured access-log middleware for the HealthDash API."""

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # ── Request ID ────────────────────────────────────────────────────────
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())

        # ── Timing ───────────────────────────────────────────────────────────
        started_at = time.perf_counter()

        # ── Call downstream ──────────────────────────────────────────────────
        status_code = 500
        try:
            response: Response = await call_next(request)
            status_code = response.status_code
        except Exception:
            logger.exception(
                "Unhandled exception",
                extra=_extra(request, request_id, status_code, 0),
            )
            raise
        finally:
            duration_ms = (time.perf_counter() - started_at) * 1_000

        # ── Stamp response headers ────────────────────────────────────────────
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{duration_ms:.2f}ms"

        # ── Emit log line ─────────────────────────────────────────────────────
        level = _log_level(request.url.path, status_code)
        logger.log(
            level,
            "%s %s → %d  (%.1fms)",
            request.method,
            _path_with_query(request),
            status_code,
            duration_ms,
            extra=_extra(request, request_id, status_code, duration_ms),
        )

        return response


# ── Helpers ───────────────────────────────────────────────────────────────────

def _path_with_query(request: Request) -> str:
    """Return path + query string if present, e.g. /api/v1/patients?page=2."""
    path = request.url.path
    qs = request.url.query
    return f"{path}?{qs}" if qs else path


def _extra(
    request: Request,
    request_id: str,
    status_code: int,
    duration_ms: float,
) -> dict[str, object]:
    """Build the `extra` dict passed to every log record for structured output."""
    return {
        "request_id": request_id,
        "method": request.method,
        "path": request.url.path,
        "query": request.url.query or None,
        "status_code": status_code,
        "duration_ms": round(duration_ms, 2),
        "client_ip": _client_ip(request),
    }


def _client_ip(request: Request) -> str:
    """
    Extract the real client IP, respecting X-Forwarded-For set by a reverse
    proxy (e.g. nginx in the Docker Compose setup).
    """
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _log_level(path: str, status_code: int) -> int:
    """
    Choose log level based on path and outcome:
      - Quiet paths with 2xx/3xx → DEBUG  (health probes, etc.)
      - Client errors 4xx → WARNING
      - Server errors 5xx → ERROR
      - Everything else → INFO
    """
    if path in _QUIET_PATHS and status_code < 400:
        return logging.DEBUG
    if status_code >= 500:
        return logging.ERROR
    if status_code >= 400:
        return logging.WARNING
    return logging.INFO
