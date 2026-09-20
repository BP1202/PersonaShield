# PersonaShield AI — Scan Once. Share Safely.

> **AI-powered preventive cybersecurity that protects sensitive information before you share it.**

PersonaShield AI scans documents, screenshots, and PDFs to detect exposed personal information, financial details, QR codes, and developer secrets. It explains privacy risks in plain English and generates a permanently protected copy that's safe to share.

---

## The Problem

People accidentally share documents containing sensitive information every day.

- Aadhaar or PAN cards shared for KYC.
- Salary slips emailed during job applications.
- Bank details exposed inside invoices.
- API keys leaked in screenshots posted on GitHub or Slack.

Most users don't realize these files can be used for identity fraud, phishing, SIM swapping, or cloud account compromise.

**PersonaShield AI prevents those mistakes before they happen.**

---

## What PersonaShield Does

### AI Privacy Scan
Automatically detects sensitive information inside images and PDFs.

### Cyber Safety Receipt
Explains what was found, why it's risky, and whether the document is safe to share.

### SafeShare Protection Editor
Edit detection regions, add custom protection areas, and choose Blur, Pixelate, or Blackout.

### Cyber Guardian
Shows how attackers could misuse exposed information and provides simple recovery steps.

### Purpose Protection Stamp
Adds a watermark like **ONLY FOR HDFC BANK KYC • 20 SEP 2026** to reduce document reuse fraud.

### SafeShare Export
Downloads a permanently protected PNG or PDF ready for WhatsApp, Email, Slack, or LinkedIn.

---

## Demo Workflow

Upload → AI Scan → Privacy Report → SafeShare Editor → Protected Download

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | FastAPI, Python 3.11, SQLAlchemy, Alembic |
| Database | PostgreSQL 17 |
| AI & Vision | EasyOCR, Microsoft Presidio, spaCy, OpenCV, Pillow |
| Local AI | Ollama |

---

## Project Structure

```text
PersonaShield/
├── frontend/          # React + Vite application
├── backend/           # FastAPI REST API
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd PersonaShield
```

### 2. Configure environment

```bash
cp .env.example .env
```

Update values if needed.

### 3. Start PostgreSQL

```bash
docker compose up -d db
```

### 4. Run Backend

```bash
cd backend

python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

pip install -r requirements.txt

alembic upgrade head

uvicorn app.main:app --reload --port 8000
```

Backend runs at:

```text
http://localhost:8000
```

### 5. Run Frontend

```bash
cd frontend

npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

---

## Environment Variables

Create `.env` from `.env.example`.

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=
POSTGRES_DB=personashield

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=granite3.3:8b
```

---

## Running Tests

### Backend

```bash
cd backend
pytest
```

### Frontend

```bash
cd frontend
npm test
```

---

## Security & Privacy

- Local-first document processing.
- No permanent storage of uploaded documents.
- Sensitive information is permanently redacted in exported files.
- Hidden camera metadata and GPS information are removed from shared copies.
- Designed as a **defensive cybersecurity application** for privacy protection.

---
