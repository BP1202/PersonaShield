from typing import List


def explain_finding_confidence(
    finding_type: str,
    confidence: float,
    has_bbox: bool = True,
    is_compound: bool = False,
) -> List[str]:
    """
    Constructs explainable AI transparency reasons justifying the finding's confidence rating.
    """
    reasons: List[str] = []

    # 1. Format/Detection confirmation
    if "AWS" in finding_type:
        reasons.append("Matched standard AWS 20-character IAM Access Key structure (AKIA prefix).")
    elif "OPENAI" in finding_type:
        reasons.append("Matched authentic OpenAI secret key syntax (sk- prefix).")
    elif "GITHUB" in finding_type:
        reasons.append("Matched GitHub personal access token signature.")
    elif "SLACK" in finding_type:
        reasons.append("Matched Slack bot/workspace OAuth token structure (xoxb prefix).")
    elif "DATABASE" in finding_type:
        reasons.append("Identified structured database URI with embedded authentication credentials.")
    elif "JWT" in finding_type:
        reasons.append("Validated tripartite Base64URL-encoded JWT token structure.")
    elif "AADHAAR" in finding_type:
        reasons.append("Validated 12-digit Indian Aadhaar format.")
    elif "PAN" in finding_type:
        reasons.append("Validated official 10-character Indian PAN card format (5 letters, 4 digits, 1 letter).")
    elif "CREDIT_CARD" in finding_type:
        reasons.append("Matched valid payment card number pattern.")
    elif "UPI" in finding_type:
        reasons.append("Matched registered Indian UPI banking provider VPA handle.")
    elif "WORKPLACE" in finding_type:
        reasons.append("Identified internal private network IP range or corporate hostname.")
    elif "PHONE" in finding_type:
        reasons.append("Matched standard E.164 / national telephone number syntax.")
    elif "EMAIL" in finding_type:
        reasons.append("Matched valid RFC 5322 email address format.")
    else:
        reasons.append("Matched deterministic cybersecurity pattern.")

    # 2. OCR / Extraction Confidence
    if confidence >= 0.95:
        reasons.append(f"High-confidence optical character recognition score ({confidence:.2f}).")
    elif confidence >= 0.85:
        reasons.append(f"Reliable OCR text recognition confidence ({confidence:.2f}).")
    else:
        reasons.append(f"OCR text recognized with baseline confidence ({confidence:.2f}).")

    # 3. Spatial evidence confirmation
    if has_bbox:
        reasons.append("Spatial bounding box coordinates verified and mapped on document canvas.")

    # 4. Compound risk correlation
    if is_compound or "COMBINED" in finding_type:
        reasons.append("Cross-entity correlation confirms concurrent exposure of complementary identity documents.")

    return reasons
