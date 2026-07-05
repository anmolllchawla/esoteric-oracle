"""
Human Design Calculator (simplified).
Gate mapping from planetary positions.
"""

HD_GATES = {
    1: "Gate 1 — The Creative",
    2: "Gate 2 — Direction of the Self",
    3: "Gate 3 — Difficulty at the Beginning",
    4: "Gate 4 — Youthful Folly",
    5: "Gate 5 — Fixed Rhythms",
    6: "Gate 6 — The Friction",
    7: "Gate 7 — Role of the Self",
    8: "Gate 8 — Contribution",
    9: "Gate 9 — Taming Power of the Small",
    10: "Gate 10 — Behavior of the Self",
    11: "Gate 11 — Peace (Ideas)",
    12: "Gate 12 — Standstill",
    13: "Gate 13 — The Listener",
    14: "Gate 14 — Power Skills",
    15: "Gate 15 — Modesty",
    16: "Gate 16 — Skills",
    17: "Gate 17 — The Opinion",
    18: "Gate 18 — Correction",
    19: "Gate 19 — Wanting",
    20: "Gate 20 — The Now",
    21: "Gate 21 — The Hunter/Huntress",
    22: "Gate 22 — Grace",
    23: "Gate 23 — Assimilation",
    24: "Gate 24 — Returning",
    25: "Gate 25 — Innocence",
    26: "Gate 26 — Taming Power of the Great",
    27: "Gate 27 — Nourishment",
    28: "Gate 28 — The Game Player",
    29: "Gate 29 — The Abyss",
    30: "Gate 30 — The Clinging Fire",
    31: "Gate 31 — Leading",
    32: "Gate 32 — Duration",
    33: "Gate 33 — Retreat",
    34: "Gate 34 — Power of the Great",
    35: "Gate 35 — Progress",
    36: "Gate 36 — Crisis",
    37: "Gate 37 — Friendship",
    38: "Gate 38 — The Fighter",
    39: "Gate 39 — The Provocateur",
    40: "Gate 40 — Deliverance",
    41: "Gate 41 — Decrease",
    42: "Gate 42 — Increase",
    43: "Gate 43 — Insight",
    44: "Gate 44 — Coming to Meet",
    45: "Gate 45 — Gathering Together",
    46: "Gate 46 — Determination of the Self",
    47: "Gate 47 — Oppression",
    48: "Gate 48 — The Well",
    49: "Gate 49 — Revolution",
    50: "Gate 50 — The Cauldron",
    51: "Gate 51 — The Arousing",
    52: "Gate 52 — Keeping Still",
    53: "Gate 53 — Development",
    54: "Gate 54 — The Marrying Maiden",
    55: "Gate 55 — Abundance",
    56: "Gate 56 — The Wanderer",
    57: "Gate 57 — The Gentle",
    58: "Gate 58 — The Joyous",
    59: "Gate 59 — Sexuality",
    60: "Gate 60 — Limitation",
    61: "Gate 61 — Mystery",
    62: "Gate 62 — Detail",
    63: "Gate 63 — Doubt",
    64: "Gate 64 — Confusion",
}

CHANNEL_NAMES = {
    "1-8": "Channel of Inspiration",
    "20-34": "Channel of Charisma",
    "35-36": "Channel of Transitoriness",
    "10-20": "Channel of Awakening",
    "10-34": "Channel of Exploration",
    "2-14": "Channel of the Beat",
    "3-60": "Channel of Mutation",
    "5-15": "Channel of Rhythm",
    "6-59": "Channel of Intimacy",
    "7-31": "Channel of the Alpha",
    "9-52": "Channel of Concentration",
    "11-56": "Channel of Curiosity",
    "12-22": "Channel of Openness",
    "13-33": "Channel of the Prodigal",
    "16-48": "Channel of Talent",
    "17-62": "Channel of Acceptance",
    "18-58": "Channel of Judgment",
    "19-49": "Channel of Synthesis",
    "20-57": "Channel of the Brainwave",
    "21-45": "Channel of Money",
    "23-43": "Channel of Structuring",
    "24-61": "Channel of Awareness",
    "25-51": "Channel of Initiation",
    "26-44": "Channel of Surrender",
    "27-50": "Channel of Preservation",
    "28-38": "Channel of Struggle",
    "29-46": "Channel of Discovery",
    "30-41": "Channel of Recognition",
    "32-54": "Channel of Transformation",
    "34-57": "Channel of Power",
    "37-40": "Channel of Community",
    "39-55": "Channel of Emoting",
    "42-53": "Channel of Maturation",
    "47-64": "Channel of Abstraction",
}

SACRAL_GATES = {3, 5, 9, 14, 27, 29, 34, 42, 59}
SOLAR_PLEXUS_GATES = {6, 22, 30, 36, 37, 49, 55, 59}
SPLEEN_GATES = {10, 18, 28, 32, 44, 48, 50, 57}
HEART_GATES = {21, 26, 40, 51}
G_CENTER_GATES = {1, 2, 7, 10, 13, 15, 25, 46}


def _lon_to_gate(lon):
    return int(((lon % 360) + 360) % 360 / 5.625) + 1


def _find_channels(gates):
    channels = []
    for key, (g1, g2) in {
        "1-8": (1, 8), "20-34": (20, 34), "35-36": (35, 36),
        "10-20": (10, 20), "10-34": (10, 34), "10-57": (10, 57),
        "2-14": (2, 14), "3-60": (3, 60), "5-15": (5, 15),
        "6-59": (6, 59), "7-31": (7, 31), "9-52": (9, 52),
        "11-56": (11, 56), "12-22": (12, 22), "13-33": (13, 33),
        "16-48": (16, 48), "17-62": (17, 62), "18-58": (18, 58),
        "19-49": (19, 49), "20-57": (20, 57), "21-45": (21, 45),
        "23-43": (23, 43), "24-61": (24, 61), "25-51": (25, 51),
        "26-44": (26, 44), "27-50": (27, 50), "28-38": (28, 38),
        "29-46": (29, 46), "30-41": (30, 41), "32-54": (32, 54),
        "34-57": (34, 57), "37-40": (37, 40), "39-55": (39, 55),
        "42-53": (42, 53), "47-64": (47, 64),
    }.items():
        if g1 in gates and g2 in gates:
            channels.append(key)
    return channels


def calculate_humandesign(vedic_planets):
    """Calculate Human Design from Vedic planet positions.

    Args:
        vedic_planets: list of dicts from vedic.py calc_planets()
    """
    # Consciousness (Personality) = birth chart = all planets
    # Design = ~88 days before birth (approximate offset)
    # We approximate design gates by shifting 273 degrees on the wheel
    SHIFT = 273.0

    # Get all gate numbers
    gates = set()
    for p in vedic_planets:
        if "degree" in p and "sign" in p:
            sig_idx = "Aries Taurus Gemini Cancer Leo Virgo Libra Scorpio Sagittarius Capricorn Aquarius Pisces".split().index(p["sign"])
            lon = sig_idx * 30 + p["degree"]
            gates.add(_lon_to_gate(lon))

    # Sun and Earth for Personality
    sun = next((p for p in vedic_planets if p["name"] == "Sun"), None)
    if sun:
        sig_idx = "Aries Taurus Gemini Cancer Leo Virgo Libra Scorpio Sagittarius Capricorn Aquarius Pisces".split().index(sun["sign"])
        sun_lon = sig_idx * 30 + sun["degree"]
        conscious_sun = _lon_to_gate(sun_lon)
        conscious_earth = _lon_to_gate((sun_lon + 180) % 360)
        # Design (~88 days before)
        design_lon = (sun_lon + SHIFT) % 360
        unconscious_sun = _lon_to_gate(design_lon)
        unconscious_earth = _lon_to_gate((design_lon + 180) % 360)
    else:
        conscious_sun = 1
        conscious_earth = 2
        unconscious_sun = 7
        unconscious_earth = 13

    all_gates = sorted(set([conscious_sun, conscious_earth, unconscious_sun, unconscious_earth]) | gates)

    # Type
    has_sacral = any(g in SACRAL_GATES for g in all_gates)
    has_sp = any(g in SOLAR_PLEXUS_GATES for g in all_gates)
    has_spleen = any(g in SPLEEN_GATES for g in all_gates)
    has_heart = any(g in HEART_GATES for g in all_gates)
    has_g = any(g in G_CENTER_GATES for g in all_gates)

    defined_count = sum([has_sacral, has_sp, has_spleen, has_heart, has_g])

    if has_sacral:
        hd_type = "Manifesting Generator"
        signature = "Satisfaction"
        not_self = "Frustration"
    else:
        hd_type = "Projector"
        signature = "Success"
        not_self = "Bitterness"

    # Authority
    if has_sp:
        authority = "Emotional"
    elif has_sacral:
        authority = "Sacral"
    elif has_spleen:
        authority = "Splenic"
    elif has_heart:
        authority = "Ego"
    elif has_g:
        authority = "Self-Projected"
    else:
        authority = "Environmental"

    # Definition
    if defined_count <= 1:
        definition = "Single"
    elif defined_count == 2:
        definition = "Split"
    elif defined_count == 3:
        definition = "Triple Split"
    else:
        definition = "Quad Split"

    # Profile from conscious/unconscious Sun lines
    c_line = (conscious_sun % 6) or 6
    u_line = (unconscious_sun % 6) or 6
    profile = f"{c_line}/{u_line}"

    # Incarnation Cross
    cross = f"Right Angle Cross (Gates {conscious_sun}/{conscious_earth} | {unconscious_sun}/{unconscious_earth})"

    # Channels
    channels = _find_channels(all_gates)

    # Transit gates (current month approximate)
    transit_gates = [(conscious_sun % 64) + 1, (unconscious_sun % 64) + 1]

    return {
        "type": hd_type,
        "authority": authority,
        "profile": profile,
        "definition": definition,
        "incarnation_cross": cross,
        "conscious_sun_gate": conscious_sun,
        "conscious_earth_gate": conscious_earth,
        "unconscious_sun_gate": unconscious_sun,
        "unconscious_earth_gate": unconscious_earth,
        "active_gates": all_gates,
        "active_channels": channels,
        "not_self_theme": not_self,
        "signature": signature,
        "transit_gates_activated": transit_gates,
    }
