import io
from typing import Union
import cv2
import numpy as np
from PIL import Image


def strip_exif_metadata(image_input: Union[bytes, np.ndarray, Image.Image]) -> bytes:
    """
    Strips ALL metadata by recreating the image from raw pixel data only.
    This removes: EXIF, GPS, ICC profiles, orientation flags, thumbnails,
    MakerNotes, camera model, timestamps — only pixel RGB values are preserved.

    Strategy (Check 4): Decode pixels → brand-new RGB Image.new() → PNG.
    This is the safest approach: no metadata dictionary is ever copied.
    """
    if isinstance(image_input, np.ndarray):
        # BGR OpenCV array → PIL RGB
        rgb_array = cv2.cvtColor(image_input, cv2.COLOR_BGR2RGB)
        pil_src = Image.fromarray(rgb_array)
        width, height = pil_src.size
        raw_bytes = pil_src.tobytes()
    elif isinstance(image_input, bytes):
        with Image.open(io.BytesIO(image_input)) as raw:
            pil_src = raw.convert("RGB")
            width, height = pil_src.size
            raw_bytes = pil_src.tobytes()
    elif isinstance(image_input, Image.Image):
        pil_src = image_input.convert("RGB")
        width, height = pil_src.size
        raw_bytes = pil_src.tobytes()
    else:
        raise ValueError(f"Unsupported image input type: {type(image_input)}")

    # Recreate a completely fresh image with zero metadata inheritance
    clean_image = Image.frombytes("RGB", (width, height), raw_bytes)

    # Encode to PNG — lossless, deterministic, no EXIF container
    output_buffer = io.BytesIO()
    clean_image.save(output_buffer, format="PNG", optimize=True)
    return output_buffer.getvalue()


def has_exif_metadata(image_bytes: bytes) -> bool:
    """
    Inspects image bytes to detect whether any EXIF metadata is present.
    """
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            exif = img.getexif()
            return bool(exif and len(exif) > 0)
    except Exception:
        return False
