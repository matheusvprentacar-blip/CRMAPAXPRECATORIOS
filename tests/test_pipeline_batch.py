import json
from pathlib import Path

import fitz

from precatorio_ocr_pipeline.pipeline import PipelineConfig, run_pipeline


def _create_pdf(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text, fontsize=11)
    doc.save(path)
    doc.close()


def test_pipeline_process_batch(tmp_path: Path):
    pdf_dir = tmp_path / "pdfs"
    _create_pdf(
        pdf_dir / "doc_a.pdf",
        "OFICIO REQUISITORIO\nCREDOR: JOAO DA SILVA\nVALOR PRINCIPAL: R$ 1.234,56",
    )
    _create_pdf(
        pdf_dir / "doc_b.pdf",
        "TRIBUNAL: TJSP\nCPF: 529.982.247-25\nDATA DE EXPEDICAO: 01/01/2025",
    )

    out_path = tmp_path / "result.jsonl"
    config = PipelineConfig(
        inputs=[pdf_dir],
        out_path=out_path,
        recursive=False,
        workers=2,
        ocr_mode="auto",
        llm_enabled=False,
    )
    result = run_pipeline(config)

    assert result["processed"] == 2
    assert out_path.exists()
    lines = [line for line in out_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert len(lines) == 2

    rows = [json.loads(line) for line in lines]
    doc_ids = sorted(item["doc_id"] for item in rows)
    assert doc_ids == ["doc_a", "doc_b"]
