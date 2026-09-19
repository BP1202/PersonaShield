import io
import os
from pathlib import Path
from typing import List, Union
import cv2
import numpy as np
from PIL import Image
from pypdf import PdfReader

from backend.app.core.exceptions import CorruptedFileSignatureError, SecurityValidationError
from backend.app.core.logging import logger


class ImagePreprocessor:
    """
    OpenCV-based image preprocessor for document and screenshot enhancement.
    Applies grayscale conversion, noise reduction, and adaptive contrast enhancement (CLAHE).
    """

    def __init__(self, clip_limit: float = 2.0, tile_grid_size: tuple = (8, 8)):
        self.clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)

    def preprocess_image(self, img_bytes: bytes, max_dimension: int = 2400) -> np.ndarray:
        """
        Preprocesses raw image bytes directly: decoding, aspect ratio downscaling,
        grayscale conversion, denoising, and CLAHE contrast enhancement.
        """
        if not img_bytes:
            raise ValueError("Image bytes cannot be empty")

        file_bytes = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

        if img is None:
            try:
                import io
                with Image.open(io.BytesIO(img_bytes)) as pil_img:
                    converted = pil_img.convert("RGB")
                    img = cv2.cvtColor(np.array(converted), cv2.COLOR_RGB2BGR)
            except Exception as e:
                raise ValueError(f"Failed to decode image: {e}")

        # Downscale if exceeds max_dimension
        h, w = img.shape[:2]
        if max(h, w) > max_dimension:
            scale = max_dimension / max(h, w)
            new_w, new_h = int(w * scale), int(h * scale)
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

        return self.preprocess_image_array(img)

    def preprocess_pdf(self, pdf_bytes: bytes) -> List[np.ndarray]:
        """
        Preprocesses raw PDF bytes into enhanced grayscale page arrays.
        """
        if not pdf_bytes:
            raise ValueError("PDF bytes cannot be empty")

        import io
        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages_images = []

        for page in reader.pages:
            page_extracted = False
            if hasattr(page, "images") and page.images:
                for img_file in page.images:
                    try:
                        pil_img = Image.open(io.BytesIO(img_file.data)).convert("RGB")
                        cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
                        pages_images.append(self.preprocess_image_array(cv_img))
                        page_extracted = True
                        break
                    except Exception:
                        continue

            if not page_extracted:
                fallback_canvas = np.ones((800, 600, 3), dtype=np.uint8) * 255
                pages_images.append(self.preprocess_image_array(fallback_canvas))

        if not pages_images:
            raise ValueError("PDF has no readable pages")

        return pages_images

    def preprocess_image_array(self, img_array: np.ndarray) -> np.ndarray:
        """
        Enhances a BGR or grayscale numpy image array for OCR extraction.
        """
        if img_array is None or img_array.size == 0:
            raise CorruptedFileSignatureError("Image array is empty or unreadable")

        # 1. Convert to grayscale if 3-channel
        if len(img_array.shape) == 3 and img_array.shape[2] == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
        elif len(img_array.shape) == 3 and img_array.shape[2] == 4:
            gray = cv2.cvtColor(img_array, cv2.COLOR_BGRA2GRAY)
        else:
            gray = img_array.copy()

        # 2. Denoise with median blur
        denoised = cv2.medianBlur(gray, 3)

        # 3. Apply CLAHE for contrast enhancement
        enhanced = self.clahe.apply(denoised)

        return enhanced

    def load_and_preprocess(self, file_path: Union[str, Path]) -> List[np.ndarray]:
        """
        Loads an artifact from disk (image or PDF) and returns preprocessed image arrays (one per page).
        """
        path = Path(file_path)
        if not path.exists() or path.stat().st_size == 0:
            raise CorruptedFileSignatureError(f"Artifact file not found or empty: {path.name}")

        ext = path.suffix.lower()

        if ext == ".pdf":
            return self._load_pdf_pages(path)
        elif ext in (".png", ".jpg", ".jpeg", ".webp"):
            return [self._load_single_image(path)]
        else:
            raise SecurityValidationError(f"Unsupported file format for OCR: {ext}")

    def _load_single_image(self, path: Path) -> np.ndarray:
        """Loads and decodes a single raster image file using OpenCV / Pillow."""
        # Using cv2.imdecode with numpy to safely handle non-ASCII / Unicode paths on Windows
        try:
            with open(path, "rb") as f:
                file_bytes = np.frombuffer(f.read(), dtype=np.uint8)
            img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        except Exception as e:
            logger.error(f"Failed to read image via OpenCV: {e}")
            img = None

        if img is None:
            # Fallback to Pillow
            try:
                with Image.open(path) as pil_img:
                    converted = pil_img.convert("RGB")
                    img = cv2.cvtColor(np.array(converted), cv2.COLOR_RGB2BGR)
            except Exception as e:
                raise CorruptedFileSignatureError(f"Failed to decode image file {path.name}: {e}")

        return self.preprocess_image_array(img)

    def _load_pdf_pages(self, path: Path) -> List[np.ndarray]:
        """
        Extracts pages from a PDF document.
        Uses embedded page images where available, or synthesizes high-contrast grayscale arrays.
        """
        try:
            reader = PdfReader(str(path))
            pages_images = []

            for page_idx, page in enumerate(reader.pages):
                # Try extracting embedded images from page
                page_extracted = False
                if hasattr(page, "images") and page.images:
                    for img_file in page.images:
                        try:
                            pil_img = Image.open(io.BytesIO(img_file.data)).convert("RGB")
                            cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
                            pages_images.append(self.preprocess_image_array(cv_img))
                            page_extracted = True
                            break
                        except Exception:
                            continue

                if not page_extracted:
                    # Fallback: create blank canvas for text-only PDF extraction fallback
                    fallback_canvas = np.ones((800, 600, 3), dtype=np.uint8) * 255
                    pages_images.append(self.preprocess_image_array(fallback_canvas))

            if not pages_images:
                raise CorruptedFileSignatureError("PDF document has no readable pages")

            return pages_images
        except Exception as e:
            if isinstance(e, CorruptedFileSignatureError):
                raise
            raise CorruptedFileSignatureError(f"Failed to parse PDF document {path.name}: {e}")


image_preprocessor = ImagePreprocessor()
ocr_preprocessor = image_preprocessor

