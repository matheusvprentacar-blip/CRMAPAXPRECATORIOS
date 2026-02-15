from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from .common import render_pdf_pages
from .engine_fast import ocr_page_fast
from .engine_premium import ocr_page_premium


def _cache_key(pdf_path: Path, page_index: int, engine_name: str, dpi: int) -> str:
    stat = pdf_path.stat()
    payload = f"{pdf_path.resolve()}|{stat.st_mtime_ns}|{stat.st_size}|p={page_index}|e={engine_name}|dpi={dpi}"
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()


def _load_cache(cache_path: Path) -> dict[str, Any] | None:
    if not cache_path.exists():
        return None
    try:
        return json.loads(cache_path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _save_cache(cache_path: Path, payload: dict[str, Any]) -> None:
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def _is_fast_quality_poor(meta: dict[str, Any]) -> bool:
    char_count = int(meta.get("char_count", 0))
    mean_conf = float(meta.get("mean_conf", 0.0))
    useful_density = float(meta.get("useful_density", 0.0))
    return char_count < 80 or mean_conf < 45.0 or useful_density < 0.30


def _run_engine_with_cache(
    pdf_path: Path,
    page_index: int,
    image,
    engine: str,
    cache_dir: Path,
    dpi: int,
) -> dict[str, Any]:
    key = _cache_key(pdf_path, page_index, engine_name=engine, dpi=dpi)
    cache_path = cache_dir / f"{key}.json"
    cached = _load_cache(cache_path)
    if cached is not None:
        cached.setdefault("meta", {})
        cached["meta"]["cache_hit"] = True
        return cached

    if engine == "fast":
        result = ocr_page_fast(image)
    elif engine == "premium":
        result = ocr_page_premium(image)
    else:
        raise ValueError(f"Engine inválida: {engine}")

    result.setdefault("meta", {})
    result["meta"]["cache_hit"] = False
    _save_cache(cache_path, result)
    return result


def ocr_pages(
    pdf_path: Path | str,
    mode: str = "auto",
    cache_dir: Path | str = ".ocr_cache",
    dpi: int = 280,
) -> list[dict[str, Any]]:
    pdf_path = Path(pdf_path).resolve()
    cache_dir = Path(cache_dir)
    mode = mode.lower().strip()
    if mode not in {"auto", "fast", "premium"}:
        raise ValueError("mode deve ser auto|fast|premium")

    pages: list[dict[str, Any]] = []
    for page_index, image in render_pdf_pages(pdf_path, dpi=dpi):
        if mode == "fast":
            picked = _run_engine_with_cache(pdf_path, page_index, image, "fast", cache_dir, dpi)
        elif mode == "premium":
            picked = _run_engine_with_cache(pdf_path, page_index, image, "premium", cache_dir, dpi)
        else:
            fast = _run_engine_with_cache(pdf_path, page_index, image, "fast", cache_dir, dpi)
            if _is_fast_quality_poor(fast.get("meta", {})):
                premium = _run_engine_with_cache(pdf_path, page_index, image, "premium", cache_dir, dpi)
                picked = premium
                picked.setdefault("meta", {})
                picked["meta"]["fallback_from_fast"] = True
                picked["meta"]["fast_meta"] = fast.get("meta", {})
            else:
                picked = fast
                picked.setdefault("meta", {})
                picked["meta"]["fallback_from_fast"] = False

        pages.append(
            {
                "page": page_index + 1,
                "text": picked.get("text", ""),
                "lines": picked.get("lines", []),
                "meta": picked.get("meta", {}),
            }
        )
    return pages
