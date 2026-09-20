# PersonaShield AI — Security Policy & Posture

> **PersonaShield AI** is a preventive cybersecurity platform designed to identify accidental exposure of sensitive digital information before it is shared.
> This document defines our security principles, threat model, vulnerability disclosure procedures, data handling guarantees, secrets policy, and file validation specifications.

---

## 1. Core Security Principles

PersonaShield operates strictly as defensive cybersecurity software governed by our repository constitution:

- **Prevention Before Exposure**: We protect users at the point of origin before sensitive screenshots, tokens, or PII enter shared channels, public issues, or social media.
- **Privacy by Design**: Security analysis must never compromise user privacy. Processing is strictly scoped to detection and remediation.
- **Evidence-Based Intelligence**: Every finding is backed by deterministic regex, OCR token coordinates, and verified syntax. PersonaShield never fabricates or hallucinates vulnerabilities.
- **SafeShare over Deletion**: Rather than merely alerting on exposure, PersonaShield reconstructs clean, privacy-preserving visual artifacts using irreversible redaction (Gaussian blur, pixelation, blackout) and EXIF metadata stripping.
- **Local & Defensive Only**: PersonaShield is strictly defensive software. We do not build, bundle, or distribute offensive exploitation tools, spyware, or persistence mechanisms.

---

## 2. Threat Model

PersonaShield defends individuals and engineering teams against accidental information leakage vectors:

### What PersonaShield Protects Against

1. **Developer Secret Exposure**:
   - Accidental commits or screenshots of cloud access keys (AWS `AKIA...`, GCP, Azure), API keys (OpenAI `sk-proj...`, Stripe `sk_live...`, Anthropic, Slack `xoxb...`, GitHub tokens `ghp_...`), private keys (`-----BEGIN PRIVATE KEY-----`), and database connection strings with embedded credentials.
2. **National & Government Identity Leakage**:
   - Accidental sharing of Indian national IDs including Aadhaar numbers (12-digit with Verhoeff verification) and Permanent Account Numbers (PAN cards).
3. **Financial & Payment Artifact Leakage**:
   - Payment receipts, invoice snapshots, debit/credit card numbers passing Luhn checksum verification, UPI IDs, bank account numbers, and IFSC routing codes.
4. **Workplace & Internal Infrastructure Exposure**:
   - Internal Kubernetes cluster addresses, staging subdomains, JWT authorization tokens, session cookies, internal emails, and corporate endpoints embedded in desktop screenshots.
5. **Accidental Metadata Leaks**:
   - Geolocation coordinates, device camera serials, timestamps, and owner identifiers preserved in raw image EXIF/TIFF containers.

### Non-Goals (What PersonaShield Does Not Do)

- **No Offensive Exploitation**: We do not validate credentials against live third-party cloud APIs or attempt unauthorized access.
- **No Secret Scraping or Harvester Botnets**: PersonaShield only analyzes digital assets explicitly provided by the user during an active scan session.
- **No Surveillance or Keystroke Logging**: The platform is not an endpoint monitoring agent.

---

## 3. Responsible Disclosure

We take the security of PersonaShield AI and the privacy of its users seriously. If you discover a vulnerability or security flaw in PersonaShield, please disclose it responsibly.

### Disclosure Process

1. **Do not create a public GitHub issue** for undisclosed security vulnerabilities.
2. Submit vulnerability details directly to our security coordination team:
   - **Email**: `security@personashield.ai` (or open a private security advisory on GitHub)
   - **Subject**: `[VULNERABILITY DISCLOSURE] <Short Description>`
3. **Information to Include**:
   - Detailed description of the vulnerability and attack vector.
   - Proof-of-concept (PoC) script, screenshot, or reproducible steps.
   - Affected endpoints, modules, or dependencies.
   - Assessment of potential impact and proposed remediation.
4. **Our Commitment**:
   - **Initial Acknowledgement**: Within 24 hours.
   - **Triage & Remediation Plan**: Within 72 hours.
   - **Fix & Advisory**: We coordinate coordinated disclosure after a patch is merged and released.

---

## 4. Data Handling & Retention Policy

PersonaShield applies strict data isolation and lifecycle controls:

### Storage & Isolation
- **UUID Filename Obfuscation**: All incoming artifacts are immediately renamed with cryptographically random UUID v4 identifiers. Original filenames are sanitized for display and never exposed in filesystem paths.
- **No Internal ID Leakage**: Public REST endpoints return opaque redaction IDs; internal database foreign keys, original upload paths, and server filesystem paths are never leaked in response payloads.
- **Header Hardening**: Download endpoints strictly enforce `Cache-Control: no-store, no-cache, must-revalidate`, `Pragma: no-cache`, and `Expires: 0` to prevent proxy, CDN, or browser caching of sensitive or sanitized documents.

### Artifact Retention Policy (24-Hour TTL)
- **Original Uploads**: Automatically purged from server storage after **24 hours**.
- **OCR Artifacts & Intermediary Files**: Automatically purged after **24 hours**.
- **SafeShare Sanitized Images**: Automatically purged after **24 hours**.
- **Audit Reports & Finding Metadata**: Verifiable cryptographic findings and score receipts are retained in PostgreSQL for compliance proof and auditing unless deleted by the scan owner.

### Complete EXIF & Metadata Stripping
- SafeShare sanitized artifacts undergo **pure pixel reconstruction**: raw RGB pixel arrays are extracted and drawn onto a brand-new PNG canvas (`Image.new("RGB")`), stripping 100% of EXIF, GPS, camera model, thumbnail, and ICC color profile metadata before export.

---

## 5. Secrets Management & Repository Policy

- **Zero Hardcoded Secrets**: No production keys, real tokens, or private credentials are committed to this repository.
- **Automated GitGuardian Scanning**: All branches, commits, and pull requests are monitored via continuous GitGuardian secrets scanning.
- **Synthetic Test Fixtures**: All automated tests utilize synthetic, randomized test tokens (e.g. `sk-proj-TESTING12345...`, dummy AWS IDs) designed to validate pattern logic without exposing active credentials.

---

## 6. Supported File Types & Payload Bounds

To protect infrastructure against denial-of-service and memory exhaustion, incoming requests are strictly bounded:

| Parameter | Policy |
| :--- | :--- |
| **Max Request Body** | **15 MB** (`HTTP 413 Payload Too Large` enforced via middleware) |
| **Supported File Formats** | PNG (`.png`), JPEG (`.jpg`, `.jpeg`), WebP (`.webp`), PDF (`.pdf`) |
| **MIME Type Validation** | Validated against whitelist (`image/png`, `image/jpeg`, `image/webp`, `application/pdf`) |
| **Magic Byte Verification** | File header binary signatures are verified prior to ingestion |
| **Output Image Format** | **PNG only** (lossless, deterministic, zero lossy compression artifacts) |

---

## 7. Security Verification & Auditing

Every release is validated against our automated security test suite:
- Bounding box boundary clipping & IoU overlap merge logic.
- Metadata reconstruction & GPS stripping audits.
- Download ownership authorization and traversal protections.
- Request size limit middleware enforcement.
