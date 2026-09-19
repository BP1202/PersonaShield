from typing import Any, Dict, List, NamedTuple


class ChainStep(NamedTuple):
    step_number: int
    stage: str
    description: str


class ExposureChain(NamedTuple):
    finding_type: str
    title: str
    steps: List[ChainStep]


EXPOSURE_CHAIN_PLAYBOOKS: Dict[str, Dict[str, Any]] = {
    "OPENAI_API_KEY_EXPOSURE": {
        "title": "OpenAI API Key Compromise Chain",
        "steps": [
            (1, "Observation", "OpenAI API secret key identified within digital artifact."),
            (2, "Potential Abuse", "Adversaries could scrape this key to consume paid model quotas, access private completions, or deplete API credits."),
            (3, "Remediation", "Rotate the key immediately in the OpenAI API dashboard and redact this image before sharing."),
        ],
    },
    "ANTHROPIC_API_KEY_EXPOSURE": {
        "title": "Claude API Key Exposure Chain",
        "steps": [
            (1, "Observation", "Anthropic Claude API key identified in document or screenshot."),
            (2, "Potential Abuse", "Unauthorized parties can make automated completions, incurring billing charges and quota exhaustion."),
            (3, "Remediation", "Revoke the key via the Anthropic Console and mask before transmission."),
        ],
    },
    "AWS_ACCESS_KEY_EXPOSURE": {
        "title": "Cloud Infrastructure Takeover Chain",
        "steps": [
            (1, "Observation", "Long-lived AWS IAM Access Key (AKIA) detected."),
            (2, "Potential Abuse", "Compromised AWS credentials grant attackers direct access to cloud APIs, private S3 buckets, and compute instances."),
            (3, "Remediation", "Deactivate the key in AWS IAM console, audit CloudTrail event logs, and apply SafeShare redaction."),
        ],
    },
    "GITHUB_TOKEN_EXPOSURE": {
        "title": "Source Code & Repository Access Chain",
        "steps": [
            (1, "Observation", "GitHub Personal Access Token (PAT) detected."),
            (2, "Potential Abuse", "Attacker can clone private repositories, alter commit histories, and exfiltrate CI/CD secrets."),
            (3, "Remediation", "Revoke the token in GitHub Developer Settings and rotate linked secrets."),
        ],
    },
    "SLACK_TOKEN_EXPOSURE": {
        "title": "Internal Workspace Interception Chain",
        "steps": [
            (1, "Observation", "Slack bot/user authentication token identified."),
            (2, "Potential Abuse", "Allows unauthorized reading of internal chat channels, private files, and team member directories."),
            (3, "Remediation", "Rotate the OAuth token in Slack App Management and inspect workspace access logs."),
        ],
    },
    "DATABASE_CONNECTION_STRING_EXPOSURE": {
        "title": "Direct Database Compromise Chain",
        "steps": [
            (1, "Observation", "Database connection URI containing administrative credentials identified."),
            (2, "Potential Abuse", "Allows direct network penetration to dump sensitive tables, extract user records, or alter production data."),
            (3, "Remediation", "Immediately rotate database user password, verify firewall restricts public access, and redact the connection URI."),
        ],
    },
    "JWT_TOKEN_EXPOSURE": {
        "title": "Active Session Hijacking Chain",
        "steps": [
            (1, "Observation", "Valid JSON Web Token (JWT) authorization string identified."),
            (2, "Potential Abuse", "Allows temporary account takeover and unauthorized API spoofing until token expiry."),
            (3, "Remediation", "Invalidate active user sessions, shorten JWT expiration TTL, and redact authorization headers."),
        ],
    },
    "COMBINED_IDENTITY_RISK": {
        "title": "Synthetic Identity Theft & KYC Spoofing Chain",
        "steps": [
            (1, "Observation", "Multiple official identity documents (Aadhaar and PAN) detected together in the same file."),
            (2, "Potential Abuse", "Co-exposure provides the complete credential bundle required for synthetic KYC identity spoofing, fraudulent SIM issuance, and bank loans."),
            (3, "Remediation", "Do not share unredacted version online; apply SafeShare masking to both document numbers prior to distribution."),
        ],
    },
    "AADHAAR_EXPOSURE": {
        "title": "Aadhaar Identity Privacy Chain",
        "steps": [
            (1, "Observation", "12-digit Indian Aadhaar number detected."),
            (2, "Potential Abuse", "Exposed Aadhaar numbers facilitate demographic profiling, social engineering, and unauthorized verification attempts."),
            (3, "Remediation", "Use UIDAI Masked Aadhaar format (XXXX-XXXX-1234) and lock biometric authentication via the mAadhaar app."),
        ],
    },
    "PAN_EXPOSURE": {
        "title": "Financial Identity Tracking Chain",
        "steps": [
            (1, "Observation", "Permanent Account Number (PAN) detected."),
            (2, "Potential Abuse", "PAN numbers can be misused to access tax history, run unauthorized credit checks, and impersonate individuals."),
            (3, "Remediation", "Redact central characters of the PAN number before sending the document."),
        ],
    },
    "CREDIT_CARD_EXPOSURE": {
        "title": "Payment Card Fraud Chain",
        "steps": [
            (1, "Observation", "Payment card number identified in artifact."),
            (2, "Potential Abuse", "Facilitates card-not-present transactions, online purchase fraud, and automated card testing."),
            (3, "Remediation", "Freeze or hotlist the card immediately via your bank application and request a re-issued number."),
        ],
    },
    "UPI_FINANCIAL_EXPOSURE": {
        "title": "Payment Phishing & Reconnaissance Chain",
        "steps": [
            (1, "Observation", "Personal UPI Virtual Payment Address (VPA) detected."),
            (2, "Potential Abuse", "Attackers can identify linked banking institutions and send deceptive payment collect requests."),
            (3, "Remediation", "Mask the UPI handle in public screenshots and verify incoming transactions carefully."),
        ],
    },
    "INTERNAL_WORKPLACE_EXPOSURE": {
        "title": "Internal Infrastructure Reconnaissance Chain",
        "steps": [
            (1, "Observation", "Internal corporate URLs, Jira tickets, or private network IPs detected."),
            (2, "Potential Abuse", "Reveals internal network topography, VPN domains, and staging infrastructure to potential attackers."),
            (3, "Remediation", "Redact private IP ranges (10.x, 192.168.x) and corporate hostnames before sharing."),
        ],
    },
    "PHONE_EXPOSURE": {
        "title": "SMS Phishing & SIM Hijack Chain",
        "steps": [
            (1, "Observation", "Personal telephone number detected."),
            (2, "Potential Abuse", "Enables SMS phishing (smishing), telephone harassment, and SIM swapping attempts."),
            (3, "Remediation", "Mask central digits of phone numbers before distributing contact details publicly."),
        ],
    },
    "EMAIL_EXPOSURE": {
        "title": "Credential Stuffing & Spam Targeting Chain",
        "steps": [
            (1, "Observation", "Personal email address detected."),
            (2, "Potential Abuse", "Email addresses are harvested by automated scrapers for credential stuffing lists and spear-phishing campaigns."),
            (3, "Remediation", "Use email alias relays or redact personal addresses before public sharing."),
        ],
    },
}


DEFAULT_CHAIN = {
    "title": "Sensitive Information Exposure Chain",
    "steps": [
        (1, "Observation", "Sensitive organizational or personal information identified."),
        (2, "Potential Abuse", "Unchecked sharing online increases accidental leakage, profiling, and social engineering risks."),
        (3, "Remediation", "Apply SafeShare redaction to obscure sensitive fields before distribution."),
    ],
}


def build_exposure_chain(finding_type: str) -> ExposureChain:
    """Constructs a deterministic 3-step 'What Happens If You Share This?' exposure chain."""
    playbook = EXPOSURE_CHAIN_PLAYBOOKS.get(finding_type, DEFAULT_CHAIN)
    steps = [
        ChainStep(step_number=num, stage=stage, description=desc)
        for num, stage, desc in playbook["steps"]
    ]
    return ExposureChain(
        finding_type=finding_type,
        title=playbook["title"],
        steps=steps,
    )
