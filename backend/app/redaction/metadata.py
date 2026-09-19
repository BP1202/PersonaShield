import io
from typing import Optional, Union
import cv2
import numpy as np
from PIL import Image


def strip_exif_metadata(image_input: Union[bytes, np.ndarray, Image.Image]) -> bytes:
    """
    Strips all EXIF, GPS, device, camera, and maker metadata tags.
    Returns clean, optimized PNG image bytes with zero privacy leakage.
    """
    if isinstance(image_input, np.ndarray):
        # Image is an OpenCV BGR numpy array
        rgb_array = cv2.cvtColor(image_input, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(rgb_array)
    elif isinstance(image_input, bytes):
        with Image.open(io.BytesIO(image_input)) as raw_pil:
            # Recreate a fresh image buffer copying solely the pixel data
            pil_image = Image.new("RGB", raw_pil.size)
            pil_image.paste(raw_pil.convert("RGB"))
    elif isinstance(image_input, Image.Image):
        pil_image = Image.new("RGB", image_input.size)
        pil_image.paste(image_input.convert("RGB"))
    else:
        raise ValueError(f"Unsupported image input type: {type(image_input)}")

    # Save to PNG without any exif or info dictionary
    output_buffer = io.BytesIO()
    pil_image.save(
        output_buffer,
        format="PNG",
        optimize=True,
        # Explicitly omit any exif, icc_profile, or comments
    )
    return output_buffer.getvalue()


def has_exif_metadata(image_bytes: bytes) -> bool:
    """
    Inspects image bytes to detect whether any EXIF metadata dictionary is present.
    """
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            exif = img.getexif()
            return bool(exif and len(exif) > 0)
    except Exception:
        return False
