from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    """Sanitized standard error response model."""
    error_code: str = Field(description="Deterministic error identifier code")
    detail: str = Field(description="Safe, non-sensitive error explanation")
    request_id: str = Field(description="Request correlation ID")
