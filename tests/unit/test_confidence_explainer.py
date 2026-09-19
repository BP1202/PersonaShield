import pytest
from backend.app.intelligence.confidence_explainer import explain_finding_confidence


def test_explain_finding_confidence_aws():
    reasons = explain_finding_confidence("AWS_ACCESS_KEY_EXPOSURE", 0.99, has_bbox=True)
    assert any("AKIA" in r for r in reasons)
    assert any("High-confidence" in r for r in reasons)
    assert any("bounding box" in r for r in reasons)
    assert len(reasons) >= 3


def test_explain_finding_confidence_aadhaar():
    reasons = explain_finding_confidence("AADHAAR_EXPOSURE", 0.88, has_bbox=True)
    assert any("Aadhaar format" in r for r in reasons)
    assert any("Reliable OCR text recognition" in r for r in reasons)
    assert any("bounding box" in r for r in reasons)


def test_explain_finding_confidence_compound():
    reasons = explain_finding_confidence(
        "COMBINED_IDENTITY_EXPOSURE",
        0.95,
        has_bbox=False,
        is_compound=True,
    )
    assert any("Cross-entity correlation" in r for r in reasons)
    # no bbox reason
    assert not any("bounding box" in r for r in reasons)


def test_explain_finding_confidence_generic_fallback():
    reasons = explain_finding_confidence("CUSTOM_DETECTION", 0.70, has_bbox=False)
    assert any("deterministic cybersecurity pattern" in r for r in reasons)
    assert any("baseline confidence" in r for r in reasons)
