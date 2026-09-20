from typing import Dict, List, Sequence, Tuple
import cv2
import numpy as np


# Mode priority for conflict resolution during overlap merging (higher = wins)
MODE_PRIORITY: Dict[str, int] = {
    "blackout": 4,
    "blur": 3,
    "partial_blur": 2,
    "pixelate": 1,
}


def clamp_bbox(
    bbox: Sequence[int], width: int, height: int, padding: int = 0
) -> Tuple[int, int, int, int]:
    """
    Expands a bounding box by padding and clamps coordinates strictly within image boundaries.
    Normalizes inverted coordinates. Returns (x1, y1, x2, y2).
    """
    if len(bbox) < 4:
        return 0, 0, 0, 0

    x1, y1, x2, y2 = bbox[:4]

    # Normalize inverted coordinates
    x_min, x_max = min(x1, x2), max(x1, x2)
    y_min, y_max = min(y1, y2), max(y1, y2)

    clamped_x1 = max(0, min(x_min - padding, width))
    clamped_y1 = max(0, min(y_min - padding, height))
    clamped_x2 = max(0, min(x_max + padding, width))
    clamped_y2 = max(0, min(y_max + padding, height))

    return int(clamped_x1), int(clamped_y1), int(clamped_x2), int(clamped_y2)


def _bbox_iou(a: Tuple[int, int, int, int], b: Tuple[int, int, int, int]) -> float:
    """Computes Intersection over Union of two bounding boxes."""
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)

    if inter_x2 <= inter_x1 or inter_y2 <= inter_y1:
        return 0.0

    inter_area = (inter_x2 - inter_x1) * (inter_y2 - inter_y1)
    area_a = max(0, (ax2 - ax1)) * max(0, (ay2 - ay1))
    area_b = max(0, (bx2 - bx1)) * max(0, (by2 - by1))
    union_area = area_a + area_b - inter_area

    if union_area <= 0:
        return 0.0

    return inter_area / union_area


def merge_overlapping_bboxes_iou(
    regions: List[Dict], iou_threshold: float = 0.20
) -> List[Dict]:
    """
    Merges overlapping redaction regions where IoU >= threshold.
    Resolves mode conflicts by keeping highest-priority mode (blackout > blur > partial_blur > pixelate).
    Prevents double-blur artifacts and keeps semantically distinct regions separate.
    """
    if not regions:
        return regions

    merged = list(regions)
    changed = True

    while changed:
        changed = False
        result: List[Dict] = []
        used = [False] * len(merged)

        for i, r_i in enumerate(merged):
            if used[i]:
                continue
            bbox_i = tuple(r_i["bbox"][:4])
            mode_i = r_i.get("mode", "blur")
            merged_region = dict(r_i)

            for j in range(i + 1, len(merged)):
                if used[j]:
                    continue
                r_j = merged[j]
                bbox_j = tuple(r_j["bbox"][:4])
                mode_j = r_j.get("mode", "blur")

                iou = _bbox_iou(bbox_i, bbox_j)
                if iou >= iou_threshold:
                    # Union bounding box
                    ux1 = min(bbox_i[0], bbox_j[0])
                    uy1 = min(bbox_i[1], bbox_j[1])
                    ux2 = max(bbox_i[2], bbox_j[2])
                    uy2 = max(bbox_i[3], bbox_j[3])
                    bbox_i = (ux1, uy1, ux2, uy2)

                    # Highest priority mode wins
                    winning_mode = (
                        mode_i
                        if MODE_PRIORITY.get(mode_i, 0) >= MODE_PRIORITY.get(mode_j, 0)
                        else mode_j
                    )
                    mode_i = winning_mode
                    merged_region = dict(merged_region)
                    merged_region["bbox"] = list(bbox_i)
                    merged_region["mode"] = winning_mode
                    merged_region["source"] = "merged"
                    used[j] = True
                    changed = True

            merged_region["bbox"] = list(bbox_i)
            merged_region["mode"] = mode_i
            result.append(merged_region)

        merged = result

    return merged


def apply_gaussian_blur(
    image: np.ndarray,
    bbox: Sequence[int],
    kernel_size: int = 25,
    sigma: float = 0.0,
    padding: int = 4,
) -> np.ndarray:
    """
    Applies high-density Gaussian blur over the target bounding box.
    Suitable for identity documents (Aadhaar, PAN, Passport, QR codes).
    """
    h, w = image.shape[:2]
    x1, y1, x2, y2 = clamp_bbox(bbox, w, h, padding=padding)

    # Check 2: zero-area guard
    if x2 <= x1 or y2 <= y1:
        return image

    roi = image[y1:y2, x1:x2]
    roi_h, roi_w = roi.shape[:2]

    if roi_h <= 0 or roi_w <= 0:
        return image

    # Ensure odd kernel, at least 3, not exceeding smallest roi dimension
    ksize = max(3, kernel_size | 1)
    max_k = max(3, min(roi_h if roi_h % 2 == 1 else roi_h - 1,
                        roi_w if roi_w % 2 == 1 else roi_w - 1))
    ksize = min(ksize, max_k)

    blurred = cv2.GaussianBlur(roi, (ksize, ksize), sigmaX=sigma, sigmaY=sigma)
    image[y1:y2, x1:x2] = blurred
    return image


def apply_pixelation(
    image: np.ndarray,
    bbox: Sequence[int],
    block_size: int = 12,
    padding: int = 4,
) -> np.ndarray:
    """
    Applies pixelation / mosaic effect over the bounding box.
    Suitable for phone numbers, email addresses, and discrete privacy fields.
    """
    h, w = image.shape[:2]
    x1, y1, x2, y2 = clamp_bbox(bbox, w, h, padding=padding)

    # Check 2: zero-area guard
    if x2 <= x1 or y2 <= y1:
        return image

    roi = image[y1:y2, x1:x2]
    roi_h, roi_w = roi.shape[:2]

    if roi_h <= 0 or roi_w <= 0:
        return image

    down_w = max(1, roi_w // max(2, block_size))
    down_h = max(1, roi_h // max(2, block_size))

    small = cv2.resize(roi, (down_w, down_h), interpolation=cv2.INTER_LINEAR)
    pixelated = cv2.resize(small, (roi_w, roi_h), interpolation=cv2.INTER_NEAREST)

    image[y1:y2, x1:x2] = pixelated
    return image


def apply_blackout(
    image: np.ndarray,
    bbox: Sequence[int],
    color: Tuple[int, int, int] = (18, 18, 24),
    padding: int = 2,
) -> np.ndarray:
    """
    Applies solid dark rectangle over the bounding box.
    Suitable for high-risk secrets (API keys, tokens, passwords, database credentials).
    """
    h, w = image.shape[:2]
    x1, y1, x2, y2 = clamp_bbox(bbox, w, h, padding=padding)

    # Check 2: zero-area guard
    if x2 <= x1 or y2 <= y1:
        return image

    image[y1:y2, x1:x2] = color
    return image


def apply_partial_blur(
    image: np.ndarray,
    bbox: Sequence[int],
    keep_ratio: float = 0.28,
    kernel_size: int = 25,
    padding: int = 2,
) -> np.ndarray:
    """
    Redacts the primary span of a bounding box while preserving the terminal ~28% visible.
    Optimized for credit cards, debit cards, and bank account numbers.
    """
    h, w = image.shape[:2]
    x1, y1, x2, y2 = clamp_bbox(bbox, w, h, padding=padding)

    # Check 2: zero-area guard
    if x2 <= x1 or y2 <= y1:
        return image

    box_width = x2 - x1
    redact_end_x = x1 + int(box_width * (1.0 - keep_ratio))

    if redact_end_x > x1:
        partial_bbox = [x1, y1, redact_end_x, y2]
        return apply_gaussian_blur(image, partial_bbox, kernel_size=kernel_size, padding=0)

    return image
