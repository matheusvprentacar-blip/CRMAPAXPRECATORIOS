from __future__ import annotations

from typing import Any

from jsonschema import validate

from .schemas import FIELD_NAMES


FIELD_SCHEMA = {
    "type": "object",
    "properties": {
        "value": {"type": ["string", "number", "null"]},
        "confidence": {"type": "number"},
        "source_page": {"type": ["integer", "null"]},
        "method": {"type": "string"},
        "evidence": {"type": ["string", "null"]},
    },
    "required": ["value", "confidence", "source_page", "method", "evidence"],
}


DOCUMENT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "doc_id": {"type": "string"},
        "file_path": {"type": "string"},
        "profile": {"type": "string"},
        "text_layer": {
            "type": "object",
            "properties": {
                "has_text": {"type": "boolean"},
                "ratio": {"type": "number"},
                "per_page_chars": {"type": "array", "items": {"type": "integer"}},
            },
            "required": ["has_text", "ratio", "per_page_chars"],
        },
        "fields": {
            "type": "object",
            "properties": {field: FIELD_SCHEMA for field in FIELD_NAMES},
            "required": FIELD_NAMES,
        },
        "warnings": {"type": "array", "items": {"type": "string"}},
        "timings": {"type": "object"},
        "metrics": {"type": "object"},
    },
    "required": ["doc_id", "file_path", "profile", "text_layer", "fields", "warnings", "timings", "metrics"],
}


def validate_document_schema(document: dict[str, Any]) -> None:
    validate(instance=document, schema=DOCUMENT_SCHEMA)
