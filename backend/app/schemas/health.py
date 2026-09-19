from pydantic import BaseModel, Field


class HealthData(BaseModel):
    """Health check payload. Does not expose internal version or infrastructure paths."""
    status: str = Field(default="healthy", description="Application service status")
    database: str = Field(description="Database connectivity status: 'healthy' or 'unhealthy'")
    service: str = Field(default="backend", description="Service component name")
