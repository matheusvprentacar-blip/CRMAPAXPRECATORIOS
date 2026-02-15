from __future__ import annotations

from pathlib import Path

import fitz

def detect_text_layer(pdf_path: Path) -> dict[str, object]:
    per_page_chars: list[int] = []
    with fitz.open(pdf_path) as doc:
        for page in doc:
            text = page.get_text("text") or ""
            per_page_chars.append(len(text.strip()))

    pages = len(per_page_chars)
    with_text = sum(1 for amount in per_page_chars if amount >= 20)
    ratio = (with_text / pages) if pages else 0.0
    has_text = ratio >= 0.5
    return {
        "has_text": has_text,
        "ratio": round(float(ratio), 4),
        "per_page_chars": per_page_chars,
    }


def extract_page_text_preview(pdf_path: Path, page_index: int = 0, max_chars: int = 300) -> str:
    with fitz.open(pdf_path) as doc:
        if page_index < 0 or page_index >= len(doc):
            return ""
        text = doc[page_index].get_text("text") or ""
    cleaned = " ".join(text.split())
    return cleaned[:max_chars]


def extract_text_layer_pages(pdf_path: Path) -> list[dict[str, object]]:
    pages: list[dict[str, object]] = []
    with fitz.open(pdf_path) as doc:
        for page_index, page in enumerate(doc):
            text = (page.get_text("text") or "").strip()
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            pages.append(
                {
                    "page": page_index + 1,
                    "text": text,
                    "lines": lines,
                    "meta": {
                        "engine_used": "text_layer",
                        "mean_conf": 100.0 if text else 0.0,
                        "char_count": len(text),
                        "useful_density": 1.0 if text else 0.0,
                    },
                }
            )
    return pages
