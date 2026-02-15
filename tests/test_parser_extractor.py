from precatorio_ocr_pipeline.parsers.extractor import extract_fields


def test_extract_fields_core():
    pages = [
        {
            "page": 1,
            "text": "\n".join(
                [
                    "OFICIO REQUISITORIO No 9988/2025",
                    "TRIBUNAL: TJSP",
                    "NUMERO DO PRECATORIO: 1234567-82.2025.8.26.0001",
                    "PROCESSO ORIGINARIO: 1234567-82.2025.8.26.0001",
                    "CREDOR: CARLOS MENDES",
                    "CPF: 529.982.247-25",
                    "ADVOGADO: ANA PAULA ROCHA",
                    "NATUREZA: ALIMENTAR",
                    "VALOR PRINCIPAL: R$ 9.876,54",
                    "DATA DE EXPEDICAO: 15/08/2025",
                ]
            ),
            "lines": [
                "OFICIO REQUISITORIO No 9988/2025",
                "TRIBUNAL: TJSP",
                "NUMERO DO PRECATORIO: 1234567-82.2025.8.26.0001",
                "PROCESSO ORIGINARIO: 1234567-82.2025.8.26.0001",
                "CREDOR: CARLOS MENDES",
                "CPF: 529.982.247-25",
                "ADVOGADO: ANA PAULA ROCHA",
                "NATUREZA: ALIMENTAR",
                "VALOR PRINCIPAL: R$ 9.876,54",
                "DATA DE EXPEDICAO: 15/08/2025",
            ],
            "meta": {"engine_used": "text_layer", "mean_conf": 100.0, "char_count": 320},
        }
    ]
    result = extract_fields(pages)
    fields = result["fields"]

    assert fields["credor_nome"]["value"] == "CARLOS MENDES"
    assert fields["advogado_nome"]["value"] == "ANA PAULA ROCHA"
    assert fields["numero_precatorio"]["value"] == "1234567-82.2025.8.26.0001"
    assert fields["numero_oficio"]["value"] == "99882025"
    assert fields["credor_cpf_cnpj"]["value"] == "52998224725"
    assert fields["valor_principal"]["value"] == "9876.54"
    assert fields["data_expedicao"]["value"] == "2025-08-15"
