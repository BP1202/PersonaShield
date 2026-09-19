import re
import unicodedata
from typing import Any, Dict, List, NamedTuple, Tuple
import numpy as np

from backend.app.core.logging import logger


class OcrToken(NamedTuple):
    text: str
    confidence: float
    bbox: List[int]  # [x1, y1, x2, y2]
    page_number: int


class OcrExtractionResult(NamedTuple):
    raw_text: str
    normalized_text: str
    tokens: List[OcrToken]


def normalize_ocr_text(text: str) -> str:
    """
    Applies defensive Unicode normalization and control character stripping:
    - Normalizes Unicode using NFKC compatibility decomposition & composition.
    - Strips non-printable ASCII and Unicode C0/C1 control characters.
    - Normalizes excessive whitespace while preserving structure.
    """
    if not text:
        return ""

    # 1. Unicode NFKC normalization
    nfkc_text = unicodedata.normalize("NFKC", text)

    # 2. Strip non-printable control characters (except newline \n and tab \t)
    clean_text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", nfkc_text)

    # 3. Clean up carriage returns and trailing spaces
    clean_text = clean_text.replace("\r\n", "\n").replace("\r", "\n")

    return clean_text.strip()


def polygon_to_bbox(coord_list: List[Any]) -> List[int]:
    """
    Converts EasyOCR 4-point polygon [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    to standard bounding box [min_x, min_y, max_x, max_y].
    """
    if not coord_list:
        return [0, 0, 0, 0]

    try:
        pts = np.array(coord_list, dtype=np.int32)
        min_x = int(np.min(pts[:, 0]))
        min_y = int(np.min(pts[:, 1]))
        max_x = int(np.max(pts[:, 0]))
        max_y = int(np.max(pts[:, 1]))
        return [max(0, min_x), max(0, min_y), max(0, max_x), max(0, max_y)]
    except Exception:
        return [0, 0, 0, 0]


class OcrEngine:
    """
    Local OCR extraction engine powered by EasyOCR.
    """

    def __init__(self, languages: List[str] = None, gpu: bool = False):
        self.languages = languages or ["en"]
        self.gpu = gpu
        self._reader = None

    @property
    def reader(self):
        """Lazy-loaded EasyOCR reader instance."""
        if self._reader is None:
            try:
                import easyocr
                logger.info(f"Initializing EasyOCR Reader (languages={self.languages}, gpu={self.gpu})")
                self._reader = easyocr.Reader(self.languages, gpu=self.gpu)
            except Exception as e:
                logger.error(f"Failed to load EasyOCR: {e}")
                raise e
        return self._reader

    def extract_from_pages(self, pages: List[np.ndarray]) -> OcrExtractionResult:
        """
        Executes OCR extraction across preprocessed image pages.
        Returns combined raw text, normalized text, and token bounding boxes.
        """
        all_tokens: List[OcrToken] = []
        raw_lines: List[str] = []

        for page_idx, page_img in enumerate(pages, start=1):
            try:
                results = self.reader.readtext(page_img)
            except Exception as e:
                logger.error(f"EasyOCR extraction failed on page {page_idx}: {e}")
                results = []

            for item in results:
                # EasyOCR returns: (bbox_polygon, text, confidence)
                if len(item) >= 3:
                    polygon, text, conf = item[0], item[1], float(item[2])
                elif len(item) == 2:
                    polygon, text = item[0], item[1]
                    conf = 1.0
                else:
                    continue

                text_str = str(text).strip()
                if not text_str:
                    continue

                bbox = polygon_to_bbox(polygon)
                token = OcrToken(
                    text=text_str,
                    confidence=round(conf, 4),
                    bbox=bbox,
                    page_number=page_idx,
                )
                all_tokens.append(token)
                raw_lines.append(text_str)

        raw_text = "\n".join(raw_lines)
        normalized_text = normalize_ocr_text(raw_text)

        return OcrExtractionResult(
            raw_text=raw_text,
            normalized_text=normalized_text,
            tokens=all_tokens,
        )


ocr_engine = OcrEngine()
