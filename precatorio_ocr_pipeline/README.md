# Precatório OCR Pipeline

Pipeline robusto de OCR/extração para precatórios brasileiros com:

- entrada em lote (diretório e lista de arquivos)
- detecção de camada de texto
- OCR em duas camadas (fast + premium com fallback automático)
- parser jurídico BR com confidência e evidências
- normalização/validação final
- saída JSONL (1 linha por documento)
- avaliação por métricas e testes automatizados

## Requisitos

- Python 3.14+
- Dependências em `requirements.txt`
- Tesseract no `PATH` para modo fast completo (opcional, o pipeline continua sem ele)

## Instalação

```powershell
python -m venv .venv_ocr
.\.venv_ocr\Scripts\python.exe -m pip install -r requirements.txt
```

## Execução

### Diretório (lote)

```powershell
.\.venv_ocr\Scripts\python.exe -m precatorio_ocr_pipeline .\pdfs --out .\tmp\out.jsonl --recursive --workers 4 --ocr-mode auto
```

### Lista de arquivos

```powershell
.\.venv_ocr\Scripts\python.exe -m precatorio_ocr_pipeline .\pdfs\a.pdf .\pdfs\b.pdf --out .\tmp\out_list.jsonl --workers 2
```

### Flags principais

- `--out`: caminho do JSONL de saída
- `--recursive`: busca PDFs em subpastas
- `--workers`: paralelismo
- `--ocr-mode auto|fast|premium`
- `--debug` e `--debug-dir`: artefatos e cache
- `--llm-enable`: ativa resolvedor LLM stub para ambiguidades/campos faltantes

## Formato de saída JSONL

Cada linha é um documento:

```json
{
  "doc_id": "eval_doc_1",
  "file_path": "C:\\...\\pdfs\\eval_doc_1.pdf",
  "profile": "oficio_requisitorio",
  "text_layer": {"has_text": true, "ratio": 1.0, "per_page_chars": [312]},
  "fields": {
    "credor_nome": {"value": "MARCELO DIAS", "confidence": 0.72, "source_page": 1, "method": "label_lookup", "evidence": "CREDOR: MARCELO DIAS"},
    "valor_principal": {"value": "5432.10", "confidence": 0.87, "source_page": 1, "method": "label_regex", "evidence": "VALOR PRINCIPAL: R$ 5.432,10"}
  },
  "warnings": [],
  "timings": {"detect_text_layer_s": 0.01, "ocr_s": 0.00, "parse_s": 0.00, "validate_s": 0.00, "total_s": 0.02},
  "metrics": {"ocr_mode_requested": "auto", "ocr_mode_effective": "text_layer", "engines_used": ["text_layer"]}
}
```

## Avaliação

Execute:

```powershell
.\.venv_ocr\Scripts\python.exe evaluate.py --ground-truth ground_truth.jsonl --pdf-dir .\pdfs --ocr-mode auto --workers 2
```

Métricas:

- `field_level_accuracy`
- `precision/recall` por campo
- `document_completeness_rate`

## Testes

```powershell
.\.venv_ocr\Scripts\python.exe -m pytest -q
```

## Como adicionar novos layouts/perfis

1. Ajuste `detect_profile` em `precatorio_ocr_pipeline/parsers/extractor.py`.
2. Adicione heurísticas específicas por perfil dentro de `extract_fields`.
3. Adicione testes de regressão em `tests/test_parser_extractor.py` com exemplos reais desse layout.
4. Reavalie com `evaluate.py`.

## Observações sobre OCR

- `fast` usa Tesseract com pré-processamento OpenCV.
- `premium` tenta PaddleOCR, depois EasyOCR e, se necessário, RapidOCR.
- Em `auto`, se o fast vier ruim (texto curto/baixa densidade/baixa confiança), o pipeline faz fallback para premium.
