"""
Bazi (Four Pillars of Destiny) Calculator.
Rule-based cycle math — no AI.
"""

from datetime import datetime

STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

STEM_ELEMENT = {
    "甲": "Wood", "乙": "Wood", "丙": "Fire", "丁": "Fire",
    "戊": "Earth", "己": "Earth", "庚": "Metal", "辛": "Metal",
    "壬": "Water", "癸": "Water",
}
BRANCH_ELEMENT = {
    "子": "Water", "丑": "Earth", "寅": "Wood", "卯": "Wood",
    "辰": "Earth", "巳": "Fire", "午": "Fire", "未": "Earth",
    "申": "Metal", "酉": "Metal", "戌": "Earth", "亥": "Water",
}
BRANCH_ANIMAL = {
    "子": "Rat", "丑": "Ox", "寅": "Tiger", "卯": "Rabbit",
    "辰": "Dragon", "巳": "Snake", "午": "Horse", "未": "Goat",
    "申": "Monkey", "酉": "Rooster", "戌": "Dog", "亥": "Pig",
}

# Approximate solar term boundary dates (month -> (month_num, day))
SOLAR_TERMS = [
    (2, 4), (3, 6), (4, 5), (5, 6), (6, 6), (7, 7),
    (8, 8), (9, 8), (10, 8), (11, 7), (12, 7), (1, 6),
]
# Month branch for each solar term
MONTH_BRANCHES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]  # 寅=0 for 立春, etc.

GENERATES = {"Wood": "Fire", "Fire": "Earth", "Earth": "Metal",
             "Metal": "Water", "Water": "Wood"}
CONTROLS = {"Wood": "Earth", "Earth": "Water", "Water": "Fire",
            "Fire": "Metal", "Metal": "Wood"}


def julian_day(y, m, d):
    """Julian Day Number."""
    if m <= 2:
        y -= 1
        m += 12
    A = y // 100
    B = 2 - A + A // 4
    return int(365.25 * (y + 4716)) + int(30.6001 * (m + 1)) + d + B - 1524


def calculate_bazi(birth_date, birth_time):
    """Calculate Four Pillars of Destiny.

    Args:
        birth_date: "YYYY-MM-DD"
        birth_time: "HH:MM" (24h)
    """
    y, m, d = map(int, birth_date.split("-"))
    h, mi = map(int, birth_time.split(":"))
    hour = h + mi / 60

    # Year pillar
    year_stem = (y - 4) % 10
    year_branch = (y - 4) % 12

    # Month branch from solar term
    # Solar terms cycle: Feb4 -> 寅, Mar6 -> 卯, ..., Jan6 -> 丑
    # Find the most recent term ON or BEFORE the birth date
    month_branch_idx = 0  # default: 立春
    # Check terms in chronological order (Feb4, Mar6, ... Jan6)
    # Terms before Oct are months 2-8; terms after Sep wrap to Jan
    # We need to find the last term whose date is <= birth date
    for i in range(len(SOLAR_TERMS)):
        sm, sd = SOLAR_TERMS[i]
        # Handle wrap: Jan6 (index 11) is AFTER Dec7 (index 10)
        # So Jan6's month=1 but it's actually the last term of the cycle
        if i == 11:  # 小寒 (Jan 6) — special case
            if m > 12 or (m == 1 and d >= 6):
                month_branch_idx = 11
        elif i < 11:  # Regular months Feb-Dec
            if m > sm or (m == sm and d >= sd):
                month_branch_idx = i
    # Convert solar term index to branch index: 寅=BRANCHES[2]
    term_to_branch = [(i + 2) % 12 for i in range(12)]
    month_branch = term_to_branch[month_branch_idx]

    month_stem = ((year_stem) * 2 + month_branch_idx) % 10

    # Day pillar from JD
    jd = julian_day(y, m, d)
    day_stem = (int(jd + 0.5) + 9) % 10
    day_branch = (int(jd + 0.5) + 1) % 12

    # Hour pillar
    if hour >= 23 or hour < 1:
        hour_branch = 0
    elif hour < 3:
        hour_branch = 1
    elif hour < 5:
        hour_branch = 2
    elif hour < 7:
        hour_branch = 3
    elif hour < 9:
        hour_branch = 4
    elif hour < 11:
        hour_branch = 5
    elif hour < 13:
        hour_branch = 6
    elif hour < 15:
        hour_branch = 7
    elif hour < 17:
        hour_branch = 8
    elif hour < 19:
        hour_branch = 9
    elif hour < 21:
        hour_branch = 10
    else:
        hour_branch = 11

    hour_stem = (day_stem * 2 + hour_branch) % 10

    # Day master
    day_master = STEMS[day_stem]

    # Compose pillars
    pillars = {
        "year": {"stem": STEMS[year_stem], "branch": BRANCHES[year_branch],
                 "element": STEM_ELEMENT[STEMS[year_stem]]},
        "month": {"stem": STEMS[month_stem], "branch": BRANCHES[month_branch],
                  "element": STEM_ELEMENT[STEMS[month_stem]]},
        "day": {"stem": STEMS[day_stem], "branch": BRANCHES[day_branch],
                "element": STEM_ELEMENT[STEMS[day_stem]]},
        "hour": {"stem": STEMS[hour_stem], "branch": BRANCHES[hour_branch],
                 "element": STEM_ELEMENT[STEMS[hour_stem]]},
    }

    # Element analysis
    dm_elem = STEM_ELEMENT[day_master]
    all_elements = []
    for p in ["year", "month", "day", "hour"]:
        all_elements.append(STEM_ELEMENT[pillars[p]["stem"]])
        all_elements.append(BRANCH_ELEMENT[pillars[p]["branch"]])

    # Favorable = element that generates DM + DM itself
    favorable = [dm_elem]
    gen = GENERATES.get(dm_elem)
    if gen and gen not in favorable:
        favorable.insert(0, gen)

    # Unfavorable = element that controls DM + element DM controls
    unfavorable = []
    ctrl = CONTROLS.get(dm_elem)
    if ctrl:
        unfavorable.append(ctrl)
    ctrl_by = next((k for k, v in CONTROLS.items() if v == dm_elem), None)
    if ctrl_by and ctrl_by not in unfavorable:
        unfavorable.append(ctrl_by)

    # Luck pillar (10-year cycles from start age)
    now = datetime.now()
    age = now.year - y - (1 if (now.month, now.day) < (m, d) else 0)
    # Approximate: start age based on gender  (simplified)
    start_age = 3  # common default
    luck_idx = max(0, (age - start_age) // 10) if age >= start_age else 0

    luck_stem = (month_stem + luck_idx + 1) % 10
    luck_branch = (month_branch + luck_idx + 1) % 12

    luck_pillar = f"{STEMS[luck_stem]}{BRANCHES[luck_branch]}"
    luck_elem = STEM_ELEMENT[STEMS[luck_stem]]

    # Element relationship
    if luck_elem == dm_elem:
        rel = f"{luck_elem} (same as Day Master) — reinforcing"
    elif GENERATES.get(luck_elem) == dm_elem:
        rel = f"{luck_elem} (generates Day Master) — supportive"
    elif CONTROLS.get(luck_elem) == dm_elem:
        rel = f"{luck_elem} (controls Day Master) — challenging"
    else:
        rel = f"{luck_elem} — neutral"

    luck_start = start_age + luck_idx * 10

    return {
        "four_pillars": pillars,
        "day_master": day_master,
        "favorable_elements": favorable,
        "unfavorable_elements": unfavorable,
        "current_luck_pillar": {
            "pillar": luck_pillar,
            "age_range": f"{luck_start}-{luck_start + 9}",
            "element_relationship": rel,
        },
    }
