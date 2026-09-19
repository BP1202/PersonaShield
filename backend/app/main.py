from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.app.api.v1.router import api_v1_router
from backend.app.core.config import settings
from backend.app.core.database import engine
from backend.app.core.logging import logger, setup_logging
from backend.app.core.middleware import RequestIDMiddleware, StructuredLoggingMiddleware
from backend.app.schemas.error import ErrorResponse
from backend.app.services.storage_service import storage_service


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager for startup and shutdown events."""
    # 1. Initialize logging
    setup_logging(log_level=settings.LOG_LEVEL)
    logger.info(
        f"Starting {settings.APP_NAME} v{settings.APP_VERSION} (env={settings.ENVIRONMENT})"
    )

    # 2. Ensure secure upload directory exists
    storage_service._ensure_upload_directory()

    yield

    # 3. Clean shutdown: dispose database connection pool
    logger.info("Shutting down database connection engine")
    await engine.dispose()
    logger.info("Application shutdown complete")


def create_app() -> FastAPI:
    """Factory creating and configuring the FastAPI application."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Preventive Cybersecurity Platform — Accidentally Exposed Digital Information Detection",
        docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
        lifespan=lifespan,
    )

    # Register Middlewares (Order matters: Request ID outer, Logging inner)
    app.add_middleware(StructuredLoggingMiddleware)
    app.add_middleware(RequestIDMiddleware)

    # Safe Exception Handlers complying with RULES.md
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "unknown")
        error_resp = ErrorResponse(
            error_code=f"HTTP_{exc.status_code}",
            detail=str(exc.detail),
            request_id=request_id,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=error_resp.model_dump(),
            headers={"X-Request-ID": request_id},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "unknown")
        error_resp = ErrorResponse(
            error_code="VALIDATION_ERROR",
            detail="Request validation failed: " + "; ".join(
                [f"{err.get('loc', ['field'])[-1]}: {err.get('msg')}" for err in exc.errors()]
            ),
            request_id=request_id,
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content=error_resp.model_dump(),
            headers={"X-Request-ID": request_id},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "unknown")
        logger.error(
            f"Internal server error: {type(exc).__name__}",
            extra={"request_id": request_id},
            exc_info=True,
        )
        error_resp = ErrorResponse(
            error_code="INTERNAL_SERVER_ERROR",
            detail="An unexpected internal error occurred. Please contact security operations with the request ID.",
            request_id=request_id,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_resp.model_dump(),
            headers={"X-Request-ID": request_id},
        )

    # Mount API router
    app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

    return app


app = create_app()
