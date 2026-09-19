from datetime import datetime
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response schema. Does not expose sensitive system details."""
    status: str = Field(default="healthy", description="Overall application health status")
    database: str = Field(description="Database connectivity status: 'healthy' or 'unhealthy'")
    version: str = Field(description="Application version")
    timestamp: datetime = Field(description="UTC timestamp of the health check")
