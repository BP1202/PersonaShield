import io
import numpy as np
import pytest
from PIL import Image

from backend.app.ocr.preprocessor import ocr_preprocessor


def create_test_image_bytes(width: int = 200, height: int = 100, color: str = "white") -> bytes:
    """Helper to create test image bytes."""
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_preprocess_image_valid():
    """Verify that a valid image is preprocessed into enhanced grayscale numpy array."""
    img_bytes = create_test_image_bytes(200, 100)
    result = ocr_preprocessor.preprocess_image(img_bytes)

    assert isinstance(result, np.ndarray)
    assert len(result.shape) == 2  # Grayscale image (H, W)
    assert result.shape[0] == 100
    assert result.shape[1] == 200


def test_preprocess_image_empty_bytes():
    """Verify that empty bytes raise ValueError."""
    with pytest.raises(ValueError, match="cannot be empty"):
        ocr_preprocessor.preprocess_image(b"")


def test_preprocess_image_corrupt_bytes():
    """Verify that invalid/corrupt image bytes raise ValueError."""
    with pytest.raises(ValueError, match="Failed to decode image"):
        ocr_preprocessor.preprocess_image(b"not-a-valid-image-content")


def test_preprocess_image_resizing():
    """Verify that images exceeding max_dimension are downscaled keeping aspect ratio."""
    # Create an image larger than default max_dimension (2400)
    img_bytes = create_test_image_bytes(3000, 1500)
    result = ocr_preprocessor.preprocess_image(img_bytes, max_dimension=1500)

    assert result.shape[1] == 1500  # Width clamped to 1500
    assert result.shape[0] == 750   # Height proportionally scaled


def test_preprocess_pdf_empty_bytes():
    """Verify that empty PDF bytes raise ValueError."""
    with pytest.raises(ValueError, match="cannot be empty"):
        ocr_preprocessor.preprocess_pdf(b"")
