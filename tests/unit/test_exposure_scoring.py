import pytest
from backend.app.intelligence.scoring import calculate_exposure_score


class MockFinding:
    def __init__(self, severity: str, category: str):
        self.severity = severity
        self.category = category


def test_exposure_score_empty_findings():
    res = calculate_exposure_score([])
    assert res.total_score == 0
    assert res.risk_level == "SAFE"
    assert res.severity_counts["CRITICAL"] == 0
    assert res.breakdown_by_category == {}


def test_exposure_score_single_critical():
    findings = [MockFinding(severity="CRITICAL", category="CREDENTIAL")]
    res = calculate_exposure_score(findings)
    assert res.total_score == 35
    assert res.risk_level == "MEDIUM"
    assert res.severity_counts["CRITICAL"] == 1
    assert "CREDENTIAL" in res.breakdown_by_category


def test_exposure_score_multi_vector_compounding():
    # 2 CRITICAL findings from 2 different categories triggers +10 compound risk
    findings = [
        MockFinding(severity="CRITICAL", category="CREDENTIAL"),  # 35
        MockFinding(severity="CRITICAL", category="IDENTITY"),    # 35
    ]
    # Total = 35 + 35 + 10 (compound bonus) = 80
    res = calculate_exposure_score(findings)
    assert res.total_score == 80
    assert res.risk_level == "CRITICAL"
    assert "COMPOUND_VECTOR" in res.breakdown_by_category


def test_exposure_score_clamped_at_100():
    findings = [
        MockFinding(severity="CRITICAL", category="CREDENTIAL"),
        MockFinding(severity="CRITICAL", category="IDENTITY"),
        MockFinding(severity="CRITICAL", category="FINANCIAL"),
        MockFinding(severity="HIGH", category="WORKPLACE"),
    ]
    res = calculate_exposure_score(findings)
    assert res.total_score == 100
    assert res.risk_level == "CRITICAL"
