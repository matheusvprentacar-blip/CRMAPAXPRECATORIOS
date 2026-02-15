from __future__ import annotations

import re
from pathlib import Path
from typing import Iterator

import cv2
import fitz
import numpy as np


def render_pdf_pages(pdf_path: Path, dpi: int = 280) -> Iterator[tuple[int, np.ndarray]]:
    scale = max(72, int(dpi)) / 72.0
    matrix = fitz.Matrix(scale, scale)
    with fitz.open(pdf_path) as doc:
        for page_index, page in enumerate(doc):
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
            if pix.n == 4:
                img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
            else:
                img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            yield page_index, img


def preprocess_for_tesseract(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, None, 15, 7, 21)
    blur = cv2.GaussianBlur(denoised, (3, 3), 0)
    binary = cv2.adaptiveThreshold(
        blur,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        15,
    )
    return binary


def normalize_lines(text: str) -> list[str]:
    lines = []
    for raw in text.splitlines():
        clean = " ".join(raw.strip().split())
        if clean:
            lines.append(clean)
    return lines


def useful_text_density(text: str) -> float:
    if not text:
        return 0.0
    useful_chars = len(re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿ0-9]", text))
    return useful_chars / max(1, len(text))
