from __future__ import annotations

import re
from typing import Any

from .parsers.legal_validators import (
    is_valid_cnj,
    is_valid_cpf_cnpj,
    only_digits,
    parse_brl_to_decimal,
    parse_date_to_iso,
)
from .schemas import FIELD_NAMES

CNJ_PATTERN = re.compile(r"\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b")


def _ensure_field_shape(fields: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for name in FIELD_NAMES:
        src = fields.get(name, {}) if isinstance(fields.get(name), dict) else {}
        out[name] = {
            "value": src.get("value"),
            "confidence": float(src.get("confidence", 0.0) or 0.0),
            "source_page": src.get("source_page"),
            "method": src.get("method") or "missing",
            "evidence": src.get("evidence"),
        }
    return out


def _normalize_field(name: str, value: Any) -> Any:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if name in {"numero_oficio", "credor_cpf_cnpj"}:
        digits = only_digits(text)
        return digits if digits else None
    if name == "valor_principal":
        return parse_brl_to_decimal(text)
    if name == "data_expedicao":
        return parse_date_to_iso(text)
    if name == "natureza":
        lowered = text.lower()
        if "alimentar" in lowered:
            return "Alimentar"
        if "comum" in lowered:
            return "Comum"
        if "nao tribut" in lowered or "não tribut" in lowered:
            return "Comum"
        return text
    return text


def finalize_validation(
    fields: dict[str, dict[str, Any]],
    pages: list[dict[str, Any]],
) -> tuple[dict[str, dict[str, Any]], list[str]]:
    warnings: list[str] = []
    normalized = _ensure_field_shape(fields)

    for name, data in normalized.items():
        data["value"] = _normalize_field(name, data.get("value"))
        data["confidence"] = round(max(0.0, min(1.0, float(data.get("confidence", 0.0)))), 4)
        if data["value"] is None:
            warnings.append(f"{name}_ausente")

    cpf = normalized["credor_cpf_cnpj"]["value"]
    if cpf and not is_valid_cpf_cnpj(str(cpf)):
        warnings.append("cpf_cnpj_invalido")

    for cnj_field in ("numero_precatorio", "numero_processo"):
        cnj = normalized[cnj_field]["value"]
        if cnj and not is_valid_cnj(str(cnj)):
            warnings.append(f"{cnj_field}_cnj_invalido")

    natureza = normalized["natureza"]["value"]
    if natureza and natureza not in {"Comum", "Alimentar"}:
        warnings.append("natureza_fora_dominio")

    all_text = "\n".join(str(page.get("text", "")) for page in pages)
    cnj_found = sorted(set(CNJ_PATTERN.findall(all_text)))
    if len(cnj_found) > 1:
        prec = normalized["numero_precatorio"]["value"]
        proc = normalized["numero_processo"]["value"]

        # Dois CNJs no documento é comum (precatório + processo originário).
        # Só marca conflito quando não conseguimos separar os campos.
        if not prec or not proc or str(prec).strip() == str(proc).strip():
            warnings.append("numero_precatorio_conflito")
            warnings.append("numero_processo_conflito")

    return normalized, sorted(set(warnings))
