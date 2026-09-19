from typing import List, Sequence, Tuple
import cv2
import numpy as np


def clamp_bbox(bbox: Sequence[int], width: int, height: int, padding: int = 0) -> Tuple[int, int, int, int]:
    """
    Expands a bounding box by padding and clamps coordinates strictly within image boundaries.
    Returns (x1, y1, x2, y2).
    """
    if len(bbox) < 4:
        return 0, 0, 0, 0

    x1, y1, x2, y2 = bbox[:4]

    # Normalize inverted coordinates if necessary
    x_min, x_max = min(x1, x2), max(x1, x2)
    y_min, y_max = min(y1, y2), max(y1, y2)

    clamped_x1 = max(0, min(x_min - padding, width))
    clamped_y1 = max(0, min(y_min - padding, height))
    clamped_x2 = max(0, min(x_max + padding, width))
    clamped_y2 = max(0, min(y_max + padding, height))

    return int(clamped_x1), int(clamped_y1), int(clamped_x2), int(clamped_y2)


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

    if x2 <= x1 or y2 <= y1:
        return image

    roi = image[y1:y2, x1:x2]
    # Ensure kernel size is odd and at least 3
    ksize = max(3, kernel_size | 1)
    # Ensure kernel size doesn't exceed ROI dimensions if tiny
    roi_h, roi_w = roi.shape[:2]
    max_k = min(roi_h, roi_w)
    if max_k % 2 == 0:
        max_k -= 1
    ksize = min(ksize, max(3, max_k))

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

    if x2 <= x1 or y2 <= y1:
        return image

    roi = image[y1:y2, x1:x2]
    roi_h, roi_w = roi.shape[:2]

    # Determine downscaled size
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

    if x2 <= x1 or y2 <= y1:
        return image

    box_width = x2 - x1
    redact_end_x = x1 + int(box_width * (1.0 - keep_ratio))

    if redact_end_x > x1:
        partial_bbox = [x1, y1, redact_end_x, y2]
        return apply_gaussian_blur(image, partial_bbox, kernel_size=kernel_size, padding=0)

    return image
