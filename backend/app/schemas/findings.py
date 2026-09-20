import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class FindingEvidence(BaseModel):
    """Evidence metadata supporting a detected cybersecurity finding."""
    bbox: List[int] = Field(description="Bounding box [x1, y1, x2, y2]")
    masked_value: str = Field(description="Safely masked secret/entity snippet")
    page_number: int = Field(default=1, description="Document page index (1-based)")
    raw_type: str = Field(description="Original entity classification type")


class FindingRecommendation(BaseModel):
    """Actionable remediation playbook for a detected cybersecurity exposure."""
    title: str = Field(description="Concise recommendation title")
    priority: str = Field(description="Remediation urgency: Immediate, High, Medium, Low")
    impact_summary: str = Field(description="Cybersecurity risk and threat explanation")
    action_steps: List[str] = Field(description="Concrete step-by-step remediation procedures")


class FindingResponseData(BaseModel):
    """Authoritative cybersecurity exposure finding."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(description="Unique finding identifier")
    scan_session_id: uuid.UUID = Field(description="Parent scan session identifier")
    entity_id: Optional[uuid.UUID] = Field(default=None, description="Linked extracted entity ID if applicable")
    finding_type: str = Field(description="Deterministic exposure identifier (e.g. AWS_ACCESS_KEY_EXPOSURE)")
    category: str = Field(description="Risk category (CREDENTIAL, IDENTITY, FINANCIAL, WORKPLACE, PRIVACY)")
    attack_surface: str = Field(default="Developer", description="Attack surface: Developer, Identity, Financial, Workplace, Privacy")
    exposure_vector: str = Field(default="Credential Leakage", description="Real-world abuse vector: Credential Leakage, Identity Theft, etc.")
    severity: str = Field(description="Severity tier (CRITICAL, HIGH, MEDIUM, LOW)")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0")
    confidence_reasons: List[str] = Field(default_factory=list, description="Transparent explainable AI reasons for detection")
    evidence: Dict[str, Any] = Field(description="Evidence including bbox and masked snippet")
    recommendation: Dict[str, Any] = Field(description="Actionable remediation playbook")
    created_at: datetime = Field(description="Finding evaluation timestamp in UTC")


class ScoreCategoryItem(BaseModel):
    """Score contribution breakdown for a single category."""
    score_points: int = Field(description="Risk points contributed to total score")
    findings_count: int = Field(description="Number of findings in this category")


class ExposureScoreResponseData(BaseModel):
    """Autoritative Exposure Score evaluation for a scan session."""
    scan_id: uuid.UUID = Field(description="Scan session identifier")
    score: int = Field(ge=0, le=100, description="Cybersecurity Exposure Score (0 to 100)")
    risk_level: str = Field(description="Risk tier: CRITICAL, HIGH, MEDIUM, LOW, SAFE")
    total_findings: int = Field(description="Total number of evaluated exposures")
    critical_count: int = Field(description="Count of CRITICAL severity findings")
    high_count: int = Field(description="Count of HIGH severity findings")
    medium_count: int = Field(description="Count of MEDIUM severity findings")
    low_count: int = Field(description="Count of LOW severity findings")
    breakdown: Dict[str, ScoreCategoryItem] = Field(description="Category-by-category score points")


class DetectionSummaryResponseData(BaseModel):
    """Summary of detection pipeline execution."""
    model_config = ConfigDict(from_attributes=True)

    scan_id: uuid.UUID = Field(description="Scan session identifier")
    status: str = Field(description="Current status of the scan session")
    total_findings: int = Field(description="Total exposures identified")
    exposure_score: int = Field(ge=0, le=100, description="Overall Exposure Score (0 to 100)")
    risk_level: str = Field(description="Overall risk level")
    findings: List[FindingResponseData] = Field(description="Evaluated cybersecurity findings")
