import time
import uuid
from typing import Callable
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.app.core.config import settings
from backend.app.core.logging import logger


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Ensures every HTTP request has a unique UUID request identifier.
    Exposes it via `request.state.request_id` and adds `X-Request-ID` to response.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_request_id = request.headers.get("X-Request-ID")
        if client_request_id:
            try:
                validated_uuid = str(uuid.UUID(client_request_id))
                request_id = validated_uuid
            except ValueError:
                request_id = str(uuid.uuid4())
        else:
            request_id = str(uuid.uuid4())

        request.state.request_id = request_id
        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Injects defensive security headers onto every HTTP response.
    Protects against MIME sniffing, clickjacking, referrer leakage, and browser API misuse.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs structured access entries per request.
    Strictly follows RULES.md: logs only timestamp, request_id, endpoint,
    status_code, and duration_ms. Never logs uploaded file content, tokens,
    or sensitive query/body parameters.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))

        response: Response
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(
                "Unhandled error during request processing",
                extra={
                    "request_id": request_id,
                    "endpoint": request.url.path,
                    "status_code": 500,
                    "duration_ms": duration_ms,
                },
                exc_info=True,
            )
            raise exc

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.info(
            f"{request.method} {request.url.path} completed with {status_code} in {duration_ms}ms",
            extra={
                "request_id": request_id,
                "endpoint": request.url.path,
                "status_code": status_code,
                "duration_ms": duration_ms,
            },
        )
        return response


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Priority 4: Request Size Limit Middleware.
    Guards FastAPI against oversized payloads before reading the entire body.
    Enforces a strict maximum request size (default: settings.MAX_REQUEST_BODY_BYTES = 15 MB).
    Returns HTTP 413 Payload Too Large if Content-Length exceeds limit.
    """

    def __init__(self, app, max_bytes: int | None = None):
        super().__init__(app)
        self.max_bytes = max_bytes if max_bytes is not None else settings.MAX_REQUEST_BODY_BYTES

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                length_val = int(content_length)
                if length_val > self.max_bytes:
                    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
                    max_mb = self.max_bytes // (1024 * 1024)
                    return JSONResponse(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        content={
                            "success": False,
                            "data": None,
                            "error": {
                                "code": "PAYLOAD_TOO_LARGE",
                                "message": f"Request body exceeds maximum allowed size of {max_mb} MB",
                                "details": {"max_bytes": self.max_bytes, "content_length": length_val},
                            },
                            "request_id": request_id,
                        },
                        headers={"X-Request-ID": request_id},
                    )
            except ValueError:
                pass

        return await call_next(request)
