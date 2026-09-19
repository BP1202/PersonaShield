import pytest
from backend.app.ocr.engine import normalize_ocr_text, polygon_to_bbox


def test_normalize_ocr_text_nfkc():
    """Verify Unicode NFKC normalization turns compatibility chars into canonical forms."""
    # Fullwidth latin letters: ＡＢＣ -> ABC
    fullwidth_str = "\uff21\uff22\uff23"
    assert normalize_ocr_text(fullwidth_str) == "ABC"


def test_normalize_ocr_text_strips_control_characters():
    """Verify non-printable control characters are stripped while newlines remain."""
    # Contains NULL \x00, BEL \x07, and newline \n
    dirty_text = "Line 1\x00\x07\nLine 2\x1b"
    clean_text = normalize_ocr_text(dirty_text)
    assert clean_text == "Line 1\nLine 2"


def test_normalize_ocr_text_empty_and_whitespace():
    """Verify empty string and excess whitespace handling."""
    assert normalize_ocr_text("") == ""
    assert normalize_ocr_text("   \t\n  ") == ""
    assert normalize_ocr_text("Hello  World\r\nTest") == "Hello  World\nTest"


def test_polygon_to_bbox_standard_rectangle():
    """Verify 4-point polygon converts to [min_x, min_y, max_x, max_y]."""
    polygon = [[10, 20], [110, 20], [110, 50], [10, 50]]
    bbox = polygon_to_bbox(polygon)
    assert bbox == [10, 20, 110, 50]


def test_polygon_to_bbox_rotated_or_unordered():
    """Verify arbitrary polygon point orders are bounded correctly."""
    polygon = [[50, 100], [10, 20], [80, 90], [100, 30]]
    bbox = polygon_to_bbox(polygon)
    assert bbox == [10, 20, 100, 100]


def test_polygon_to_bbox_empty_or_invalid():
    """Verify invalid input yields [0, 0, 0, 0]."""
    assert polygon_to_bbox([]) == [0, 0, 0, 0]
    assert polygon_to_bbox("invalid") == [0, 0, 0, 0]
