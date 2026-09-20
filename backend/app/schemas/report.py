import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ExposureChainStep(BaseModel):
    """A single sequential step in a defensive 'What Happens If You Share This?' timeline."""
    step_number: int = Field(description="Step index (1, 2, or 3)")
    stage: str = Field(description="Stage name: Observation, Potential Abuse, Remediation")
    description: str = Field(description="Educational and defensive explanation")


class ExposureChainData(BaseModel):
    """Complete 3-step threat timeline for a specific exposure vector."""
    finding_type: str = Field(description="Exposure finding type identifier")
    title: str = Field(description="Action-oriented timeline title")
    steps: List[ExposureChainStep] = Field(description="3-stage progressive explanation")


class EvidenceCardData(BaseModel):
    """Rich interactive evidence card for a detected cybersecurity finding."""
    id: uuid.UUID = Field(description="Unique finding identifier")
    finding_type: str = Field(description="Finding type identifier")
    category: str = Field(description="General category: CREDENTIAL, IDENTITY, etc.")
    attack_surface: str = Field(description="Target surface: Developer, Identity, Financial, Workplace, Privacy")
    exposure_vector: str = Field(description="Abuse vector: Credential Leakage, Identity Theft, etc.")
    severity: str = Field(description="Severity classification")
    confidence: float = Field(description="Detection confidence score")
    confidence_reasons: List[str] = Field(default_factory=list, description="Explainable AI detection rationale")
    masked_value: str = Field(description="Safely masked secret/entity snippet")
    bbox: List[int] = Field(description="Bounding box [x1, y1, x2, y2]")
    page_number: int = Field(default=1, description="Document page number")
    recommendation: Dict[str, Any] = Field(description="Actionable remediation playbook")


class CyberSafetyReceiptData(BaseModel):
    """Authoritative Cyber Safety Receipt summary snapshot."""
    scan_id: uuid.UUID = Field(description="Parent scan session identifier")
    exposure_score: int = Field(ge=0, le=100, description="Overall Exposure Score (0 to 100)")
    risk_level: str = Field(description="Overall risk tier: CRITICAL, HIGH, MEDIUM, LOW, SAFE")
    total_findings: int = Field(description="Total count of security exposures identified")
    files_scanned: int = Field(default=1, description="Number of digital artifacts analyzed")
    critical_findings: int = Field(description="Number of CRITICAL severity findings")
    high_findings: int = Field(description="Number of HIGH severity findings")
    medium_findings: int = Field(description="Number of MEDIUM severity findings")
    low_findings: int = Field(description="Number of LOW severity findings")
    safeshare_ready: bool = Field(description="Whether automated SafeShare redaction is available")
    threat_categories: Dict[str, int] = Field(
        default_factory=dict,
        description="Finding count breakdown across attack surfaces",
    )
    generated_at: datetime = Field(description="Receipt generation timestamp in UTC")


class ReportResponseData(BaseModel):
    """Comprehensive PersonaShield Cybersecurity Intelligence Report."""
    model_config = ConfigDict(from_attributes=True)

    report_id: uuid.UUID = Field(description="Unique report identifier")
    scan_id: uuid.UUID = Field(description="Scan session identifier")
    receipt: CyberSafetyReceiptData = Field(description="Executive Cyber Safety Receipt")
    evidence_cards: List[EvidenceCardData] = Field(description="Detailed evidence cards with coordinates")
    exposure_chains: List[ExposureChainData] = Field(description="Defensive 'What Happens If You Share This?' chains")
    safeshare_available: bool = Field(description="SafeShare redaction readiness flag")
    safeshare_preview_cta: str = Field(
        default="Generate a secure, redacted copy with SafeShare before sharing this artifact.",
        description="Call-to-action previewing SafeShare capabilities",
    )
