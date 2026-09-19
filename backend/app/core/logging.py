import json
import logging
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict


# Patterns to redact if accidentally logged
SENSITIVE_PATTERNS = [
    re.compile(r"(password|secret|token|api[_-]?key|auth|authorization)=([^&\s]+)", re.IGNORECASE),
    re.compile(r"(bearer\s+)[A-Za-z0-9\-._~+/]+=*", re.IGNORECASE),
]


class SensitiveDataFilter(logging.Filter):
    """Filter that strips/redacts sensitive values from log messages."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = self.redact(record.msg)
        if isinstance(record.args, tuple):
            record.args = tuple(
                self.redact(str(arg)) if isinstance(arg, str) else arg
                for arg in record.args
            )
        elif isinstance(record.args, dict):
            record.args = {
                k: self.redact(str(v)) if isinstance(v, str) else v
                for k, v in record.args.items()
            }
        return True

    @staticmethod
    def redact(text: str) -> str:
        for pattern in SENSITIVE_PATTERNS:
            text = pattern.sub(r"\1=[REDACTED]", text)
        return text


class JSONFormatter(logging.Formatter):
    """Structured JSON formatter complying with PersonaShield logging policy."""

    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": "personashield-backend",
            "name": record.name,
            "message": record.getMessage(),
        }

        # Extra operational fields allowed by RULES.md
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "endpoint"):
            log_data["endpoint"] = record.endpoint
        if hasattr(record, "status_code"):
            log_data["status_code"] = record.status_code
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms

        if record.exc_info and not record.exc_text:
            record.exc_text = self.formatException(record.exc_info)
        if record.exc_text:
            log_data["exception"] = record.exc_text

        return json.dumps(log_data)


def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """Configures structured root logging with security redaction filter."""
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level.upper())

    # Remove existing handlers to avoid duplicates
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    handler.addFilter(SensitiveDataFilter())
    root_logger.addHandler(handler)

    # Silence verbose third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    return logging.getLogger("personashield")


logger = logging.getLogger("personashield")
