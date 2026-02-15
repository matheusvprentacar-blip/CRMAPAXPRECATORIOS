from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Any

from precatorio_ocr_pipeline.pipeline import PipelineConfig, run_pipeline
from precatorio_ocr_pipeline.schemas import FIELD_NAMES


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        rows.append(json.loads(line))
    return rows


def norm(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text.lower()


def evaluate(ground_truth: list[dict[str, Any]], predicted: list[dict[str, Any]], threshold: float) -> dict[str, Any]:
    pred_map = {row["doc_id"]: row for row in predicted}

    total = 0
    correct = 0
    full_docs = 0
    per_field = defaultdict(lambda: {"tp": 0, "fp": 0, "fn": 0, "support": 0})

    for gt in ground_truth:
        doc_id = gt["doc_id"]
        pred = pred_map.get(doc_id, {})
        pred_fields = pred.get("fields", {})
        gt_fields = gt.get("fields", {})

        doc_complete = True
        for field in FIELD_NAMES:
            gt_value = norm(gt_fields.get(field))
            pred_obj = pred_fields.get(field, {})
            pred_conf = float(pred_obj.get("confidence", 0.0) or 0.0)
            pred_value = norm(pred_obj.get("value")) if pred_conf >= threshold else None

            if not pred_value:
                doc_complete = False

            if gt_value is not None:
                total += 1
                per_field[field]["support"] += 1
                if pred_value == gt_value:
                    correct += 1
                    per_field[field]["tp"] += 1
                elif pred_value is None:
                    per_field[field]["fn"] += 1
                else:
                    per_field[field]["fp"] += 1
                    per_field[field]["fn"] += 1
            else:
                if pred_value is not None:
                    per_field[field]["fp"] += 1

        if doc_complete:
            full_docs += 1

    field_metrics: dict[str, dict[str, float]] = {}
    for field, stats in per_field.items():
        tp = stats["tp"]
        fp = stats["fp"]
        fn = stats["fn"]
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        field_metrics[field] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "support": int(stats["support"]),
        }

    accuracy = (correct / total) if total else 0.0
    completeness = (full_docs / len(ground_truth)) if ground_truth else 0.0
    return {
        "field_level_accuracy": round(accuracy, 4),
        "document_completeness_rate": round(completeness, 4),
        "field_metrics": field_metrics,
        "documents_evaluated": len(ground_truth),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Avaliação em lote do pipeline de OCR.")
    parser.add_argument("--ground-truth", required=True, help="Arquivo JSONL com ground truth.")
    parser.add_argument("--pdf-dir", required=True, help="Diretório com PDFs de avaliação.")
    parser.add_argument("--out", default="tmp/eval_predictions.jsonl", help="JSONL de predições gerado no run.")
    parser.add_argument("--threshold", type=float, default=0.0, help="Threshold mínimo de confiança para considerar campo.")
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--ocr-mode", default="auto", choices=["auto", "fast", "premium"])
    args = parser.parse_args()

    out_path = Path(args.out)
    config = PipelineConfig(
        inputs=[Path(args.pdf_dir)],
        out_path=out_path,
        recursive=True,
        workers=max(1, args.workers),
        ocr_mode=args.ocr_mode,
        debug=False,
        llm_enabled=False,
    )
    run_pipeline(config)

    gt = load_jsonl(Path(args.ground_truth))
    pred = load_jsonl(out_path)
    report = evaluate(gt, pred, threshold=float(args.threshold))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
