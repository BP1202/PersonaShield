import re
from typing import Any, Dict, List, NamedTuple, Optional, Tuple
from presidio_analyzer import AnalyzerEngine

from backend.app.detection.regex_detectors import RegexMatch, regex_detector_engine
from backend.app.ocr.engine import OcrToken


class ExtractedEntity(NamedTuple):
    category: str
    entity_type: str
    text_snippet: str
    confidence: float
    bbox: List[int]
    page_number: int


# Presidio entity type to PersonaShield category mapping
PRESIDIO_CATEGORY_MAP: Dict[str, str] = {
    "PERSON": "IDENTITY",
    "PHONE_NUMBER": "PRIVACY",
    "EMAIL_ADDRESS": "PRIVACY",
    "CREDIT_CARD": "FINANCIAL",
    "CRYPTO": "FINANCIAL",
    "IBAN_CODE": "FINANCIAL",
    "LOCATION": "PRIVACY",
    "DATE_TIME": "PRIVACY",
}


Tuple_Bbox_Page = Tuple[List[int], int]


def compute_union_bbox(boxes: List[List[int]]) -> List[int]:
    """Computes the enclosing bounding box [min_x, min_y, max_x, max_y] of multiple boxes."""
    if not boxes:
        return [0, 0, 0, 0]
    min_x = min(b[0] for b in boxes)
    min_y = min(b[1] for b in boxes)
    max_x = max(b[2] for b in boxes)
    max_y = max(b[3] for b in boxes)
    return [min_x, min_y, max_x, max_y]


def find_entity_bbox(entity_text: str, tokens: List[OcrToken]) -> Tuple_Bbox_Page:
    """
    Locates the OCR tokens that contain or compose the entity text
    and returns the enclosing bounding box and page number.
    """
    cleaned_entity = re.sub(r"\s+", "", entity_text.lower())
    if not cleaned_entity:
        return [0, 0, 0, 0], 1

    matched_boxes = []
    page = 1

    # 1. Direct single-token match or substring
    for token in tokens:
        cleaned_tok = re.sub(r"\s+", "", token.text.lower())
        if cleaned_entity in cleaned_tok or cleaned_tok in cleaned_entity:
            matched_boxes.append(token.bbox)
            page = token.page_number

    if matched_boxes:
        return compute_union_bbox(matched_boxes), page

    # 2. Sequential multi-token search
    running_str = ""
    curr_boxes = []
    for token in tokens:
        cleaned_tok = re.sub(r"\s+", "", token.text.lower())
        running_str += cleaned_tok
        curr_boxes.append(token.bbox)

        if cleaned_entity in running_str:
            return compute_union_bbox(curr_boxes), token.page_number

        if len(running_str) > len(cleaned_entity) * 3:
            running_str = ""
            curr_boxes = []

    # Fallback to first token box or default
    if tokens:
        return tokens[0].bbox, tokens[0].page_number
    return [0, 0, 0, 0], 1


class EntityExtractorEngine:
    """
    Comprehensive entity extraction engine combining Microsoft Presidio
    and deterministic cybersecurity regex detectors with OCR bounding box mapping.
    """

    def __init__(self):
        self._presidio_analyzer = None

    @property
    def presidio(self) -> AnalyzerEngine:
        """Lazy-loaded Presidio analyzer engine."""
        if self._presidio_analyzer is None:
            # Initialize with default recognizers
            self._presidio_analyzer = AnalyzerEngine()
        return self._presidio_analyzer

    def extract_entities(
        self, text: str, tokens: List[OcrToken]
    ) -> List[ExtractedEntity]:
        """
        Extracts sensitive entities from normalized OCR text and maps them
        to evidence bounding boxes.
        """
        if not text or not text.strip():
            return []

        results: List[ExtractedEntity] = []
        spans_seen = set()

        # 1. Run deterministic Regex Detectors (Highest priority)
        regex_matches: List[RegexMatch] = regex_detector_engine.detect_entities(text)
        for rm in regex_matches:
            span_key = (rm.start_char, rm.end_char)
            spans_seen.add(span_key)

            bbox, page = find_entity_bbox(rm.text_snippet, tokens)
            results.append(
                ExtractedEntity(
                    category=rm.category,
                    entity_type=rm.entity_type,
                    text_snippet=rm.text_snippet,
                    confidence=rm.confidence,
                    bbox=bbox,
                    page_number=page,
                )
            )

        # 2. Run Microsoft Presidio for general PII (Person names, Credit Cards, etc.)
        try:
            presidio_results = self.presidio.analyze(
                text=text,
                language="en",
                score_threshold=0.6,
            )

            for pr in presidio_results:
                # Avoid duplicates if regex detector already matched this span
                if any(
                    abs(pr.start - s[0]) < 3 and abs(pr.end - s[1]) < 3
                    for s in spans_seen
                ):
                    continue

                snippet = text[pr.start : pr.end].strip()
                if not snippet:
                    continue

                category = PRESIDIO_CATEGORY_MAP.get(pr.entity_type, "PRIVACY")
                bbox, page = find_entity_bbox(snippet, tokens)

                results.append(
                    ExtractedEntity(
                        category=category,
                        entity_type=pr.entity_type,
                        text_snippet=snippet,
                        confidence=round(float(pr.score), 4),
                        bbox=bbox,
                        page_number=page,
                    )
                )
        except Exception as e:
            # Continue gracefully even if Presidio NLP encounter issues
            pass

        return results


entity_extractor_engine = EntityExtractorEngine()
