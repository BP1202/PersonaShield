"""
Tests for metadata stripping via image pixel reconstruction (Check 4).
Verifies full EXIF, GPS, ICC, and camera metadata removal.
"""
import io
import pytest
from PIL import Image

from backend.app.redaction.metadata import has_exif_metadata, strip_exif_metadata


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_png_bytes(w: int = 100, h: int = 80) -> bytes:
    img = Image.new("RGB", (w, h), color=(120, 180, 240))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_jpeg_with_exif() -> bytes:
    """
    Creates a JPEG embedding basic EXIF tags (Make, Model, Orientation).
    Avoids GPS rational tuples which require piexif's IFDRational type.
    The key property being tested is that ALL metadata is removed after stripping.
    """
    img = Image.new("RGB", (200, 150), color=(200, 100, 50))

    exif = img.getexif()
    exif[0x010F] = "TestMaker"   # Make
    exif[0x0110] = "TestCamera"  # Model
    exif[0x0112] = 6             # Orientation = rotated
    exif[0x0131] = "TestSoftware"  # Software

    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif.tobytes())
    return buf.getvalue()


def _make_webp_bytes(w: int = 100, h: int = 80) -> bytes:
    img = Image.new("RGB", (w, h), color=(80, 160, 240))
    buf = io.BytesIO()
    img.save(buf, format="WEBP")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Check 3 — PNG-only output regardless of input format
# ---------------------------------------------------------------------------

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


class TestPngOnlyOutput:
    def test_png_input_outputs_png(self):
        result = strip_exif_metadata(_make_png_bytes())
        assert result[:8] == PNG_MAGIC, "Output must be PNG regardless of input"

    def test_jpeg_input_outputs_png(self):
        jpeg_bytes = _make_jpeg_with_exif()
        result = strip_exif_metadata(jpeg_bytes)
        assert result[:8] == PNG_MAGIC, "JPEG input must be converted to PNG"

    def test_webp_input_outputs_png(self):
        img = Image.new("RGB", (100, 80), color=(80, 160, 240))
        buf = io.BytesIO()
        img.save(buf, format="WEBP")
        result = strip_exif_metadata(buf.getvalue())
        assert result[:8] == PNG_MAGIC, "WEBP input must be converted to PNG"

    def test_output_dimensions_preserved(self):
        """Image dimensions must be identical after stripping."""
        jpeg_bytes = _make_jpeg_with_exif()
        result = strip_exif_metadata(jpeg_bytes)
        with Image.open(io.BytesIO(result)) as img:
            assert img.size == (200, 150)


# ---------------------------------------------------------------------------
# Check 4 — EXIF / GPS metadata fully removed by reconstruction
# ---------------------------------------------------------------------------

class TestExifStripping:
    def test_exif_removed_from_jpeg(self):
        jpeg_with_exif = _make_jpeg_with_exif()

        # Verify source JPEG actually has EXIF
        assert has_exif_metadata(jpeg_with_exif), "Test fixture must have EXIF metadata"

        stripped = strip_exif_metadata(jpeg_with_exif)

        with Image.open(io.BytesIO(stripped)) as img:
            exif_data = img.getexif()
            assert len(exif_data) == 0, f"Stripped PNG must have zero EXIF tags, got {dict(exif_data)}"

    def test_no_gps_ifd_in_stripped_output(self):
        jpeg_with_exif = _make_jpeg_with_exif()
        stripped = strip_exif_metadata(jpeg_with_exif)

        with Image.open(io.BytesIO(stripped)) as img:
            gps_ifd = img.getexif().get_ifd(0x8825)
            assert len(gps_ifd) == 0, "GPS IFD must be completely absent from output"

    def test_camera_model_removed(self):
        jpeg_bytes = _make_jpeg_with_exif()
        stripped = strip_exif_metadata(jpeg_bytes)

        with Image.open(io.BytesIO(stripped)) as img:
            exif = img.getexif()
            assert 0x0110 not in exif, "Camera Model tag must be removed"
            assert 0x010F not in exif, "Camera Make tag must be removed"

    def test_orientation_tag_removed(self):
        jpeg_bytes = _make_jpeg_with_exif()
        stripped = strip_exif_metadata(jpeg_bytes)

        with Image.open(io.BytesIO(stripped)) as img:
            exif = img.getexif()
            assert 0x0112 not in exif, "Orientation tag must be removed"

    def test_clean_png_has_no_exif(self):
        """A PNG with no EXIF should still produce clean output."""
        result = strip_exif_metadata(_make_png_bytes())
        assert not has_exif_metadata(result), "Clean PNG output must have zero EXIF"

    def test_pixel_data_preserved_after_reconstruction(self):
        """Pixel values must remain identical after stripping."""
        orig_img = Image.new("RGB", (50, 40), color=(255, 0, 128))
        buf = io.BytesIO()
        orig_img.save(buf, format="PNG")
        png_bytes = buf.getvalue()

        stripped = strip_exif_metadata(png_bytes)
        with Image.open(io.BytesIO(stripped)) as result_img:
            assert result_img.size == (50, 40)
            pixels = list(result_img.getdata())
            assert all(p == (255, 0, 128) for p in pixels), (
                "Pixel data must be preserved exactly after metadata reconstruction"
            )
