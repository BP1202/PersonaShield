from typing import Generic, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class APIErrorDetail(BaseModel):
    """Detailed error object in standard error response."""
    code: str = Field(description="Deterministic error code")
    message: str = Field(description="Sanitized explanation of the error")


class APIResponse(BaseModel, Generic[T]):
    """Standard API response wrapper adhering to Sprint 0.1 specifications."""
    success: bool = Field(description="True if operation succeeded, False otherwise")
    request_id: str = Field(description="Unique correlation ID for tracing")
    data: Optional[T] = Field(default=None, description="Payload data if successful")
    error: Optional[APIErrorDetail] = Field(default=None, description="Error detail if failed")


def success_response(data: T, request_id: str) -> APIResponse[T]:
    """Helper to construct a successful APIResponse envelope."""
    return APIResponse[T](
        success=True,
        request_id=request_id,
        data=data,
        error=None,
    )


def error_response(code: str, message: str, request_id: str) -> APIResponse[None]:
    """Helper to construct a failed APIResponse envelope."""
    return APIResponse[None](
        success=False,
        request_id=request_id,
        data=None,
        error=APIErrorDetail(code=code, message=message),
    )
