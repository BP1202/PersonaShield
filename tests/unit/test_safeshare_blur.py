import numpy as np
import pytest

from backend.app.redaction.blur import (
    apply_blackout,
    apply_gaussian_blur,
    apply_partial_blur,
    apply_pixelation,
    clamp_bbox,
)


def create_test_pattern_image(width: int = 200, height: int = 100) -> np.ndarray:
    """Creates a deterministic multi-color gradient image for testing pixel alteration."""
    y, x = np.mgrid[0:height, 0:width]
    b = (x * 255 // width).astype(np.uint8)
    g = (y * 255 // height).astype(np.uint8)
    r = ((x + y) * 255 // (width + height)).astype(np.uint8)
    return np.dstack((b, g, r))


def test_clamp_bbox():
    """Verify coordinate normalization, padding expansion, and boundary clamping."""
    # Standard valid box
    x1, y1, x2, y2 = clamp_bbox([20, 30, 80, 70], width=200, height=100, padding=5)
    assert x1 == 15
    assert y1 == 25
    assert x2 == 85
    assert y2 == 75

    # Out of bounds clamping
    x1, y1, x2, y2 = clamp_bbox([-10, -5, 250, 150], width=200, height=100, padding=0)
    assert x1 == 0
    assert y1 == 0
    assert x2 == 200
    assert y2 == 100

    # Inverted coordinates [x2, y2, x1, y1]
    x1, y1, x2, y2 = clamp_bbox([80, 70, 20, 30], width=200, height=100, padding=0)
    assert x1 == 20
    assert y1 == 30
    assert x2 == 80
    assert y2 == 70


def test_apply_gaussian_blur_alters_only_roi():
    img = create_test_pattern_image()
    orig = img.copy()

    bbox = [40, 20, 100, 60]
    blurred = apply_gaussian_blur(img, bbox, kernel_size=25, padding=0)

    # Pixels inside the bbox MUST have changed
    diff_inside = np.abs(blurred[20:60, 40:100].astype(int) - orig[20:60, 40:100].astype(int))
    assert np.mean(diff_inside) > 0

    # Pixels outside the bbox MUST be identical
    # Left of bbox
    assert np.array_equal(blurred[:, :40], orig[:, :40])
    # Right of bbox
    assert np.array_equal(blurred[:, 100:], orig[:, 100:])
    # Above bbox
    assert np.array_equal(blurred[:20, 40:100], orig[:20, 40:100])
    # Below bbox
    assert np.array_equal(blurred[60:, 40:100], orig[60:, 40:100])


def test_apply_pixelation_alters_only_roi():
    img = create_test_pattern_image()
    orig = img.copy()

    bbox = [50, 30, 120, 80]
    pixelated = apply_pixelation(img, bbox, block_size=10, padding=0)

    # Inside ROI must differ
    diff_inside = np.abs(pixelated[30:80, 50:120].astype(int) - orig[30:80, 50:120].astype(int))
    assert np.mean(diff_inside) > 0

    # Outside must be identical
    assert np.array_equal(pixelated[:, :50], orig[:, :50])
    assert np.array_equal(pixelated[:, 120:], orig[:, 120:])


def test_apply_blackout_fills_solid():
    img = create_test_pattern_image()
    orig = img.copy()

    bbox = [30, 10, 80, 50]
    dark_fill = (18, 18, 24)
    blacked = apply_blackout(img, bbox, color=dark_fill, padding=0)

    # Inside ROI must match dark_fill uniformly
    roi = blacked[10:50, 30:80]
    assert np.all(roi == dark_fill)

    # Outside must remain unaltered
    assert np.array_equal(blacked[:, :30], orig[:, :30])
    assert np.array_equal(blacked[:, 80:], orig[:, 80:])


def test_apply_partial_blur():
    img = create_test_pattern_image(width=200, height=100)
    orig = img.copy()

    # Total width of bbox is 100px (50 to 150)
    bbox = [50, 20, 150, 60]
    # keep_ratio 0.30 means the first 70px (50 to 120) are blurred, 120 to 150 stay intact
    partial = apply_partial_blur(img, bbox, keep_ratio=0.30, kernel_size=15, padding=0)

    # First section blurred
    diff_first = np.abs(partial[20:60, 50:120].astype(int) - orig[20:60, 50:120].astype(int))
    assert np.mean(diff_first) > 0

    # Terminal digits section (120 to 150) preserved
    assert np.array_equal(partial[20:60, 120:150], orig[20:60, 120:150])
