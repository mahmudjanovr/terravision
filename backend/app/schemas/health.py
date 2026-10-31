from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel


class ComponentHealth(BaseModel):
    status: str
    connected: bool
    message: str
    details: Optional[Dict[str, Any]] = None


class ProviderStatusSchema(BaseModel):
    id: str
    name: str
    status: str
    data_modalities: list[str]
    rate_limit: str
    last_verified: Optional[datetime] = None
    attribution: str


class SystemHealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
    database: ComponentHealth
    cache: ComponentHealth
    providers: Dict[str, ProviderStatusSchema]
