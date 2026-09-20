from typing import Any, Dict, List


RECOMMENDATION_CATALOG: Dict[str, Dict[str, Any]] = {
    # 1. Credentials
    "OPENAI_API_KEY_EXPOSURE": {
        "title": "Immediately rotate exposed OpenAI API key",
        "priority": "Immediate",
        "impact_summary": "Unrestricted API access allows unauthorized model usage, quota exhaustion, and billing fraud.",
        "action_steps": [
            "Log into the OpenAI platform and immediately revoke this secret key.",
            "Generate a new API key with least-privilege project permissions.",
            "Move keys into server-side environment variables or secret vaults (e.g. AWS Secrets Manager).",
            "Audit recent API usage logs in OpenAI dashboard for anomalous activity.",
        ],
    },
    "ANTHROPIC_API_KEY_EXPOSURE": {
        "title": "Revoke and reissue Anthropic Claude API key",
        "priority": "Immediate",
        "impact_summary": "Exposed key allows external parties to impersonate your account and incur model costs.",
        "action_steps": [
            "Revoke the compromised key from Anthropic Console > API Keys.",
            "Replace hardcoded secrets with environment configurations.",
            "Check account logs for unauthorized token consumption.",
        ],
    },
    "AWS_ACCESS_KEY_EXPOSURE": {
        "title": "Deactivate IAM credentials and review AWS CloudTrail",
        "priority": "Immediate",
        "impact_summary": "Active AWS credentials grant attackers direct infrastructure control, data exfiltration, or crypto-mining.",
        "action_steps": [
            "In AWS IAM console, change the access key status to 'Inactive' then 'Delete'.",
            "Review AWS CloudTrail event history for unauthorized API calls over the last 48 hours.",
            "Enforce IAM Roles and AWS STS temporary credentials instead of long-lived access keys.",
        ],
    },
    "GITHUB_TOKEN_EXPOSURE": {
        "title": "Revoke GitHub Personal Access Token immediately",
        "priority": "Immediate",
        "impact_summary": "Compromised PAT grants access to source code repositories, workflow actions, and deployment secrets.",
        "action_steps": [
            "Navigate to GitHub Settings > Developer Settings > Personal Access Tokens and delete the token.",
            "Check repository audit logs for unauthorized clones or commits.",
            "Switch to fine-grained PATs with restricted repository and expiration scopes.",
        ],
    },
    "SLACK_TOKEN_EXPOSURE": {
        "title": "Revoke Slack API / Bot token",
        "priority": "Immediate",
        "impact_summary": "Slack bot tokens allow reading internal conversations, file history, and user directories.",
        "action_steps": [
            "Access Slack App Management and rotate the bot OAuth token.",
            "Review Slack access logs for anomalous workspace queries.",
        ],
    },
    "STRIPE_KEY_EXPOSURE": {
        "title": "Revoke Stripe secret / restricted key",
        "priority": "Immediate",
        "impact_summary": "Stripe secret keys allow access to customer payment methods, charges, and payouts.",
        "action_steps": [
            "Go to Stripe Dashboard > Developers > API keys and revoke the secret key.",
            "Create a restricted key with minimal required permissions.",
            "Check recent payment intents and refund activity.",
        ],
    },
    "DATABASE_CONNECTION_STRING_EXPOSURE": {
        "title": "Rotate database password and verify firewall ingress",
        "priority": "Immediate",
        "impact_summary": "Exposed connection URI exposes database server location and plaintext administrative credentials.",
        "action_steps": [
            "Immediately alter the database user password in your PostgreSQL/MySQL cluster.",
            "Ensure the database port (e.g. 5432, 3306) is not accessible from 0.0.0.0/0 public internet.",
            "Utilize connection pooling and IAM-based database authentication.",
        ],
    },
    "JWT_TOKEN_EXPOSURE": {
        "title": "Invalidate active session / rotate signing secret",
        "priority": "High",
        "impact_summary": "Valid JWT tokens allow account takeover and API spoofing until token expiry.",
        "action_steps": [
            "Invalidate active refresh tokens and sessions for this user.",
            "If token does not have an expiry claim, immediately rotate server JWT signing secret.",
            "Shorten access token TTL to under 15 minutes.",
        ],
    },

    # 2. Identity
    "COMBINED_IDENTITY_RISK": {
        "title": "Severe Identity Theft & KYC Spoofing Exposure",
        "priority": "Immediate",
        "impact_summary": "Co-exposure of Aadhaar and PAN provides full credentials for synthetic identity creation and bank account fraud.",
        "action_steps": [
            "Do not share this screenshot or document on public channels or unencrypted chats.",
            "Apply redaction blur to both Aadhaar and PAN numbers prior to transmission.",
            "Lock Aadhaar biometrics via UIDAI portal (m-Aadhaar app) for protection.",
        ],
    },
    "AADHAAR_EXPOSURE": {
        "title": "Mask Aadhaar number before sharing",
        "priority": "High",
        "impact_summary": "Exposed 12-digit Aadhaar enables privacy invasion, demographic profiling, and SIM swap attempts.",
        "action_steps": [
            "Mask the first 8 digits using UIDAI Masked Aadhaar format (XXXX-XXXX-1234).",
            "Lock biometric authentication on the UIDAI portal.",
        ],
    },
    "PAN_EXPOSURE": {
        "title": "Redact Permanent Account Number (PAN)",
        "priority": "Medium",
        "impact_summary": "PAN card numbers can be misused for credit profiling and fraudulent tax queries.",
        "action_steps": [
            "Black out or blur the PAN string before sending the document.",
            "Monitor CIBIL / Experian credit reports for unauthorized credit checks.",
        ],
    },
    "PASSPORT_EXPOSURE": {
        "title": "Redact Passport number and travel details",
        "priority": "High",
        "impact_summary": "Passport data facilitates international travel spoofing and targeted social engineering.",
        "action_steps": [
            "Redact passport number and machine-readable zone (MRZ) before transmission.",
        ],
    },

    # 3. Financial
    "UPI_FINANCIAL_EXPOSURE": {
        "title": "Review UPI handle visibility",
        "priority": "Low",
        "impact_summary": "Public UPI handles expose personal names, linked bank providers, and enable payment phishing spam.",
        "action_steps": [
            "Mask UPI VPA if this receipt or screenshot is being shared publicly.",
            "Verify all incoming payment requests in your UPI app before entering UPI PIN.",
        ],
    },
    "CREDIT_CARD_EXPOSURE": {
        "title": "Block and replace payment card immediately",
        "priority": "Immediate",
        "impact_summary": "Exposed card number enables unauthorized online transactions and card-not-present fraud.",
        "action_steps": [
            "Immediately freeze or hotlist the credit/debit card via banking app.",
            "Request a re-issued card with new CVV and expiration date.",
            "Review transaction statements for unauthorized charges.",
        ],
    },

    # 4. Workplace & Infrastructure
    "INTERNAL_WORKPLACE_EXPOSURE": {
        "title": "Redact internal workspace URLs and private IPs",
        "priority": "Medium",
        "impact_summary": "Internal company URLs, Jira tickets, and private CIDR ranges reveal internal network topography to adversaries.",
        "action_steps": [
            "Blur private IPs (10.x, 192.168.x) and internal domain names.",
            "Revoke open Slack / Discord invite links that may allow unauthorized company channel joins.",
        ],
    },

    # 5. Privacy
    "PHONE_EXPOSURE": {
        "title": "Mask personal telephone number",
        "priority": "Low",
        "impact_summary": "Exposed phone numbers lead to SMS phishing (smishing), spam callers, and SIM hijacking.",
        "action_steps": [
            "Mask the central digits of phone numbers in public documents.",
        ],
    },
    "EMAIL_EXPOSURE": {
        "title": "Consider masking personal email",
        "priority": "Low",
        "impact_summary": "Visible email addresses are harvested by web scrapers for credential stuffing and spam campaigns.",
        "action_steps": [
            "Use email alias / relay services when sharing contact information.",
        ],
    },
}


DEFAULT_RECOMMENDATION: Dict[str, Any] = {
    "title": "Redact sensitive data before sharing",
    "priority": "Medium",
    "impact_summary": "This artifact contains sensitive personal or organizational data.",
    "action_steps": [
        "Use safe redaction to blur or black-out this information prior to public distribution.",
    ],
}


def get_recommendation(finding_type: str) -> Dict[str, Any]:
    """Retrieves deterministic cybersecurity remediation playbook for an exposure type."""
    return RECOMMENDATION_CATALOG.get(finding_type, DEFAULT_RECOMMENDATION)
