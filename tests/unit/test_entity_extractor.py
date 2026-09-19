import pytest
from backend.app.detection.entity_extractor import (
    compute_union_bbox,
    entity_extractor_engine,
    find_entity_bbox,
)
from backend.app.ocr.engine import OcrToken


def test_compute_union_bbox():
    """Verify that multiple boxes union into a single enclosing [min_x, min_y, max_x, max_y]."""
    boxes = [
        [10, 20, 50, 60],
        [40, 15, 80, 70],
        [5, 30, 60, 65],
    ]
    union_box = compute_union_bbox(boxes)
    assert union_box == [5, 15, 80, 70]


def test_compute_union_bbox_empty():
    """Verify empty box list returns [0, 0, 0, 0]."""
    assert compute_union_bbox([]) == [0, 0, 0, 0]


def test_find_entity_bbox_single_token():
    """Verify single matching token yields that token's bounding box."""
    tokens = [
        OcrToken(text="Tax", confidence=0.99, bbox=[10, 10, 40, 25], page_number=1),
        OcrToken(text="ABCDE1234F", confidence=0.98, bbox=[50, 10, 150, 25], page_number=1),
    ]
    bbox, page = find_entity_bbox("ABCDE1234F", tokens)
    assert bbox == [50, 10, 150, 25]
    assert page == 1


def test_find_entity_bbox_multi_token():
    """Verify entity spanning across multiple tokens yields the enclosing union box."""
    tokens = [
        OcrToken(text="3456", confidence=0.95, bbox=[10, 10, 40, 25], page_number=1),
        OcrToken(text="7890", confidence=0.96, bbox=[50, 10, 80, 25], page_number=1),
        OcrToken(text="1234", confidence=0.95, bbox=[90, 10, 120, 25], page_number=1),
    ]
    bbox, page = find_entity_bbox("3456 7890 1234", tokens)
    assert bbox == [10, 10, 120, 25]
    assert page == 1


def test_extract_entities_with_regex_and_bounding_boxes():
    """Verify full extraction pipeline runs regex detectors and attaches token bounding boxes."""
    text = "Key: AKIAIOSFODNN7EXAMPLE"
    tokens = [
        OcrToken(text="Key:", confidence=0.99, bbox=[10, 20, 40, 35], page_number=1),
        OcrToken(
            text="AKIAIOSFODNN7EXAMPLE",
            confidence=0.99,
            bbox=[50, 20, 200, 35],
            page_number=1,
        ),
    ]

    entities = entity_extractor_engine.extract_entities(text, tokens)
    assert len(entities) >= 1

    aws_entity = next((e for e in entities if e.entity_type == "AWS_ACCESS_KEY"), None)
    assert aws_entity is not None
    assert aws_entity.category == "CREDENTIAL"
    assert aws_entity.text_snippet == "AKIAIOSFODNN7EXAMPLE"
    assert aws_entity.confidence >= 0.99
    assert aws_entity.bbox == [50, 20, 200, 35]
    assert aws_entity.page_number == 1


def test_extract_entities_empty_text():
    """Verify empty text returns empty entity list without failure."""
    assert entity_extractor_engine.extract_entities("", []) == []
    assert entity_extractor_engine.extract_entities("   ", []) == []
