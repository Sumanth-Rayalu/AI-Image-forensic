from transformers import pipeline
from PIL import Image, ExifTags, ImageChops, ImageEnhance
import hashlib
import numpy as np
import cv2
import io


MODEL_NAME = "dima806/ai_vs_real_image_detection"

print("Loading AI image detection model...")

classifier = pipeline(
    "image-classification",
    model=MODEL_NAME
)

print("AI image detection model loaded successfully!")


def analyze_image(image, original_bytes, image_format):

    # ==========================================
    # AI DETECTION
    # ==========================================

    results = classifier(image)

    prediction = max(
        results,
        key=lambda x: x["score"]
    )

    # ==========================================
    # IMAGE INFORMATION
    # ==========================================

    width, height = image.size
    mode = image.mode

    if image_format is None:
        image_format = "Unknown"

    # ==========================================
    # SHA-256
    # ==========================================

    file_hash = hashlib.sha256(
        original_bytes
    ).hexdigest()

    # ==========================================
    # EXIF METADATA
    # ==========================================

    exif_data = image.getexif()

    exif_metadata = {}

    for tag_id, value in exif_data.items():

        tag_name = ExifTags.TAGS.get(
            tag_id,
            str(tag_id)
        )

        try:
            exif_metadata[tag_name] = str(value)

        except Exception:
            exif_metadata[tag_name] = "Unavailable"

    # ==========================================
    # NUMPY IMAGE
    # ==========================================

    image_array = np.array(image)

    # ==========================================
    # GRAYSCALE
    # ==========================================

    gray = cv2.cvtColor(
        image_array,
        cv2.COLOR_RGB2GRAY
    )

    # ==========================================
    # BRIGHTNESS
    # ==========================================

    brightness = float(
        np.mean(gray)
    )

    # ==========================================
    # CONTRAST
    # ==========================================

    contrast = float(
        np.std(gray)
    )

    # ==========================================
    # NOISE ESTIMATION
    # ==========================================

    blurred = cv2.GaussianBlur(
        gray,
        (3, 3),
        0
    )

    noise = (
        gray.astype(np.float32)
        -
        blurred.astype(np.float32)
    )

    noise_level = float(
        np.std(noise)
    )

    # ==========================================
    # EDGE ANALYSIS
    # ==========================================

    edges = cv2.Canny(
        gray,
        100,
        200
    )

    edge_pixels = np.count_nonzero(edges)

    total_pixels = (
        edges.shape[0] *
        edges.shape[1]
    )

    edge_density = (
        edge_pixels /
        total_pixels
    )

    # ==========================================
    # ELA ANALYSIS
    # ==========================================

    ela_image = None

    try:

        # ELA is primarily useful for JPEG images.
        # Recompress image at a controlled quality.

        if image_format.upper() in ["JPEG", "JPG"]:

            buffer = io.BytesIO()

            image.save(
                buffer,
                format="JPEG",
                quality=90
            )

            buffer.seek(0)

            recompressed = Image.open(
                buffer
            ).convert("RGB")

            # Difference between original
            # and recompressed image

            difference = ImageChops.difference(
                image,
                recompressed
            )

            # Increase visibility of differences

            extrema = difference.getextrema()

            max_difference = max(
                value[1]
                for value in extrema
            )

            if max_difference == 0:
                max_difference = 1

            scale = 255.0 / max_difference

            ela_image = ImageEnhance.Brightness(
                difference
            ).enhance(scale)

    except Exception as e:

        print(
            "ELA analysis error:",
            e
        )

    # ==========================================
    # FORENSIC INFORMATION
    # ==========================================

    forensic_data = {

        "width": width,

        "height": height,

        "format": image_format,

        "mode": mode,

        "has_exif": len(exif_metadata) > 0,

        "exif": exif_metadata,

        "sha256": file_hash,

        "brightness": round(
            brightness,
            2
        ),

        "contrast": round(
            contrast,
            2
        ),

        "noise_level": round(
            noise_level,
            2
        ),

        "edge_density": round(
            edge_density,
            4
        ),

        "ela_available": (
            ela_image is not None
        )

    }

    return {

        "prediction": prediction,

        "results": results,

        "forensics": forensic_data,

        "ela_image": ela_image

    }