import io
from PIL import Image
import pytest

from backend.app.redaction.metadata import has_exif_metadata, strip_exif_metadata


def create_jpeg_with_exif() -> bytes:
    """Creates a synthetic JPEG containing explicit EXIF metadata using native PIL."""
    img = Image.new("RGB", (100, 100), color="blue")
    exif = img.getexif()
    # 0x010f = Make, 0x0110 = Model, 0x0131 = Software
    exif[0x010F] = "PersonaShield Camera"
    exif[0x0110] = "Secret Hardware 1.0"
    exif[0x0131] = "PersonaShield Test Suite"

    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    return buf.getvalue()


def test_strip_exif_metadata_removes_all_tags():
    # 1. Generate JPEG with EXIF tags
    raw_with_exif = create_jpeg_with_exif()
    assert has_exif_metadata(raw_with_exif) is True

    # 2. Strip metadata via SafeShare engine
    sanitized_png = strip_exif_metadata(raw_with_exif)
    assert isinstance(sanitized_png, bytes)
    assert len(sanitized_png) > 0

    # 3. Verify stripped image has zero EXIF tags
    assert has_exif_metadata(sanitized_png) is False

    # 4. Open with PIL and assert getexif is empty
    with Image.open(io.BytesIO(sanitized_png)) as img:
        assert img.format == "PNG"
        exif = img.getexif()
        assert len(exif) == 0
