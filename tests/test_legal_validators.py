from precatorio_ocr_pipeline.parsers.legal_validators import (
    is_valid_cnpj,
    is_valid_cpf,
    is_valid_cnj,
    parse_brl_to_decimal,
    parse_date_to_iso,
)


def make_cnj(seq: str = "1234567", year: str = "2025", j: str = "8", tr: str = "26", origin: str = "0001") -> str:
    base = f"{seq}{year}{j}{tr}{origin}00"
    dv = 98 - (int(base) % 97)
    if dv == 100:
        dv = 0
    return f"{seq}-{dv:02d}.{year}.{j}.{tr}.{origin}"


def test_cpf_validation():
    assert is_valid_cpf("529.982.247-25")
    assert not is_valid_cpf("111.111.111-11")


def test_cnpj_validation():
    assert is_valid_cnpj("04.252.011/0001-10")
    assert not is_valid_cnpj("00.000.000/0000-00")


def test_cnj_validation():
    valid_cnj = make_cnj()
    assert is_valid_cnj(valid_cnj)
    assert not is_valid_cnj("1234567-00.2025.8.26.0001")


def test_money_and_date_parsers():
    assert parse_brl_to_decimal("R$ 12.345,67") == "12345.67"
    assert parse_date_to_iso("15/08/2025") == "2025-08-15"
    assert parse_date_to_iso("2025-08-15") == "2025-08-15"
