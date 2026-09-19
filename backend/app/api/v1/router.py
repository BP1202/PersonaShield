from fastapi import APIRouter
from backend.app.api.v1.endpoints import extraction, findings, health, report, scan

api_v1_router = APIRouter()

api_v1_router.include_router(health.router, tags=["Health"])
api_v1_router.include_router(scan.router, prefix="/scan", tags=["Scan Sessions"])
api_v1_router.include_router(extraction.router, prefix="/scan", tags=["Extraction Engine"])
api_v1_router.include_router(findings.router, prefix="/scan", tags=["Exposure Detection Engine"])
api_v1_router.include_router(report.router, prefix="/scan", tags=["Cybersecurity Intelligence Report"])


