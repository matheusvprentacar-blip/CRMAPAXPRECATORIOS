from __future__ import annotations

import argparse
from pathlib import Path

from .pipeline import PipelineConfig, run_pipeline


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="precatorio_ocr_pipeline",
        description="Pipeline robusto de OCR/extração para precatórios brasileiros.",
    )
    parser.add_argument(
        "inputs",
        nargs="+",
        help="Arquivos PDF e/ou diretórios de entrada.",
    )
    parser.add_argument(
        "--out",
        default="out.jsonl",
        help="Arquivo JSONL de saída (padrão: out.jsonl).",
    )
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="Quando o input for diretório, busca PDFs em subpastas.",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Quantidade de workers para processamento paralelo (padrão: 1).",
    )
    parser.add_argument(
        "--ocr-mode",
        choices=["auto", "fast", "premium"],
        default="auto",
        help="Modo de OCR a usar.",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Ativa logging detalhado e salva evidências em disco.",
    )
    parser.add_argument(
        "--debug-dir",
        default="debug_artifacts",
        help="Diretório base para salvar evidências quando --debug estiver ativo.",
    )
    parser.add_argument(
        "--llm-enable",
        action="store_true",
        help="Ativa resolvedor LLM (stub) para campos faltantes/conflitos.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    config = PipelineConfig(
        inputs=[Path(item) for item in args.inputs],
        out_path=Path(args.out),
        recursive=bool(args.recursive),
        workers=max(1, int(args.workers)),
        ocr_mode=args.ocr_mode,
        debug=bool(args.debug),
        debug_dir=Path(args.debug_dir),
        llm_enabled=bool(args.llm_enable),
    )

    result = run_pipeline(config)
    print(
        f"[Pipeline] Processados={result['processed']} | Falhas={result['failed']} | "
        f"Output='{config.out_path}' | Tempo={result['elapsed_seconds']:.2f}s"
    )
    return 0 if result["failed"] == 0 else 1
