"""
Tests for SafeShare output integrity (Check 7 — SHA-256, Check 8 — file size).
Verifies PNG magic bytes, hash consistency, and size sanity.
"""
import hashlib
import io
import pytest
from PIL import Image
from unittest.mock import patch

from backend.app.redaction.metadata import strip_exif_metadata


PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def _make_png_bytes(w: int = 640, h: int = 480, color=(100, 200, 150)) -> bytes:
    img = Image.new("RGB", (w, h), color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class TestOutputIntegrity:
    def test_output_starts_with_png_magic_bytes(self):
        """Check 3: Regardless of input, output must be a valid PNG."""
        result = strip_exif_metadata(_make_png_bytes())
        assert result[:8] == PNG_MAGIC

    def test_sha256_is_deterministic_for_same_input(self):
        """Check 7: Same pixel input → same SHA-256 hash."""
        png_bytes = _make_png_bytes(100, 100, color=(42, 42, 42))
        h1 = _sha256(strip_exif_metadata(png_bytes))
        h2 = _sha256(strip_exif_metadata(png_bytes))
        assert h1 == h2, "SHA-256 must be deterministic for identical inputs"

    def test_sha256_changes_on_pixel_difference(self):
        """Two distinct images must produce different SHA-256 hashes."""
        img_a = strip_exif_metadata(_make_png_bytes(100, 100, color=(0, 0, 0)))
        img_b = strip_exif_metadata(_make_png_bytes(100, 100, color=(255, 255, 255)))
        assert _sha256(img_a) != _sha256(img_b)

    def test_sha256_is_64_hex_characters(self):
        result = strip_exif_metadata(_make_png_bytes())
        digest = _sha256(result)
        assert len(digest) == 64
        assert all(c in "0123456789abcdef" for c in digest)

    def test_output_size_reasonable_for_small_image(self):
        """Check 8: A small clean PNG should produce a reasonably sized output."""
        png_bytes = _make_png_bytes(200, 150)
        result = strip_exif_metadata(png_bytes)
        input_size = len(png_bytes)
        output_size = len(result)

        # Allow up to 8x expansion (PNG of fully uniform colors may differ in compression)
        assert output_size < input_size * 8, (
            f"Output ({output_size} bytes) is unexpectedly large "
            f"relative to input ({input_size} bytes)"
        )

    def test_output_size_reasonable_for_large_image(self):
        """Check 8: Larger image output must not balloon beyond reasonable bounds."""
        large_png = _make_png_bytes(1920, 1080)
        result = strip_exif_metadata(large_png)
        # 1920x1080 RGB uncompressed = ~6MB; PNG compressed should be far below 30MB
        assert len(result) < 30 * 1024 * 1024, "Output must not exceed 30MB hard ceiling"

    def test_output_is_valid_openable_png(self):
        """Verify strip_exif_metadata output can be re-opened as a valid PIL image."""
        result = strip_exif_metadata(_make_png_bytes(300, 200))
        with Image.open(io.BytesIO(result)) as img:
            assert img.format == "PNG"
            assert img.size == (300, 200)
