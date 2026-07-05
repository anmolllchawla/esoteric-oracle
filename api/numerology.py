"""
Pythagorean Numerology Calculator.
Pure math — 100% accurate.
"""

from datetime import datetime


def _digit_sum(n):
    while n > 9 and n not in (11, 22, 33):
        n = sum(int(d) for d in str(n))
    return n


LETTER_VALUES = {c: i for i, chars in enumerate(
    ["abc", "def", "ghi", "jkl", "mno", "pqr", "stu", "vwx", "yz"], 1)
    for c in chars}


def _name_sum(name, filter_fn=None):
    cleaned = "".join(c.lower() for c in name if c.isalpha())
    if filter_fn:
        cleaned = "".join(c for c in cleaned if filter_fn(c))
    if not cleaned:
        return 0
    return _digit_sum(sum(LETTER_VALUES.get(c, 0) for c in cleaned))


PINNACLE_MAP = {
    1: "Independence and self-discovery. Forge your own path.",
    2: "Cooperation and relationships. Develop patience.",
    3: "Creative self-expression. Share your gifts.",
    4: "Build foundations. Hard work pays off.",
    5: "Freedom and change. Stay adaptable.",
    6: "Responsibility and service. Nurture others.",
    7: "Inner growth and spiritual development.",
    8: "Material achievement and recognition.",
    9: "Completion and humanitarian service. Give back.",
    11: "Master illumination cycle. Heightened intuition.",
    22: "Master builder cycle. Large-scale manifestation.",
    33: "Master teacher cycle. Unconditional love.",
}

CHALLENGE_MAP = {
    0: "Varied life tests — no single dominant challenge.",
    1: "Develop independence, overcome self-doubt.",
    2: "Overcome oversensitivity, build confidence.",
    3: "Avoid scattering energy, develop focus.",
    4: "Release rigidity, learn flexibility.",
    5: "Avoid escapism, channel freedom constructively.",
    6: "Balance helping others with self-care.",
    7: "Overcome isolation, stay connected.",
    8: "Integrate power with compassion.",
}


def calculate_numerology(birth_date, name=""):
    """Calculate Pythagorean numerology numbers.

    Args:
        birth_date: "YYYY-MM-DD"
        name: Full birth name (optional)
    """
    y, m, d = map(int, birth_date.split("-"))

    # Life Path
    life_path = _digit_sum(_digit_sum(m) + _digit_sum(d) + _digit_sum(y))

    # Birthday
    birthday = _digit_sum(d)

    # Name-based numbers
    expression = _name_sum(name) if name else 0
    soul_urge = _name_sum(name, lambda c: c in "aeiou") if name else 0
    personality = _name_sum(name, lambda c: c not in "aeiou") if name else 0

    # Pinnacle cycles
    first = _digit_sum(m + d)
    second = _digit_sum(d + y)
    third = _digit_sum(first + second)
    fourth = _digit_sum(m + y)

    base_age = 36 - life_path
    pinnacles = [
        {"age": f"0-{base_age}", "number": first, "meaning": PINNACLE_MAP.get(first, "")},
        {"age": f"{base_age}-{base_age + 9}", "number": second, "meaning": PINNACLE_MAP.get(second, "")},
        {"age": f"{base_age + 9}-{base_age + 18}", "number": third, "meaning": PINNACLE_MAP.get(third, "")},
        {"age": f"{base_age + 18}+", "number": fourth, "meaning": PINNACLE_MAP.get(fourth, "")},
    ]

    # Challenge cycles
    challenges = [
        {"age": f"0-{base_age}", "number": _digit_sum(abs(m - d))},
        {"age": f"{base_age}-{base_age + 9}", "number": _digit_sum(abs(d - y))},
        {"age": f"{base_age + 9}-{base_age + 18}", "number": _digit_sum(abs(first - second))},
        {"age": f"{base_age + 18}+", "number": _digit_sum(abs(m - y))},
    ]

    # Personal year/month/day
    now = datetime.now()
    py = _digit_sum(_digit_sum(d) + _digit_sum(m) + _digit_sum(now.year))
    pm = _digit_sum(py + (now.month))
    pd = _digit_sum(pm + now.day)

    return {
        "life_path": life_path,
        "expression": expression,
        "soul_urge": soul_urge,
        "personality": personality,
        "birthday": birthday,
        "pinnacle_cycles": pinnacles,
        "challenge_cycles": challenges,
        "personal_year": py,
        "personal_month": pm,
        "personal_day": pd,
    }
