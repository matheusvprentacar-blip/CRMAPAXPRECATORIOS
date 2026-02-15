from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Any

from .legal_validators import (
    is_valid_cnj,
    is_valid_cpf_cnpj,
    only_digits,
    parse_brl_to_decimal,
    parse_date_to_iso,
)


@dataclass
class Candidate:
    value: str
    confidence: float
    source_page: int | None
    method: str
    evidence: str


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


CNJ_PATTERN = re.compile(r"\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b")
CPF_CNPJ_PATTERN = re.compile(
    r"\b(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2})\b"
)
MONEY_PATTERN = re.compile(r"(R\$\s*-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+(?:,\d{2}))")
DATE_PATTERN = re.compile(r"\b\d{2}[\/.-]\d{2}[\/.-]\d{4}\b")
OFICIO_PATTERN = re.compile(
    r"(?:oficio|requisitorio|requisicao)\D{0,10}(?:n(?:o|º|°)\s*)?([0-9]{1,8}(?:[./-][0-9]{2,4}){1,2})",
    re.I,
)


def _normalize(value: str) -> str:
    return (
        unicodedata.normalize("NFD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
        .strip()
    )


def detect_profile(pages: list[dict[str, Any]]) -> str:
    text = "\n".join(str(p.get("text", "")) for p in pages)
    normalized = _normalize(text)
    if "oficio" in normalized and "requisitorio" in normalized:
        return "oficio_requisitorio"
    if "precat" in normalized and "tribunal" in normalized:
        return "precatorio_padrao"
    return "unknown"


def _extract_label_value(line: str, next_line: str | None = None) -> str | None:
    if ":" in line:
        candidate = line.split(":", 1)[1].strip()
    elif "-" in line:
        candidate = line.split("-", 1)[1].strip()
    else:
        # Caso "CREDOR JOSE DA SILVA": remove o rótulo e pega o restante da linha.
        stripped = re.sub(
            r"^\s*(nome\s+do\s+)?(credor|beneficiario|exequente|requerente|autor|advogado|procurador)\s*",
            "",
            line,
            flags=re.I,
        )
        candidate = stripped.strip()

    # Só usa lookahead quando o rótulo parece sozinho na linha.
    if not candidate and next_line and line.strip().endswith(":"):
        candidate = next_line.strip()
    candidate = re.sub(r"\s+", " ", candidate).strip(" .;:-")
    if len(candidate) < 2:
        return None
    return candidate


def _add_candidate(store: dict[str, list[Candidate]], field: str, candidate: Candidate) -> None:
    store.setdefault(field, []).append(candidate)


def _choose_best(candidates: list[Candidate]) -> Candidate | None:
    if not candidates:
        return None
    return max(candidates, key=lambda c: c.confidence)


def _prepare_empty_fields() -> dict[str, dict[str, Any]]:
    return {
        field: {
            "value": None,
            "confidence": 0.0,
            "source_page": None,
            "method": "missing",
            "evidence": None,
        }
        for field in FIELD_NAMES
    }


def _confidence_adjustments(field: str, value: str, base_conf: float) -> tuple[float, list[str]]:
    warnings: list[str] = []
    conf = base_conf

    if field in {"numero_precatorio", "numero_processo"}:
        if is_valid_cnj(value):
            conf += 0.20
        else:
            conf -= 0.15
            warnings.append(f"{field}_cnj_invalido")

    if field == "credor_cpf_cnpj":
        if is_valid_cpf_cnpj(value):
            conf += 0.20
        else:
            conf -= 0.15
            warnings.append("cpf_cnpj_invalido")

    if field == "valor_principal":
        if parse_brl_to_decimal(value) is not None:
            conf += 0.15
        else:
            conf -= 0.20
            warnings.append("valor_principal_invalido")

    if field == "data_expedicao":
        if parse_date_to_iso(value) is not None:
            conf += 0.10
        else:
            conf -= 0.20
            warnings.append("data_expedicao_invalida")

    if field == "natureza":
        normalized = _normalize(value)
        if "alimentar" in normalized or "comum" in normalized:
            conf += 0.12
        else:
            conf -= 0.10
            warnings.append("natureza_fora_dominio")

    return max(0.0, min(0.99, conf)), warnings


def _normalize_output_field(field: str, value: str | None) -> str | None:
    if value is None:
        return None
    if field in {"numero_oficio", "credor_cpf_cnpj"}:
        digits = only_digits(value)
        if field == "numero_oficio" and not digits:
            cleaned = value.strip()
            return cleaned if cleaned else None
        return digits if digits else None
    if field == "valor_principal":
        return parse_brl_to_decimal(value)
    if field == "data_expedicao":
        return parse_date_to_iso(value)
    if field == "natureza":
        normalized = _normalize(value)
        if "alimentar" in normalized:
            return "Alimentar"
        if "comum" in normalized:
            return "Comum"
        if "nao tribut" in normalized or "nao-tribut" in normalized:
            # Em muitos oficios "nao tributaria" costuma cair no balde de credito comum.
            return "Comum"
        return value
    return value.strip()


def extract_fields(pages: list[dict[str, Any]]) -> dict[str, Any]:
    candidates: dict[str, list[Candidate]] = {}
    warnings: list[str] = []
    profile = detect_profile(pages)

    all_cnj: list[tuple[str, int]] = []
    for page in pages:
        page_num = int(page.get("page", 0))
        lines = [str(line) for line in page.get("lines", [])]

        for idx, line in enumerate(lines):
            next_line = lines[idx + 1] if idx + 1 < len(lines) else None
            normalized = _normalize(line)

            if any(token in normalized for token in ["credor", "beneficiario", "exequente", "requerente", "autor"]):
                value = _extract_label_value(line, next_line)
                if value and not re.search(r"\b(cpf|cnpj)\b", _normalize(value)):
                    _add_candidate(
                        candidates,
                        "credor_nome",
                        Candidate(value=value, confidence=0.72, source_page=page_num, method="label_lookup", evidence=line),
                    )

            if any(token in normalized for token in ["advogado", "procurador"]):
                value = _extract_label_value(line, next_line)
                if value:
                    _add_candidate(
                        candidates,
                        "advogado_nome",
                        Candidate(value=value, confidence=0.70, source_page=page_num, method="label_lookup", evidence=line),
                    )

            if "precat" in normalized or "rpv" in normalized:
                for match in CNJ_PATTERN.findall(line):
                    all_cnj.append((match, page_num))
                    _add_candidate(
                        candidates,
                        "numero_precatorio",
                        Candidate(value=match, confidence=0.68, source_page=page_num, method="label_regex", evidence=line),
                    )

            if "processo" in normalized or "autos" in normalized:
                for match in CNJ_PATTERN.findall(line):
                    all_cnj.append((match, page_num))
                    _add_candidate(
                        candidates,
                        "numero_processo",
                        Candidate(value=match, confidence=0.68, source_page=page_num, method="label_regex", evidence=line),
                    )

            if any(token in normalized for token in ["oficio", "requisitorio", "requisicao"]):
                raw = f"{line} {next_line or ''}"
                match = OFICIO_PATTERN.search(raw)
                if not match:
                    match = re.search(r"\b\d{3,8}/\d{4}\b", raw)
                if match:
                    value = match.group(1) if hasattr(match, "group") and match.lastindex else match.group(0)
                    if CNJ_PATTERN.fullmatch(value):
                        continue
                    _add_candidate(
                        candidates,
                        "numero_oficio",
                        Candidate(value=value, confidence=0.74, source_page=page_num, method="label_regex", evidence=line),
                    )

            if "tribunal" in normalized or re.search(r"\b(tj|trf|trt|stj|stf)\b", normalized):
                tribunal_match = re.search(r"\b(TJ[\s-]?[A-Z]{2}|TRF[\s-]?\d{1,2}|TRT[\s-]?\d{1,2}|STJ|STF)\b", line, re.I)
                if tribunal_match:
                    _add_candidate(
                        candidates,
                        "tribunal",
                        Candidate(
                            value=tribunal_match.group(1).replace(" ", "").replace("-", "").upper(),
                            confidence=0.75,
                            source_page=page_num,
                            method="regex",
                            evidence=line,
                        ),
                    )

            cpf_cnpj_match = CPF_CNPJ_PATTERN.search(line)
            if cpf_cnpj_match:
                _add_candidate(
                    candidates,
                    "credor_cpf_cnpj",
                    Candidate(value=cpf_cnpj_match.group(0), confidence=0.70, source_page=page_num, method="regex", evidence=line),
                )

            if "natureza" in normalized or "alimentar" in normalized or "comum" in normalized:
                if "alimentar" in normalized:
                    natureza_value = "Alimentar"
                elif "comum" in normalized:
                    natureza_value = "Comum"
                else:
                    natureza_value = _extract_label_value(line, next_line) or line
                _add_candidate(
                    candidates,
                    "natureza",
                    Candidate(value=natureza_value, confidence=0.65, source_page=page_num, method="keyword", evidence=line),
                )

            if any(token in normalized for token in ["valor principal", "valor requisitado", "valor total", "valor do precatorio"]):
                money_match = MONEY_PATTERN.search(line) or (MONEY_PATTERN.search(next_line) if next_line else None)
                if money_match:
                    _add_candidate(
                        candidates,
                        "valor_principal",
                        Candidate(value=money_match.group(1), confidence=0.72, source_page=page_num, method="label_regex", evidence=line),
                    )

            if any(token in normalized for token in ["expedicao", "data da expedicao", "expedido em", "data requisicao"]):
                date_match = DATE_PATTERN.search(line) or (DATE_PATTERN.search(next_line) if next_line else None)
                if date_match:
                    _add_candidate(
                        candidates,
                        "data_expedicao",
                        Candidate(value=date_match.group(0), confidence=0.70, source_page=page_num, method="label_regex", evidence=line),
                    )

            for match in CNJ_PATTERN.findall(line):
                all_cnj.append((match, page_num))

            for money_match in MONEY_PATTERN.findall(line):
                _add_candidate(
                    candidates,
                    "valor_principal",
                    Candidate(value=money_match, confidence=0.58, source_page=page_num, method="regex_fallback", evidence=line),
                )

            date_match = DATE_PATTERN.search(line)
            if date_match:
                _add_candidate(
                    candidates,
                    "data_expedicao",
                    Candidate(value=date_match.group(0), confidence=0.55, source_page=page_num, method="regex_fallback", evidence=line),
                )

    if all_cnj:
        unique_cnj = []
        seen = set()
        for cnj, pg in all_cnj:
            if cnj in seen:
                continue
            seen.add(cnj)
            unique_cnj.append((cnj, pg))
        if len(unique_cnj) >= 1:
            first_cnj, first_pg = unique_cnj[0]
            _add_candidate(
                candidates,
                "numero_precatorio",
                Candidate(value=first_cnj, confidence=0.60, source_page=first_pg, method="cnj_fallback_first", evidence=first_cnj),
            )
        if len(unique_cnj) >= 2:
            last_cnj, last_pg = unique_cnj[-1]
            _add_candidate(
                candidates,
                "numero_processo",
                Candidate(value=last_cnj, confidence=0.60, source_page=last_pg, method="cnj_fallback_last", evidence=last_cnj),
            )

    fields = _prepare_empty_fields()
    for field in FIELD_NAMES:
        chosen = _choose_best(candidates.get(field, []))
        if not chosen:
            continue
        adjusted_conf, warn = _confidence_adjustments(field, chosen.value, chosen.confidence)
        warnings.extend(warn)
        normalized_value = _normalize_output_field(field, chosen.value)
        if normalized_value is None and field in {"valor_principal", "data_expedicao"}:
            warnings.append(f"{field}_nao_normalizado")
        fields[field] = {
            "value": normalized_value if normalized_value is not None else chosen.value,
            "confidence": round(adjusted_conf, 4),
            "source_page": chosen.source_page,
            "method": chosen.method,
            "evidence": chosen.evidence[:220],
        }

    return {
        "profile": profile,
        "fields": fields,
        "warnings": sorted(set(warnings)),
    }
