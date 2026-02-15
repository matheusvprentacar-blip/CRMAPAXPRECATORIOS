from __future__ import annotations

from pathlib import Path


def _iter_pdf_from_dir(directory: Path, recursive: bool) -> list[Path]:
    pattern = "**/*.pdf" if recursive else "*.pdf"
    return sorted(path for path in directory.glob(pattern) if path.is_file())


def resolve_pdf_inputs(inputs: list[Path], recursive: bool = False) -> list[Path]:
    resolved: list[Path] = []
    seen: set[str] = set()

    for raw in inputs:
        path = raw.expanduser().resolve()
        if path.is_dir():
            candidates = _iter_pdf_from_dir(path, recursive=recursive)
        else:
            candidates = [path]

        for candidate in candidates:
            if not candidate.exists():
                continue
            if candidate.suffix.lower() != ".pdf":
                continue
            key = str(candidate)
            if key in seen:
                continue
            seen.add(key)
            resolved.append(candidate)

    return sorted(resolved)
