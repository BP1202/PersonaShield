import io
from typing import Any, Dict, List, Optional, Sequence, Tuple
import cv2
import numpy as np
from PIL import Image

from backend.app.core.logging import logger
from backend.app.redaction.blur import (
    apply_blackout,
    apply_gaussian_blur,
    apply_partial_blur,
    apply_pixelation,
    merge_overlapping_bboxes_iou,
)
from backend.app.redaction.metadata import strip_exif_metadata


# Production redaction strategy rules
DEFAULT_REDACTION_MODES: Dict[str, str] = {
    # High-Risk Credentials -> Blackout
    "OPENAI_API_KEY_EXPOSURE": "blackout",
    "ANTHROPIC_API_KEY_EXPOSURE": "blackout",
    "AWS_ACCESS_KEY_EXPOSURE": "blackout",
    "GITHUB_TOKEN_EXPOSURE": "blackout",
    "SLACK_TOKEN_EXPOSURE": "blackout",
    "JWT_TOKEN_EXPOSURE": "blackout",
    "DATABASE_CONNECTION_STRING_EXPOSURE": "blackout",

    # Identity Documents & QR Codes -> Gaussian Blur
    "AADHAAR_EXPOSURE": "blur",
    "PAN_EXPOSURE": "blur",
    "PASSPORT_EXPOSURE": "blur",
    "COMBINED_IDENTITY_EXPOSURE": "blur",
    "QR_CODE_EXPOSURE": "blur",

    # Financial Identifiers
    "CREDIT_CARD_EXPOSURE": "partial_blur",
    "UPI_EXPOSURE": "pixelate",

    # Workplace & Privacy Identifiers -> Pixelation
    "PHONE_EXPOSURE": "pixelate",
    "EMAIL_EXPOSURE": "pixelate",
    "INTERNAL_IP_EXPOSURE": "pixelate",
    "INTERNAL_URL_EXPOSURE": "pixelate",
    "SLACK_WORKSPACE_EXPOSURE": "pixelate",
}


def decode_image_bytes(image_bytes: bytes) -> np.ndarray:
    """
    Decodes raw image bytes (PNG, JPEG, WEBP, etc.) into an OpenCV BGR numpy array.
    """
    if not image_bytes:
        raise ValueError("Image bytes cannot be empty")

    file_bytes = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

    if image is None:
        # Fallback to Pillow for formats OpenCV imdecode might reject
        with Image.open(io.BytesIO(image_bytes)) as pil_img:
            rgb_converted = pil_img.convert("RGB")
            image = cv2.cvtColor(np.array(rgb_converted), cv2.COLOR_RGB2BGR)

    return image


class RedactionEngine:
    """
    SafeShare Redaction Engine:
    Applies deterministic privacy-preserving redactions (Gaussian blur, pixelation,
    blackout, partial masking) across detected sensitive findings and user-drawn custom regions.
    """

    def __init__(self, default_blur_kernel: int = 25):
        self.default_blur_kernel = default_blur_kernel

    def determine_mode(
        self,
        finding_type: str,
        finding_id: Optional[str] = None,
        override_modes: Optional[Dict[str, str]] = None,
    ) -> str:
        """Determines the appropriate redaction mode considering user overrides and defaults."""
        if override_modes:
            if finding_id and finding_id in override_modes:
                return override_modes[finding_id]
            if finding_type in override_modes:
                return override_modes[finding_type]

        return DEFAULT_REDACTION_MODES.get(finding_type, "blur")

    def apply_region(
        self,
        image: np.ndarray,
        bbox: Sequence[int],
        mode: str,
        blur_kernel: Optional[int] = None,
    ) -> np.ndarray:
        """Dispatches to the corresponding OpenCV redaction primitive."""
        ksize = blur_kernel or self.default_blur_kernel

        if mode == "blackout":
            return apply_blackout(image, bbox)
        elif mode == "pixelate":
            return apply_pixelation(image, bbox)
        elif mode == "partial_blur":
            return apply_partial_blur(image, bbox, kernel_size=ksize)
        else:  # default to blur
            return apply_gaussian_blur(image, bbox, kernel_size=ksize)

    def redact(
        self,
        image_bytes: bytes,
        findings: Optional[List[Dict[str, Any]]] = None,
        selected_finding_ids: Optional[List[str]] = None,
        custom_regions: Optional[List[Dict[str, Any]]] = None,
        override_modes: Optional[Dict[str, str]] = None,
        blur_kernel: Optional[int] = None,
    ) -> Tuple[bytes, List[Dict[str, Any]]]:
        """
        Executes full SafeShare redaction pipeline:
        1. Decodes image into full-color matrix.
        2. Collects all pending redaction regions (findings + custom).
        3. Merges overlapping regions via IoU threshold (prevents double-blur artifacts).
        4. Applies each merged region once.
        5. Strips ALL metadata by reconstructing image from raw pixels.
        6. Returns sanitized PNG bytes and list of applied regions.
        """
        img = decode_image_bytes(image_bytes)
        h, w = img.shape[:2]
        pending_regions: List[Dict[str, Any]] = []
        findings = findings or []

        # Convert selected_finding_ids to set of strings for O(1) lookup
        selected_ids_set = (
            {str(fid) for fid in selected_finding_ids}
            if selected_finding_ids is not None
            else None
        )

        # 1. Collect Detected Finding Regions
        for finding in findings:
            finding_id = str(finding.get("id", ""))
            finding_type = str(finding.get("finding_type", "UNKNOWN"))

            if selected_ids_set is not None and finding_id not in selected_ids_set:
                continue

            evidence = finding.get("evidence", {}) or {}
            bbox = evidence.get("bbox")

            if not bbox or len(bbox) < 4:
                continue

            mode = self.determine_mode(finding_type, finding_id, override_modes)

            pending_regions.append({
                "source": "finding",
                "finding_id": finding_id,
                "finding_type": finding_type,
                "bbox": [int(c) for c in bbox[:4]],
                "mode": mode,
                "masked_value": evidence.get("masked_value", ""),
            })

        # 2. Collect User Custom Rectangular Regions
        if custom_regions:
            for idx, custom_box in enumerate(custom_regions, start=1):
                bbox = custom_box.get("bbox", [])
                if not bbox or len(bbox) < 4:
                    continue

                mode = custom_box.get("mode", "blur")
                label = custom_box.get("label") or f"Custom Region #{idx}"

                pending_regions.append({
                    "source": "custom",
                    "finding_id": None,
                    "finding_type": "USER_CUSTOM_SELECTION",
                    "bbox": [int(c) for c in bbox[:4]],
                    "mode": mode,
                    "label": label,
                })

        # 3. IoU-based overlap merge — prevents layered blur artifacts
        applied_regions = merge_overlapping_bboxes_iou(pending_regions, iou_threshold=0.20)

        # 4. Apply each merged region once
        for region in applied_regions:
            bbox = region["bbox"]
            mode = region["mode"]
            img = self.apply_region(img, bbox, mode=mode, blur_kernel=blur_kernel)

        # 5. Strip ALL metadata via image pixel reconstruction (Check 4)
        sanitized_bytes = strip_exif_metadata(img)

        logger.info(
            f"SafeShare sanitized image generated: {len(applied_regions)} regions applied "
            f"(from {len(pending_regions)} pending → after IoU merge) "
            f"({len(sanitized_bytes)} bytes)",
            extra={"applied_regions_count": len(applied_regions)},
        )

        return sanitized_bytes, applied_regions


safeshare_engine = RedactionEngine()

