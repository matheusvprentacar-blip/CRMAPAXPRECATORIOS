from __future__ import annotations

import os
from typing import Any

import numpy as np

from .common import normalize_lines, useful_text_density

os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")

_PADDLE_INSTANCE = None
_RAPID_INSTANCE = None


def _ocr_with_paddle(image: np.ndarray) -> tuple[str, list[float], str]:
    global _PADDLE_INSTANCE
    if _PADDLE_INSTANCE is None:
        from paddleocr import PaddleOCR

        _PADDLE_INSTANCE = PaddleOCR(use_angle_cls=True, lang="pt", show_log=False)

    result = _PADDLE_INSTANCE.ocr(image, cls=True) or []
    chunks: list[str] = []
    scores: list[float] = []
    for page in result:
        if not page:
            continue
        for item in page:
            if len(item) < 2:
                continue
            text_score = item[1]
            if not isinstance(text_score, (list, tuple)) or len(text_score) < 2:
                continue
            text = str(text_score[0]).strip()
            score = float(text_score[1])
            if text:
                chunks.append(text)
                scores.append(score * 100.0)
    return "\n".join(chunks), scores, "premium_paddleocr"


def _ocr_with_easyocr(image: np.ndarray) -> tuple[str, list[float], str]:
    import easyocr  # type: ignore

    reader = easyocr.Reader(["pt", "en"], gpu=False, verbose=False)
    result = reader.readtext(image)
    chunks: list[str] = []
    scores: list[float] = []
    for item in result:
        if len(item) < 3:
            continue
        text = str(item[1]).strip()
        score = float(item[2])
        if text:
            chunks.append(text)
            scores.append(score * 100.0)
    return "\n".join(chunks), scores, "premium_easyocr"


def _ocr_with_rapidocr(image: np.ndarray) -> tuple[str, list[float], str]:
    global _RAPID_INSTANCE
    if _RAPID_INSTANCE is None:
        from rapidocr_onnxruntime import RapidOCR

        _RAPID_INSTANCE = RapidOCR()

    result, _ = _RAPID_INSTANCE(image)
    result = result or []
    chunks: list[str] = []
    scores: list[float] = []
    for item in result:
        if len(item) < 3:
            continue
        text = str(item[1]).strip()
        score = float(item[2])
        if text:
            chunks.append(text)
            scores.append(score * 100.0)
    return "\n".join(chunks), scores, "premium_rapidocr"


def ocr_page_premium(image: np.ndarray) -> dict[str, Any]:
    warnings: list[str] = []
    text = ""
    scores: list[float] = []
    engine_used = "premium_unavailable"

    # ordem: PaddleOCR -> EasyOCR -> RapidOCR
    handlers = (_ocr_with_paddle, _ocr_with_easyocr, _ocr_with_rapidocr)
    for handler in handlers:
        try:
            text, scores, engine_used = handler(image)
            break
        except Exception as exc:
            warnings.append(f"{handler.__name__}_failed:{exc}")

    lines = normalize_lines(text)
    mean_conf = float(sum(scores) / len(scores)) if scores else 0.0
    density = useful_text_density(text)

    return {
        "text": text.strip(),
        "lines": lines,
        "meta": {
            "engine_used": engine_used,
            "mean_conf": round(mean_conf, 2),
            "char_count": len(text.strip()),
            "useful_density": round(density, 4),
            "warnings": warnings,
        },
    }
