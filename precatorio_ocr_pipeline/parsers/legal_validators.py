from __future__ import annotations

import re


def only_digits(value: str) -> str:
    return re.sub(r"\D+", "", value or "")


def is_valid_cpf(value: str) -> bool:
    digits = only_digits(value)
    if len(digits) != 11:
        return False
    if digits == digits[0] * 11:
        return False

    def calc_digit(base: str, factor_start: int) -> int:
        total = sum(int(ch) * (factor_start - idx) for idx, ch in enumerate(base))
        result = (total * 10) % 11
        return 0 if result == 10 else result

    d1 = calc_digit(digits[:9], 10)
    d2 = calc_digit(digits[:10], 11)
    return d1 == int(digits[9]) and d2 == int(digits[10])


def is_valid_cnpj(value: str) -> bool:
    digits = only_digits(value)
    if len(digits) != 14:
        return False
    if digits == digits[0] * 14:
        return False

    def calculate(base: str, weights: list[int]) -> int:
        total = sum(int(ch) * w for ch, w in zip(base, weights))
        mod = total % 11
        return 0 if mod < 2 else 11 - mod

    w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    w2 = [6] + w1
    d1 = calculate(digits[:12], w1)
    d2 = calculate(digits[:12] + str(d1), w2)
    return d1 == int(digits[12]) and d2 == int(digits[13])


def is_valid_cpf_cnpj(value: str) -> bool:
    digits = only_digits(value)
    if len(digits) == 11:
        return is_valid_cpf(digits)
    if len(digits) == 14:
        return is_valid_cnpj(digits)
    return False


def parse_brl_to_decimal(value: str) -> str | None:
    if not value:
        return None
    cleaned = value.strip()
    cleaned = cleaned.replace("R$", "").replace(" ", "")
    cleaned = re.sub(r"\.(?=\d{3}(?:\D|$))", "", cleaned)
    cleaned = cleaned.replace(",", ".")
    if not re.fullmatch(r"-?\d+(\.\d+)?", cleaned):
        return None
    try:
        amount = float(cleaned)
    except ValueError:
        return None
    if amount <= 0:
        return None
    return f"{amount:.2f}"


def parse_date_to_iso(value: str) -> str | None:
    if not value:
        return None
    iso_match = re.fullmatch(r"\d{4}-\d{2}-\d{2}", value.strip())
    if iso_match:
        year, month, day = value.strip().split("-")
        y = int(year)
        m = int(month)
        d = int(day)
        if 1980 <= y <= 2100 and 1 <= m <= 12 and 1 <= d <= 31:
            return value.strip()
        return None
    match = re.search(r"\b(\d{2})[\/.-](\d{2})[\/.-](\d{4})\b", value)
    if not match:
        return None
    day, month, year = match.groups()
    y = int(year)
    m = int(month)
    d = int(day)
    if y < 1980 or y > 2100:
        return None
    if m < 1 or m > 12:
        return None
    if d < 1 or d > 31:
        return None
    return f"{year}-{month}-{day}"


def is_valid_cnj(value: str) -> bool:
    digits = only_digits(value)
    if len(digits) != 20:
        return False
    seq = digits[:7]
    dv = digits[7:9]
    year = digits[9:13]
    just = digits[13]
    tribunal = digits[14:16]
    origin = digits[16:20]
    number = f"{seq}{year}{just}{tribunal}{origin}00"
    expected = 98 - (int(number) % 97)
    if expected == 100:
        expected = 0
    return f"{expected:02d}" == dv
