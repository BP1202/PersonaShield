import pytest
from backend.app.intelligence.exposure_chain import (
    build_exposure_chain,
    EXPOSURE_CHAIN_PLAYBOOKS,
    DEFAULT_CHAIN,
    ExposureChain,
)


def test_build_exposure_chain_known_findings():
    """Verify exposure chains for representative finding types across attack surfaces."""
    test_cases = [
        "AWS_ACCESS_KEY_EXPOSURE",
        "OPENAI_API_KEY_EXPOSURE",
        "GITHUB_TOKEN_EXPOSURE",
        "AADHAAR_EXPOSURE",
        "PAN_EXPOSURE",
        "COMBINED_IDENTITY_EXPOSURE",
        "CREDIT_CARD_EXPOSURE",
        "INTERNAL_IP_EXPOSURE",
        "PHONE_EXPOSURE",
    ]

    for finding_type in test_cases:
        chain = build_exposure_chain(finding_type)
        assert isinstance(chain, ExposureChain)
        assert chain.finding_type == finding_type
        assert len(chain.title) > 0
        assert len(chain.steps) == 3

        # Verify step numbering and stages
        expected_stages = ["Observation", "Potential Abuse", "Remediation"]
        for idx, step in enumerate(chain.steps, start=1):
            assert step.step_number == idx
            assert step.stage == expected_stages[idx - 1]
            assert len(step.description) > 10


def test_build_exposure_chain_unknown_finding_fallback():
    """Verify fallback to DEFAULT_CHAIN when finding_type is unknown."""
    chain = build_exposure_chain("COMPLETELY_UNKNOWN_CUSTOM_FINDING")
    assert chain.finding_type == "COMPLETELY_UNKNOWN_CUSTOM_FINDING"
    assert chain.title == DEFAULT_CHAIN["title"]
    assert len(chain.steps) == 3
    assert chain.steps[0].stage == "Observation"
    assert chain.steps[1].stage == "Potential Abuse"
    assert chain.steps[2].stage == "Remediation"


def test_all_playbook_entries_are_three_steps():
    """Ensure every playbook defined in EXPOSURE_CHAIN_PLAYBOOKS conforms to 3 steps."""
    for finding_type, config in EXPOSURE_CHAIN_PLAYBOOKS.items():
        steps = config["steps"]
        assert len(steps) == 3, f"Playbook for {finding_type} must have exactly 3 steps."
        for step in steps:
            num, stage, desc = step
            assert isinstance(num, int)
            assert stage in ("Observation", "Potential Abuse", "Remediation")
            assert isinstance(desc, str) and len(desc) > 0
