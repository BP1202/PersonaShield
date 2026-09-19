import pytest
from backend.app.core.security import (
    FileValidationError,
    generate_secure_storage_filename,
    sanitize_display_filename,
    validate_file_content_signature,
    validate_filename_security,
    validate_mime_type,
)


class TestSecurityValidation:
    """Tests security validation rules defined in RULES.md."""

    def test_valid_extensions(self):
        valid_filenames = [
            "document.pdf",
            "screenshot.png",
            "photo.jpg",
            "receipt.jpeg",
            "avatar.webp",
        ]
        for name in valid_filenames:
            ext = validate_filename_security(name)
            assert ext.startswith(".")
            assert ext in [".pdf", ".png", ".jpg", ".jpeg", ".webp"]

    def test_reject_hidden_files(self):
        hidden_files = [".env", ".secret.png", ".hidden.pdf", ".htaccess.jpg"]
        for name in hidden_files:
            with pytest.raises(FileValidationError, match="Hidden files are not allowed"):
                validate_filename_security(name)

    def test_reject_double_extensions(self):
        double_ext_files = [
            "malware.pdf.exe",
            "image.png.sh",
            "test..png",
            "report.pdf.js",
            "invoice.doc.pdf",
        ]
        for name in double_ext_files:
            with pytest.raises(
                FileValidationError, match="Double extensions or multiple dots are not allowed"
            ):
                validate_filename_security(name)

    def test_reject_path_traversal(self):
        traversal_files = [
            "../../etc/passwd.png",
            "..\\..\\windows\\system32.jpg",
            "subfolder/image.png",
            "dir\\test.pdf",
        ]
        for name in traversal_files:
            with pytest.raises(FileValidationError, match="path traversal detected"):
                validate_filename_security(name)

    def test_reject_executable_extensions(self):
        executables = ["payload.exe", "script.sh", "install.bat", "trojan.dll"]
        for name in executables:
            with pytest.raises(FileValidationError):
                validate_filename_security(name)

    def test_reject_unsupported_extensions(self):
        unsupported = ["archive.zip", "notes.txt", "doc.docx", "data.csv"]
        for name in unsupported:
            with pytest.raises(FileValidationError, match="not supported"):
                validate_filename_security(name)

    def test_validate_mime_type(self):
        assert validate_mime_type("image/png") == "image/png"
        assert validate_mime_type("image/jpeg; charset=utf-8") == "image/jpeg"
        assert validate_mime_type("application/pdf") == "application/pdf"

        with pytest.raises(FileValidationError, match="not supported"):
            validate_mime_type("application/x-msdownload")

        with pytest.raises(FileValidationError, match="Content-Type header is required"):
            validate_mime_type(None)

    def test_validate_magic_bytes_png(self):
        png_header = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
        validate_file_content_signature(png_header, ".png")

        with pytest.raises(FileValidationError, match="does not match PNG signature"):
            validate_file_content_signature(b"NOT_A_PNG_FILE_CONTENT", ".png")

    def test_validate_magic_bytes_jpeg(self):
        jpg_header = b"\xff\xd8\xff\xe0\x00\x10JFIF"
        validate_file_content_signature(jpg_header, ".jpg")
        validate_file_content_signature(jpg_header, ".jpeg")

        with pytest.raises(FileValidationError, match="does not match JPEG signature"):
            validate_file_content_signature(b"NOT_A_JPEG_FILE", ".jpg")

    def test_validate_magic_bytes_pdf(self):
        pdf_header = b"%PDF-1.7\n%\xe2\xe3\xcf\xd3"
        validate_file_content_signature(pdf_header, ".pdf")

        with pytest.raises(FileValidationError, match="does not match PDF signature"):
            validate_file_content_signature(b"<html><body>fake pdf</body></html>", ".pdf")

    def test_validate_magic_bytes_webp(self):
        webp_header = b"RIFF\x20\x00\x00\x00WEBPVP8 "
        validate_file_content_signature(webp_header, ".webp")

        with pytest.raises(FileValidationError, match="does not match WEBP signature"):
            validate_file_content_signature(b"RIFF\x20\x00\x00\x00AVI LIST", ".webp")

    def test_reject_empty_or_truncated_file(self):
        with pytest.raises(FileValidationError, match="File is empty or corrupted"):
            validate_file_content_signature(b"", ".png")
        with pytest.raises(FileValidationError, match="File is empty or corrupted"):
            validate_file_content_signature(b"12", ".pdf")

    def test_sanitize_display_filename(self):
        dirty = "../../weird ; name *? <>.png"
        clean = sanitize_display_filename(dirty)
        assert "/" not in clean
        assert "\\" not in clean
        assert "<" not in clean

    def test_generate_secure_storage_filename(self):
        file_id, filename = generate_secure_storage_filename(".png")
        assert str(file_id) in filename
        assert filename.endswith(".png")
