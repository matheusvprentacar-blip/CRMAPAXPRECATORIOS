from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


FIELD_NAMES = [
    "credor_nome",
    "advogado_nome",
    "valor_principal",
    "numero_precatorio",
    "numero_processo",
    "numero_oficio",
    "tribunal",
    "credor_cpf_cnpj",
    "natureza",
    "data_expedicao",
]


def make_empty_field() -> dict[str, Any]:
    return {
        "value": None,
        "confidence": 0.0,
        "source_page": None,
        "method": "missing",
        "evidence": None,
    }


def make_empty_fields() -> dict[str, dict[str, Any]]:
    return {name: make_empty_field() for name in FIELD_NAMES}


@dataclass
class TextLayerInfo:
    has_text: bool = False
    ratio: float = 0.0
    per_page_chars: list[int] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "has_text": self.has_text,
            "ratio": round(float(self.ratio), 4),
            "per_page_chars": list(self.per_page_chars),
        }


def build_base_result(doc_id: str, pdf_path: str) -> dict[str, Any]:
    return {
        "doc_id": doc_id,
        "file_path": pdf_path,
        "profile": "unknown",
        "text_layer": TextLayerInfo().as_dict(),
        "fields": make_empty_fields(),
        "warnings": [],
        "timings": {},
        "metrics": {
            "page_count": 0,
            "char_count_total": 0,
            "ocr_mode_requested": "auto",
            "ocr_mode_effective": None,
        },
    }
