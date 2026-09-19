# PersonaShield AI — Repository Constitution

> Internal engineering constitution for the PersonaShield AI repository.
>
> This document defines the project's mission, architecture, engineering workflow, contributor responsibilities, AI engineering standards, and repository conventions. Every contributor must understand and follow this document before making changes.

---

# Project Mission

PersonaShield AI is a preventive cybersecurity platform that identifies accidental exposure of sensitive digital information before it is shared.

The platform analyzes screenshots, documents, PDFs, resumes, payment receipts, chat screenshots, and other digital artifacts to detect security risks, explain their cybersecurity impact, and generate safe-to-share versions without exposing sensitive information.

The repository is built around four core values:

- Prevention before exposure.
- Privacy by design.
- Evidence-based cybersecurity.
- Production-quality engineering.

---

# Engineering Principles

The following principles are mandatory throughout the repository.

## Core Principles

1. Build production-quality software.
2. Security is a first-class requirement.
3. Privacy takes priority over convenience.
4. Prefer deterministic implementations whenever possible.
5. Keep implementations simple, explicit, and maintainable.
6. Preserve existing behavior unless a task intentionally changes it.
7. Never modify unrelated modules.
8. Every feature must be testable.
9. Every security finding must be explainable.
10. Every change must be reversible.

## Repository Philosophy

- Build defensive cybersecurity software only.
- Prefer explicit logic over hidden behavior.
- Prefer auditable code over clever code.
- Optimize for correctness before optimization.

---

# Project Scope

## Primary Objectives

PersonaShield AI exists to:

- Detect sensitive information exposure.
- Prevent accidental information leakage.
- Generate secure redacted outputs.
- Explain cybersecurity risks with supporting evidence.
- Protect users before digital information is shared.

## Non-Goals

This repository must never implement:

- Malware.
- Spyware.
- Credential stealing.
- Ransomware.
- Offensive exploitation.
- Unauthorized access tooling.
- Persistence mechanisms.
- Surveillance capabilities.

PersonaShield is strictly defensive cybersecurity software.

---

# Frozen Technology Stack

Core technologies are part of repository architecture.

## Backend

- FastAPI
- Python 3.11+
- SQLAlchemy 2.x
- PostgreSQL 17
- pgvector
- Alembic
- Pydantic Settings

## AI Stack

- Ollama
- EasyOCR
- spaCy
- Microsoft Presidio
- OpenCV
- Pillow
- Nomic Embeddings

## Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui

## Infrastructure

- Docker
- Docker Compose
- Railway
- Vercel

Core technologies are frozen unless architecture changes are explicitly approved.

---

# Architecture Constitution

Repository architecture follows a strict layered design.

```
Frontend
    ↓
API Layer
    ↓
Schemas
    ↓
Services
    ↓
AI Engine
    ↓
Database
```

Responsibilities must never cross architectural boundaries.

## API Layer

Responsible only for:

- Request validation.
- Response serialization.
- Authentication dependencies.
- Dependency injection.
- HTTP status handling.

Forbidden:

- Business logic.
- AI orchestration.
- Database workflows.

## Schemas

Responsible for:

- Request models.
- Response models.
- Validation models.
- Serialization models.

Forbidden:

- Business logic.
- Database queries.
- AI processing.

## Services

Responsible for:

- Business workflows.
- Scan orchestration.
- Report generation.
- Database orchestration.
- File lifecycle management.

Services coordinate the application.

## AI Engine

Responsible for:

- OCR.
- Entity extraction.
- Exposure detection.
- Embeddings.
- Retrieval.
- Risk reasoning.
- Safe redaction support.

The AI engine never communicates directly with HTTP routes.

## Database Layer

Responsible only for persistence.

Models contain:

- Fields.
- Relationships.
- Constraints.

Models never contain business or AI logic.

---

# AI Engineering Constitution

AI is a supporting engine, not the primary decision maker.

## AI Is Used For

- OCR extraction.
- Entity recognition.
- Semantic retrieval.
- Exposure classification.
- Cybersecurity reasoning.
- Recommendation generation.

## AI Is Never Used For

- Authentication.
- Authorization.
- CRUD operations.
- Validation.
- Filtering.
- Sorting.
- Date parsing.
- Permission logic.
- Database retrieval.

Use deterministic Python logic whenever possible.

## AI Pipeline

Every AI workflow follows:

```
Input
→ Validation
→ OCR
→ Entity Extraction
→ Detection
→ Retrieval
→ Risk Reasoning
→ Report Generation
```

Reasoning always operates on validated evidence.

---

# Evidence-Based Intelligence

Cybersecurity findings must always be supported by extracted evidence.

Every finding must contain:

- Detection category.
- Severity.
- Confidence.
- Supporting evidence.
- Explanation.
- Recommendation.

Evidence is mandatory.

No evidence means no finding.

---

# Repository Organization

Maintain a consistent repository structure.

```
backend/
frontend/
docs/
tests/
docker/
scripts/
```

Each directory has a single responsibility.

## Backend Organization

```
api/
schemas/
services/
agents/
detection/
ocr/
redaction/
models/
utils/
core/
```

Responsibilities must remain isolated.

## Frontend Organization

```
pages/
components/
hooks/
services/
types/
utils/
assets/
```

UI components remain reusable.

---

# Development Workflow

Every implementation follows the same lifecycle.

```
Analyze
→ Design
→ Test Plan
→ RED
→ GREEN
→ REFACTOR
→ Security Review
→ Validation
→ Documentation
```

No feature skips security review.

## Analyze

Before writing code:

- Read affected files.
- Understand architecture.
- Identify dependencies.
- Preserve existing conventions.

## Design

Create implementation plan before coding.

## RED

Write failing tests.

## GREEN

Implement the minimum correct behavior.

## REFACTOR

Improve implementation without changing behavior.

---

# Contributor Workflow

Before modifying code:

1. Read this document.
2. Inspect existing implementation.
3. Identify affected modules.
4. Reuse existing utilities where appropriate.
5. Keep changes isolated.
6. Run relevant validations.
7. Review security impact.
8. Update documentation if behavior changes.

Never modify unrelated modules.

---

# Change Management Rules

Every task should produce focused changes.

## Allowed Changes

- Feature implementation.
- Bug fixes.
- Refactoring.
- Documentation.
- Tests.
- Infrastructure updates.

## Forbidden Changes

- Repository-wide rewrites.
- Unrelated formatting.
- Unapproved dependency replacement.
- Silent API contract changes.
- Silent database schema changes.

---

# Testing Philosophy

Testing is part of implementation.

Every feature requires appropriate tests.

## Required Test Types

- Unit tests.
- API tests.
- Integration tests.
- Edge-case tests.

Implementation without validation is incomplete.

---

# Validation Workflow

Never mark work complete without validation.

Validation may include:

- Application startup.
- API tests.
- Database connectivity.
- Docker health.
- Alembic migration.
- Type checking.
- Linting.
- Integration tests.

Always report validation status.

---

# API Design Principles

Every endpoint must define:

- Request schema.
- Response schema.
- Error schema.

API versioning is mandatory.

```
/api/v1/...
```

Never expose ORM models directly.

Always serialize responses.

---

# Database Principles

Database design is production-first.

## Rules

- UUID primary keys.
- UTC timestamps.
- Alembic migrations only.
- SQLAlchemy ORM only.
- Foreign keys must be explicit.
- Constraints must be deterministic.

Never manually modify production schema.

---

# Dependency Management

Dependencies require justification.

Before introducing a dependency:

- Verify necessity.
- Verify maintenance status.
- Verify license compatibility.
- Prefer existing repository utilities.

Avoid unnecessary libraries.

---

# Git Workflow

Protected workflow:

```
main
  ↓
dev
  ↓
feature branch
  ↓
Pull Request
  ↓
dev
  ↓
main
```

Never develop directly on `main`.

## Branch Naming

Use consistent prefixes.

```
feat/
fix/
refactor/
docs/
test/
chore/
hotfix/
ci/
```

One branch represents one logical task.

## Commit Convention

Use conventional commits.

```
feat:
fix:
refactor:
docs:
test:
chore:
ci:
```

Commits should remain atomic and descriptive.

---

# Code Quality Standards

Code must be readable and predictable.

## Rules

- Prefer explicit names.
- Keep functions focused.
- Avoid duplicated logic.
- Reuse utilities.
- Remove dead code.
- Keep modules cohesive.

Readable code is preferred over clever code.

---

# Documentation Standards

Documentation changes accompany behavior changes.

Update documentation whenever:

- API changes.
- Architecture changes.
- Configuration changes.
- Security behavior changes.
- Detection behavior changes.

Documentation should explain intent, not implementation history.

---

# Definition of Done

A task is complete only if all conditions are satisfied.

## Engineering Checklist

- Implementation completed.
- Tests pass.
- Validation passes.
- Security review completed.
- Documentation updated when applicable.
- Database migrations created when required.
- No linting errors remain.
- No type errors remain.
- Ready for merge into `dev`.

If any requirement is missing, the task is not complete.

---

# Golden Rules

These rules apply everywhere in the repository.

- Read existing code before writing new code.
- Preserve architecture consistency.
- Keep changes isolated and reversible.
- Prefer deterministic implementations over unnecessary AI.
- Prefer explicit logic over implicit behavior.
- Never fabricate cybersecurity findings.
- Never expose sensitive information through code, logs, APIs, or generated outputs.
- Protect user privacy at every layer of the application.
- Build security features that are explainable, testable, and auditable.