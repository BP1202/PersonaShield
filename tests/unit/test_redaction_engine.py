"""
Tests for redaction engine hardening:
- Bounding box clipping (Check 2)
- IoU-based overlapping region merge (Check 5)
- Zero-area bbox guard
- Mode priority resolution
"""
import io
import numpy as np
import pytest
from PIL import Image

from backend.app.redaction.blur import (
    _bbox_iou,
    apply_blackout,
    apply_gaussian_blur,
    apply_pixelation,
    clamp_bbox,
    merge_overlapping_bboxes_iou,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_bgr_image(width: int = 400, height: int = 300, fill: int = 200) -> np.ndarray:
    return np.full((height, width, 3), fill, dtype=np.uint8)


# ---------------------------------------------------------------------------
# Check 2 — Bounding Box Clipping
# ---------------------------------------------------------------------------

class TestBboxClipping:
    def test_clamp_negative_coordinates(self):
        x1, y1, x2, y2 = clamp_bbox([-5, -10, 100, 80], width=200, height=150)
        assert x1 == 0
        assert y1 == 0
        assert x2 == 100
        assert y2 == 80

    def test_clamp_beyond_image_dimensions(self):
        x1, y1, x2, y2 = clamp_bbox([10, 20, 1200, 900], width=640, height=480)
        assert x2 == 640
        assert y2 == 480

    def test_clamp_inverted_coordinates_normalized(self):
        """x2 < x1 should be normalized."""
        x1, y1, x2, y2 = clamp_bbox([200, 100, 50, 50], width=400, height=300)
        assert x1 <= x2
        assert y1 <= y2

    def test_clamp_entirely_outside_image(self):
        x1, y1, x2, y2 = clamp_bbox([1000, 1000, 2000, 2000], width=640, height=480)
        # Both clamped to image boundary — results in zero-area
        assert x1 == x2 == 640
        assert y1 == y2 == 480

    def test_zero_area_bbox_skipped_by_blur(self):
        """Zero-area bbox after clamping must not alter image."""
        img = make_bgr_image(200, 150)
        original = img.copy()
        result = apply_gaussian_blur(img.copy(), [100, 100, 100, 100])
        assert np.array_equal(result, original)

    def test_zero_area_bbox_skipped_by_blackout(self):
        """Zero-area bbox must not alter image — use coordinates where clamped result stays zero-area."""
        img = make_bgr_image(200, 150)
        original = img.copy()
        # [0,0,0,0] → after clamp+padding: x1=0,y1=0,x2=2,y2=2 — this WILL paint (padding expands)
        # Use explicitly degenerate bbox that after normalization+clamp is still zero-area
        result = apply_blackout(img.copy(), [100, 100, 100, 100], padding=0)
        assert np.array_equal(result, original)

    def test_zero_area_bbox_skipped_by_pixelation(self):
        img = make_bgr_image(200, 150)
        original = img.copy()
        result = apply_pixelation(img.copy(), [50, 50, 50, 50])
        assert np.array_equal(result, original)

    def test_very_small_valid_bbox_applied(self):
        """A 3x3 region is small but valid and should be modified."""
        img = make_bgr_image(200, 150, fill=200)
        result = apply_blackout(img.copy(), [10, 10, 13, 13])
        assert not np.array_equal(result[10:13, 10:13], img[10:13, 10:13])


# ---------------------------------------------------------------------------
# Check 5 — IoU Overlap Merge
# ---------------------------------------------------------------------------

class TestIoUMerge:
    def _make_region(self, bbox, mode="blur", source="finding"):
        return {"bbox": bbox, "mode": mode, "source": source, "finding_type": "TEST"}

    def test_no_overlap_stays_separate(self):
        """Non-overlapping regions should remain independent."""
        regions = [
            self._make_region([0, 0, 50, 50], mode="blackout"),
            self._make_region([200, 200, 300, 300], mode="blur"),
        ]
        merged = merge_overlapping_bboxes_iou(regions, iou_threshold=0.20)
        assert len(merged) == 2

    def test_high_overlap_merged_into_one(self):
        """Highly overlapping regions (IoU >> 0.20) must be merged."""
        # Two nearly identical boxes — IoU ≈ 0.69
        regions = [
            self._make_region([10, 10, 100, 100], mode="blur"),
            self._make_region([20, 20, 110, 110], mode="blackout"),
        ]
        merged = merge_overlapping_bboxes_iou(regions, iou_threshold=0.20)
        assert len(merged) == 1

    def test_merged_mode_priority_blackout_wins(self):
        """When blur and blackout overlap, blackout has higher priority and wins."""
        regions = [
            self._make_region([10, 10, 100, 100], mode="blur"),
            self._make_region([20, 20, 110, 110], mode="blackout"),
        ]
        merged = merge_overlapping_bboxes_iou(regions, iou_threshold=0.20)
        assert merged[0]["mode"] == "blackout"

    def test_merged_bbox_is_union(self):
        """Merged bbox should be the union of both regions."""
        # IoU of [10,10,100,100] vs [30,30,120,120]:
        # inter=(100-30)*(100-30)=4900, areaA=90*90=8100, areaB=90*90=8100, union=8100+8100-4900=11300, IoU~0.43
        regions = [
            self._make_region([10, 10, 100, 100], mode="blur"),
            self._make_region([30, 30, 120, 120], mode="blur"),
        ]
        merged = merge_overlapping_bboxes_iou(regions, iou_threshold=0.20)
        assert len(merged) == 1
        x1, y1, x2, y2 = merged[0]["bbox"]
        assert x1 == 10
        assert y1 == 10
        assert x2 == 120
        assert y2 == 120

    def test_low_overlap_below_threshold_not_merged(self):
        """Slight adjacency with IoU < threshold must stay separate."""
        # Two adjacent but barely-touching boxes have near-zero IoU
        regions = [
            self._make_region([0, 0, 50, 50], mode="blur"),
            self._make_region([51, 0, 100, 50], mode="pixelate"),
        ]
        merged = merge_overlapping_bboxes_iou(regions, iou_threshold=0.20)
        assert len(merged) == 2

    def test_empty_input_returns_empty(self):
        assert merge_overlapping_bboxes_iou([], iou_threshold=0.20) == []

    def test_single_region_unchanged(self):
        regions = [self._make_region([10, 10, 50, 50])]
        merged = merge_overlapping_bboxes_iou(regions, iou_threshold=0.20)
        assert len(merged) == 1
        assert merged[0]["bbox"] == [10, 10, 50, 50]

    def test_three_chain_merge(self):
        """A, B, C boxes with high pairwise IoU should all merge; blackout wins."""
        # Three nearly identical overlapping boxes — all IoU >> 0.20
        regions = [
            self._make_region([10, 10, 100, 100], mode="pixelate"),
            self._make_region([15, 15, 105, 105], mode="blur"),
            self._make_region([20, 20, 110, 110], mode="blackout"),
        ]
        merged = merge_overlapping_bboxes_iou(regions, iou_threshold=0.20)
        # All should merge into one, blackout wins
        assert len(merged) == 1
        assert merged[0]["mode"] == "blackout"


# ---------------------------------------------------------------------------
# IoU Calculation
# ---------------------------------------------------------------------------

class TestBboxIou:
    def test_identical_boxes_iou_one(self):
        iou = _bbox_iou((0, 0, 100, 100), (0, 0, 100, 100))
        assert iou == pytest.approx(1.0)

    def test_no_overlap_iou_zero(self):
        iou = _bbox_iou((0, 0, 50, 50), (100, 100, 200, 200))
        assert iou == pytest.approx(0.0)

    def test_partial_overlap(self):
        iou = _bbox_iou((0, 0, 100, 100), (50, 50, 150, 150))
        # Intersection: 50x50=2500, Union: 100*100 + 100*100 - 2500 = 17500
        assert iou == pytest.approx(2500 / 17500, rel=1e-4)
