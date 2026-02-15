from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Protocol

from .schemas import FIELD_NAMES


CPF_CNPJ_PATTERN = re.compile(
    r"\b(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2})\b"
)


class LLMClient(Protocol):
    def resolve(self, prompt: str) -> str:
        """Retorna JSON estrito em string."""


@dataclass
class StubLLMClient:
    def resolve(self, prompt: str) -> str:  # pragma: no cover - comportamento simples
        _ = prompt
        return "{}"


def redact_sensitive(text: str) -> str:
    return CPF_CNPJ_PATTERN.sub("[REDACTED_CPF_CNPJ]", text or "")


def build_prompt(excerpts: str, partial_fields: dict[str, Any]) -> str:
    return f"""
Voce é um resolvedor de ambiguidades para extração de precatórios.
Responda SOMENTE JSON estrito, sem markdown.
Nao invente dados.
Preencha apenas campos faltantes ou conflitantes.

Campos esperados:
{FIELD_NAMES}

Campos atuais:
{json.dumps(partial_fields, ensure_ascii=False)}

Trechos relevantes:
{excerpts}

Formato de resposta:
{{
  "credor_nome": null,
  "advogado_nome": null,
  "valor_principal": null,
  "numero_precatorio": null,
  "numero_processo": null,
  "numero_oficio": null,
  "tribunal": null,
  "credor_cpf_cnpj": null,
  "natureza": null,
  "data_expedicao": null
}}
""".strip()


def resolve_ambiguities(
    pages: list[dict[str, Any]],
    fields: dict[str, dict[str, Any]],
    warnings: list[str] | None = None,
    llm_enabled: bool = False,
    llm_client: LLMClient | None = None,
) -> dict[str, Any]:
    warnings = warnings or []
    missing_fields = [name for name in FIELD_NAMES if not fields.get(name, {}).get("value")]
    conflict_fields = [warn.replace("_conflito", "") for warn in warnings if warn.endswith("_conflito")]
    targets = sorted(set(missing_fields + conflict_fields))
    if not targets:
        return {"used": False, "updated_fields": [], "warnings": []}

    if not llm_enabled:
        return {"used": False, "updated_fields": [], "warnings": ["llm_disabled"]}

    if llm_client is None:
        return {"used": False, "updated_fields": [], "warnings": ["llm_not_configured"]}

    joined_text = "\n".join(str(page.get("text", "")) for page in pages)
    excerpt = redact_sensitive(joined_text[:2000])
    partial = {name: fields.get(name, {}).get("value") for name in FIELD_NAMES}
    prompt = build_prompt(excerpt, partial)

    try:
        raw = llm_client.resolve(prompt).strip()
        if not raw:
            return {"used": True, "updated_fields": [], "warnings": ["llm_empty_response"]}
        response = json.loads(raw)
        updated_fields: list[str] = []
        for field in targets:
            candidate = response.get(field)
            if candidate is None or candidate == "":
                continue
            current = fields.get(field, {})
            if current.get("value"):
                continue
            fields[field] = {
                "value": str(candidate),
                "confidence": 0.6,
                "source_page": None,
                "method": "llm_stub",
                "evidence": "llm_resolution",
            }
            updated_fields.append(field)

        return {"used": True, "updated_fields": updated_fields, "warnings": []}
    except Exception as exc:  # pragma: no cover
        return {"used": True, "updated_fields": [], "warnings": [f"llm_error:{exc}"]}
