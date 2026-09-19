# PersonaShield AI — Security & Engineering Rules

> Security, privacy, validation, and engineering policies for the PersonaShield AI repository.
>
> These rules define how sensitive information is processed, how cybersecurity detections are validated, how data is protected, and how the platform maintains production-grade security standards.

---

# Security First Policy

Security is a mandatory requirement for every feature, API, service, model, workflow, and deployment.

Every implementation must:

- Protect user privacy.
- Prevent accidental information exposure.
- Minimize attack surface.
- Preserve data integrity.
- Produce explainable cybersecurity results.

Security reviews are mandatory before considering work complete.

---

# Privacy by Design

PersonaShield is built around privacy-first processing.

## Core Principles

- Uploaded files are processed only for the active scan session.
- Sensitive information is never retained longer than necessary.
- The application minimizes stored personal information.
- AI processing should remain local whenever architecture allows.
- Generated reports expose only information required for the user.

## Privacy Requirements

Always:

- Delete temporary processing files.
- Strip metadata from exported files.
- Mask sensitive values in reports where appropriate.
- Avoid unnecessary persistence.

Never:

- Store uploaded files permanently.
- Send uploaded content to third-party AI services.
- Log extracted personal information.
- Cache sensitive document contents.

---

# Zero Hallucination Policy

Cybersecurity findings must be based only on extracted evidence.

## Mandatory Rules

Every finding must include:

- Detection category.
- Supporting evidence.
- Confidence score.
- Severity.
- Recommendation.

Never fabricate:

- Identity information.
- Credentials.
- Secrets.
- Tokens.
- Payment identifiers.
- QR payloads.
- Attack evidence.

Unknown information remains unknown.

Low-confidence findings must be labeled **Needs Review**.

---

# Evidence Validation Policy

A cybersecurity finding is valid only when evidence exists.

## Required Evidence

Examples include:

- OCR extracted text.
- Bounding coordinates.
- Regex validation.
- Entity recognition result.
- Metadata extraction.
- Deterministic parser output.

A report without supporting evidence is invalid.

---

# Supported Cybersecurity Risk Categories

PersonaShield supports defensive exposure detection.

## Identity Exposure

Examples include:

- Aadhaar
- PAN
- Passport
- Driving License
- Voter ID
- Employee IDs
- Student IDs

## Credential Exposure

Examples include:

- API Keys
- JWT Tokens
- OAuth Tokens
- SSH Keys
- GitHub Tokens
- AWS Keys
- Database Credentials
- Connection Strings

## Financial Exposure

Examples include:

- UPI IDs
- IFSC Codes
- Bank Account Numbers
- Credit Card Numbers
- Debit Card Numbers
- Payment Receipts

## Workplace Exposure

Examples include:

- Slack screenshots.
- Internal URLs.
- Jira tickets.
- Meeting links.
- Internal email addresses.
- Infrastructure screenshots.

## Privacy Exposure

Examples include:

- Phone numbers.
- Email addresses.
- Addresses.
- GPS coordinates.
- QR codes.
- Barcodes.

---

# Severity Classification Rules

Severity must always be deterministic.

| Severity | Meaning |
|----------|---------|
| Critical | Immediate credential or identity exposure with significant security impact. |
| High | Sensitive personal or organizational information that could enable attacks. |
| Medium | Information that increases attack surface or privacy risk. |
| Low | Minor privacy exposure requiring user review. |
| Needs Review | Detection confidence is insufficient for automatic classification. |

Severity must include a reason.

---

# Confidence Classification Rules

Confidence reflects detection certainty.

| Confidence | Meaning |
|------------|---------|
| High | Deterministic validation confirms the finding. |
| Medium | Multiple signals indicate the finding. |
| Low | Evidence exists but requires review. |

Confidence never replaces severity.

---

# Sensitive Data Handling Policy

Sensitive information is protected throughout processing.

## Protected Information

Includes but is not limited to:

- Passwords
- API Keys
- JWT Tokens
- OAuth Tokens
- SSH Keys
- Aadhaar Numbers
- PAN Numbers
- Passport Numbers
- Phone Numbers
- Email Addresses
- Bank Accounts
- Credit Cards
- UPI IDs
- QR Payloads
- GPS Coordinates

## Rules

Never expose protected information through:

- Logs.
- Error messages.
- API responses.
- Analytics.
- Debug output.
- Screenshots inside documentation.

Mask values whenever displayed.

---

# File Upload Security Policy

Every uploaded file is treated as untrusted input.

## Validation Requirements

- MIME whitelist.
- Extension whitelist.
- Maximum file size.
- UUID storage filename.
- Reject executable formats.
- Reject hidden files.
- Reject double extensions.
- Reject path traversal attempts.
- Reject corrupted files.
- Reject unsupported MIME types.

Processing begins only after successful validation.

## Allowed Upload Types

Only explicitly supported formats may enter processing.

Examples include:

- PNG
- JPG
- JPEG
- PDF
- WEBP

All additional formats require validation rules.

---

# Temporary File Lifecycle

Temporary files exist only during processing.

Lifecycle:

1. Create secure temporary file.
2. Process file.
3. Generate output.
4. Delete temporary artifacts.
5. Delete failed artifacts.
6. Delete timed-out artifacts.

Temporary directories must never become permanent storage.

---

# SafeShare Integrity Rules

SafeShare produces sanitized versions of uploaded artifacts.

## Requirements

- Preserve readability.
- Preserve layout whenever possible.
- Remove sensitive regions only.
- Strip metadata.
- Never modify unrelated content.

Generated output must be reproducible.

---

# Metadata Protection Policy

Metadata may expose sensitive information.

Remove metadata including:

- GPS location.
- Camera identifiers.
- Device information.
- Software identifiers.
- Author information.
- Embedded timestamps where unnecessary.

Metadata removal is part of SafeShare generation.

---

# Secrets Management Policy

Repository secrets are protected assets.

## Repository Rules

Never commit:

- `.env`
- Secrets
- Tokens
- Credentials
- Certificates
- Private Keys

## Configuration Rules

Configuration belongs only in environment variables.

Whenever configuration changes:

- Update `.env.example`.
- Update documentation when required.

Never expose secrets inside repository examples.

---

# Logging Policy

Logs are operational records only.

## Allowed Log Fields

- Timestamp
- Request ID
- Endpoint
- Status Code
- Processing Duration
- Service Name

## Forbidden Log Fields

- OCR Text
- Uploaded File Contents
- Identity Numbers
- Tokens
- Passwords
- Secrets
- Financial Information
- Email Addresses
- Phone Numbers

Logs must redact sensitive values before writing.

---

# Error Handling Policy

Errors must never expose sensitive information.

## Error Responses

Return:

- Safe message.
- Error code.
- Request identifier.

Do not expose:

- Stack traces.
- Secrets.
- File contents.
- Database queries.
- Internal paths.

Detailed errors remain internal only.

---

# Input Validation Rules

Every external input must be validated.

## Validation Includes

- Type validation.
- Length validation.
- Format validation.
- Required fields.
- Range validation.
- Enum validation.
- File validation.

Reject malformed input immediately.

---

# OCR Security Rules

OCR output is untrusted until validated.

Rules:

- Normalize extracted text.
- Remove unsupported control characters.
- Validate Unicode safely.
- Preserve extraction confidence.
- Never assume OCR correctness.

Detection operates on normalized OCR output.

---

# Detection Quality Standards

Every detector follows deterministic validation.

## Required Components

- Detection logic.
- Validation logic.
- Confidence logic.
- Evidence extraction.
- Severity mapping.
- Recommendation mapping.

Detectors must remain modular.

---

# Identity Detection Rules

Identity detectors validate supported formats before reporting exposure.

Never classify arbitrary numeric strings as identity documents.

Validation must occur before severity assignment.

---

# Credential Detection Rules

Credential detectors require structural validation.

Examples include:

- JWT structure.
- API key prefixes.
- OAuth token format.
- Connection string parsing.
- Secret entropy validation where applicable.

Never report random strings as credentials.

---

# Financial Detection Rules

Financial identifiers require format validation.

Examples include:

- UPI format.
- IFSC format.
- Card number checksum where appropriate.
- Account number validation rules.

Never guess financial identifiers.

---

# QR Detection Rules

QR processing is defensive only.

Allowed:

- Detect QR existence.
- Decode payload.
- Classify payload type.
- Warn about sensitive payloads.

Forbidden:

- Trigger payment requests.
- Open links automatically.
- Execute payload content.

QR payloads require user review.

---

# Report Generation Rules

Investigation reports explain cybersecurity risk.

Reports must include:

- Summary.
- Evidence.
- Severity.
- Explanation.
- Defensive recommendation.

Reports must not exaggerate impact.

Avoid speculative language.

---

# Recommendation Policy

Recommendations must be actionable.

Good recommendations:

- Blur sensitive regions.
- Rotate exposed credentials.
- Remove metadata.
- Share sanitized version.
- Replace exposed tokens.

Avoid generic security advice unrelated to findings.

---

# API Security Standards

Every endpoint must:

- Validate request schema.
- Validate response schema.
- Authenticate protected routes.
- Return safe errors.
- Preserve backward compatibility.

Never expose internal models.

---

# Database Security Standards

Database interactions must remain safe.

Rules:

- Parameterized ORM queries only.
- No raw SQL unless explicitly justified.
- Foreign key integrity.
- UUID identifiers.
- UTC timestamps.
- Soft deletion where required.

Never expose database internals through APIs.

---

# Authentication & Authorization Rules

Security-sensitive endpoints require authorization.

Rules:

- Validate identity before protected operations.
- Apply least-privilege principles.
- Never trust client-provided permissions.
- Never expose authorization state through logs.

Authorization logic must remain deterministic.

---

# Testing Standards

Security behavior requires testing.

## Required Tests

### Unit Tests

- Detection logic.
- Validation utilities.
- OCR normalization.
- Risk mapping.

### API Tests

- Success responses.
- Invalid input.
- Unsupported files.
- Size limits.
- Error responses.

### Integration Tests

- Upload pipeline.
- Detection pipeline.
- SafeShare generation.
- Database interactions.

### Security Edge Cases

- Empty files.
- Corrupted PDFs.
- Double extensions.
- Hidden files.
- Invalid QR payloads.
- Unicode edge cases.
- Oversized uploads.
- Duplicate uploads.

Security features without tests are incomplete.

---

# Validation Checklist

Before completing any task verify:

- Application starts.
- API works.
- Database connects.
- Migration succeeds.
- Tests pass.
- Lint passes.
- Type checking passes.
- Security review completed.

Never report successful validation unless executed.

---

# Performance Rules

Security must not compromise reliability.

Rules:

- Stream large files.
- Avoid unnecessary memory copies.
- Delete temporary buffers.
- Limit retrieval size.
- Use asynchronous processing where appropriate.
- Cache deterministic computations only.

Avoid premature optimization.

---

# Protected Files Policy

Protected files require explicit approval before modification.

Includes:

- `.env`
- Production credentials
- Deployment secrets
- Historical migrations
- Generated certificates
- Secret configuration files

Never overwrite protected files automatically.

---

# Dependency Security Rules

Every dependency must be reviewed before introduction.

Verify:

- Maintenance status.
- Security reputation.
- License compatibility.
- Repository necessity.

Avoid unnecessary packages.

---

# Deployment Security Rules

Production deployments must satisfy:

- Environment variables for secrets.
- HTTPS only.
- CORS explicitly configured.
- Debug mode disabled.
- Secure headers enabled.
- Health endpoints contain no sensitive information.

Deployment configuration must never expose secrets.

---

# Security Review Checklist

Every completed feature requires a security review.

Checklist:

- Input validation completed.
- File validation completed.
- Sensitive logging reviewed.
- Secrets reviewed.
- Temporary files cleaned.
- API responses sanitized.
- Error handling sanitized.
- Tests executed.
- Documentation updated where applicable.

A feature is not complete until this checklist passes.

---

# Golden Security Rules

These rules are immutable throughout the repository.

- Treat every upload as untrusted.
- Treat every secret as compromised until protected.
- Never fabricate cybersecurity findings.
- Never expose sensitive information through logs, APIs, or reports.
- Never retain sensitive user files longer than necessary.
- Prefer deterministic validation before AI reasoning.
- Every security finding must be supported by evidence.
- Every recommendation must reduce real cybersecurity risk.
- Protect privacy at every stage of the processing pipeline.
- Build security features that are explainable, testable, and auditable.