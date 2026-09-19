"""Domain exceptions for PersonaShield AI."""
from typing import Optional
from fastapi import status


class PersonaShieldError(Exception):
    """Base exception for all PersonaShield domain errors."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class SecurityValidationError(PersonaShieldError):
    """Raised when an incoming file or parameter violates defensive security rules."""

    def __init__(
        self,
        message: str,
        code: str = "SECURITY_VALIDATION_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ):
        super().__init__(message=message, code=code, status_code=status_code)


class DangerousFilenameError(SecurityValidationError):
    """Raised when an uploaded filename contains path traversal, double extensions, or hidden patterns."""

    def __init__(self, message: str):
        super().__init__(message=message, code="DANGEROUS_FILENAME")


class UnsupportedMimeError(SecurityValidationError):
    """Raised when an uploaded file MIME type is unsupported."""

    def __init__(self, message: str):
        super().__init__(message=message, code="UNSUPPORTED_MIME_TYPE")


class CorruptedFileSignatureError(SecurityValidationError):
    """Raised when file magic bytes do not match the declared extension."""

    def __init__(self, message: str):
        super().__init__(message=message, code="SIGNATURE_MISMATCH")


class UploadTooLargeError(SecurityValidationError):
    """Raised when file size exceeds the allowed threshold."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            code="UPLOAD_TOO_LARGE",
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        )


class ResourceNotFoundError(PersonaShieldError):
    """Raised when an entity (such as a ScanSession) is not found."""

    def __init__(self, message: str, code: str = "RESOURCE_NOT_FOUND"):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_404_NOT_FOUND,
        )


class DatabaseOperationError(PersonaShieldError):
    """Raised when a database persistence or transaction fails."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            code="DATABASE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
