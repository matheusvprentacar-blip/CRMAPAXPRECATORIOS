from __future__ import annotations

from typing import Any

import cv2
import numpy as np
import pytesseract
from pytesseract import Output
from pytesseract.pytesseract import TesseractNotFoundError

from .common import normalize_lines, preprocess_for_tesseract, useful_text_density


FAST_TESSERACT_CONFIG = "--oem 1 --psm 6 -c preserve_interword_spaces=1"


def ocr_page_fast(image: np.ndarray, lang: str = "por+eng") -> dict[str, Any]:
    preprocessed = preprocess_for_tesseract(image)
    text = ""
    lines: list[str] = []
    confidences: list[float] = []
    warnings: list[str] = []
    method = "fast_tesseract"

    try:
        raw_text = pytesseract.image_to_string(preprocessed, lang=lang, config=FAST_TESSERACT_CONFIG)
        text = raw_text or ""
        lines = normalize_lines(text)

        data = pytesseract.image_to_data(
            preprocessed,
            lang=lang,
            config=FAST_TESSERACT_CONFIG,
            output_type=Output.DICT,
        )
        for conf_raw, token in zip(data.get("conf", []), data.get("text", [])):
            if not str(token).strip():
                continue
            try:
                conf_value = float(conf_raw)
            except Exception:
                continue
            if conf_value >= 0:
                confidences.append(conf_value)
    except TesseractNotFoundError:
        method = "fast_tesseract_unavailable"
        warnings.append("tesseract_not_found")
    except Exception as exc:  # pragma: no cover
        method = "fast_tesseract_error"
        warnings.append(f"fast_ocr_error:{exc}")

    mean_conf = float(sum(confidences) / len(confidences)) if confidences else 0.0
    char_count = len(text.strip())
    density = useful_text_density(text)
    return {
        "text": text.strip(),
        "lines": lines,
        "meta": {
            "engine_used": method,
            "mean_conf": round(mean_conf, 2),
            "char_count": char_count,
            "useful_density": round(density, 4),
            "warnings": warnings,
            "image_shape": list(preprocessed.shape),
        },
    }
