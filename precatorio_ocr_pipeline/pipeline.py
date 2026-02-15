from __future__ import annotations

import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .io_utils import resolve_pdf_inputs
from .llm_resolver import StubLLMClient, resolve_ambiguities
from .log_utils import configure_logging
from .ocr.router import ocr_pages
from .parsers.extractor import extract_fields
from .pdf_utils import detect_text_layer, extract_text_layer_pages
from .schemas import build_base_result
from .validators import finalize_validation

logger = logging.getLogger(__name__)


@dataclass
class PipelineConfig:
    inputs: list[Path]
    out_path: Path
    recursive: bool = False
    workers: int = 1
    ocr_mode: str = "auto"
    debug: bool = False
    debug_dir: Path = Path("debug_artifacts")
    llm_enabled: bool = False


def _now() -> float:
    return time.perf_counter()


def _process_one(pdf_path: Path, config: PipelineConfig) -> dict[str, Any]:
    doc_id = pdf_path.stem
    started = _now()
    result = build_base_result(doc_id=doc_id, pdf_path=str(pdf_path))
    result["metrics"]["ocr_mode_requested"] = config.ocr_mode

    try:
        stage_start = _now()
        text_layer = detect_text_layer(pdf_path)
        result["text_layer"] = text_layer
        per_page_chars = text_layer.get("per_page_chars", [])
        result["metrics"]["page_count"] = len(per_page_chars)
        result["metrics"]["char_count_total"] = int(sum(int(value) for value in per_page_chars))
        result["timings"]["detect_text_layer_s"] = round(_now() - stage_start, 4)

        stage_start = _now()
        has_text_layer = bool(text_layer.get("has_text"))
        if config.ocr_mode == "auto" and has_text_layer:
            pages_data = extract_text_layer_pages(pdf_path)
            effective_mode = "text_layer"
        else:
            pages_data = ocr_pages(
                pdf_path,
                mode=config.ocr_mode,
                cache_dir=config.debug_dir / "ocr_cache",
            )
            effective_mode = config.ocr_mode

        result["timings"]["ocr_s"] = round(_now() - stage_start, 4)
        engines_used = sorted(
            {
                str(page.get("meta", {}).get("engine_used"))
                for page in pages_data
                if isinstance(page, dict)
            }
        )
        result["metrics"]["ocr_mode_effective"] = effective_mode
        result["metrics"]["engines_used"] = engines_used
        result["metrics"]["ocr_pages"] = len(pages_data)
        ocr_char_count_total = 0
        for page in pages_data:
            page_meta = page.get("meta", {}) if isinstance(page, dict) else {}
            if not isinstance(page_meta, dict):
                continue
            try:
                ocr_char_count_total += int(page_meta.get("char_count", 0) or 0)
            except (TypeError, ValueError):
                continue
        if ocr_char_count_total > 0:
            result["metrics"]["char_count_total"] = ocr_char_count_total
        result["debug_preview"] = {
            "page_1_lines": (pages_data[0].get("lines", []) if pages_data else [])[:10],
            "page_1_char_count": int((pages_data[0].get("meta", {}) or {}).get("char_count", 0)) if pages_data else 0,
        }

        stage_start = _now()
        extracted = extract_fields(pages_data)
        result["profile"] = extracted.get("profile", "unknown")
        result["fields"] = extracted.get("fields", result["fields"])
        result["warnings"].extend(extracted.get("warnings", []))
        result["timings"]["parse_s"] = round(_now() - stage_start, 4)

        stage_start = _now()
        llm_result = resolve_ambiguities(
            pages=pages_data,
            fields=result["fields"],
            warnings=result["warnings"],
            llm_enabled=config.llm_enabled,
            llm_client=StubLLMClient() if config.llm_enabled else None,
        )
        result["warnings"].extend(llm_result.get("warnings", []))
        result["metrics"]["llm_used"] = bool(llm_result.get("used"))
        result["metrics"]["llm_updated_fields"] = llm_result.get("updated_fields", [])
        result["timings"]["llm_s"] = round(_now() - stage_start, 4)

        stage_start = _now()
        validated_fields, validation_warnings = finalize_validation(result["fields"], pages_data)
        result["fields"] = validated_fields
        result["warnings"].extend(validation_warnings)
        result["warnings"] = sorted(set(str(item) for item in result["warnings"] if item))
        result["timings"]["validate_s"] = round(_now() - stage_start, 4)

        result["timings"]["total_s"] = round(_now() - started, 4)
        logger.info(
            "doc_id=%s | profile=%s | text_layer=%s ratio=%.2f | ocr_mode=%s | engines=%s | pages=%d | t_total=%.2fs",
            doc_id,
            result["profile"],
            bool(text_layer.get("has_text")),
            float(text_layer.get("ratio", 0.0)),
            effective_mode,
            ",".join(engines_used) if engines_used else "none",
            result["metrics"]["page_count"],
            result["timings"]["total_s"],
        )
        return result
    except Exception as exc:  # pragma: no cover - fallback de robustez
        result["warnings"].append(f"processing_error: {exc}")
        result["timings"]["total_s"] = round(_now() - started, 4)
        logger.exception("doc_id=%s | erro no processamento", doc_id)
        return result


def _write_jsonl(records: list[dict[str, Any]], out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as fp:
        for item in records:
            fp.write(json.dumps(item, ensure_ascii=False) + "\n")


def run_pipeline(config: PipelineConfig) -> dict[str, Any]:
    configure_logging(config.debug)
    started = _now()
    files = resolve_pdf_inputs(config.inputs, recursive=config.recursive)
    if not files:
        raise FileNotFoundError("Nenhum PDF encontrado nos inputs informados.")

    logger.info("Arquivos de entrada resolvidos: %d", len(files))

    records: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=config.workers) as executor:
        futures = {executor.submit(_process_one, pdf_path, config): pdf_path for pdf_path in files}
        for future in as_completed(futures):
            records.append(future.result())

    records.sort(key=lambda item: item["file_path"])
    _write_jsonl(records, config.out_path)

    failed = sum(1 for item in records if any("processing_error" in warn for warn in item["warnings"]))
    elapsed = _now() - started
    return {
        "processed": len(records),
        "failed": failed,
        "elapsed_seconds": round(elapsed, 4),
    }
