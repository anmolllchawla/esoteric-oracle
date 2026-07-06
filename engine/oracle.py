#!/usr/bin/env python3
"""
Esoteric Oracle — Unified Reading Engine
==========================================
Accepts structured birth chart data (JSON) via stdin or --file,
produces a unified interpretive reading across:
  Vedic Astrology · Chinese Metaphysics · Pythagorean Numerology · Human Design

All calculations are assumed pre-computed by upstream code.
This engine is interpretive only — it synthesizes, never calculates.
"""

import json
import sys
import uuid
import argparse
from datetime import datetime
from pathlib import Path


# ═══════════════════════════════════════════════════════════════════
# REFERENCE DATA
# ═══════════════════════════════════════════════════════════════════

VEDIC_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

VEDIC_SIGN_QUALITIES = {
    "Aries":     {"element": "Fire",   "modality": "Movable",  "ruler": "Mars",      "nature": "Aggressive, pioneering"},
    "Taurus":    {"element": "Earth",  "modality": "Fixed",    "ruler": "Venus",     "nature": "Steady, sensual"},
    "Gemini":    {"element": "Air",    "modality": "Dual",     "ruler": "Mercury",   "nature": "Curious, adaptable"},
    "Cancer":    {"element": "Water",  "modality": "Movable",  "ruler": "Moon",      "nature": "Nurturing, emotional"},
    "Leo":       {"element": "Fire",   "modality": "Fixed",    "ruler": "Sun",       "nature": "Radiant, commanding"},
    "Virgo":     {"element": "Earth",  "modality": "Dual",     "ruler": "Mercury",   "nature": "Analytical, precise"},
    "Libra":     {"element": "Air",    "modality": "Movable",  "ruler": "Venus",     "nature": "Diplomatic, balanced"},
    "Scorpio":   {"element": "Water",  "modality": "Fixed",    "ruler": "Mars",      "nature": "Intense, transformative"},
    "Sagittarius":{"element": "Fire",  "modality": "Dual",     "ruler": "Jupiter",   "nature": "Expansive, philosophical"},
    "Capricorn": {"element": "Earth",  "modality": "Movable",  "ruler": "Saturn",    "nature": "Ambitious, structured"},
    "Aquarius":  {"element": "Air",    "modality": "Fixed",    "ruler": "Saturn",    "nature": "Innovative, detached"},
    "Pisces":    {"element": "Water",  "modality": "Dual",     "ruler": "Jupiter",   "nature": "Mystical, compassionate"},
}

PLANET_MEANINGS = {
    "Sun":       "Soul purpose, vitality, authority, self-expression, father",
    "Moon":      "Mind, emotions, mother, nurturing, intuition, public life",
    "Mars":      "Energy, courage, drive, aggression, siblings, property",
    "Mercury":   "Intellect, communication, commerce, adaptability, speech",
    "Jupiter":   "Wisdom, expansion, fortune, teaching, children, spirituality",
    "Venus":     "Love, beauty, art, relationships, luxuries, vehicles",
    "Saturn":    "Discipline, karma, delay, structure, longevity, service",
    "Rahu":      "Obsession, foreignness, innovation, shadow desire, amplification",
    "Ketu":      "Detachment, past-life mastery, spirituality, isolation, renunciation",
}

NAKSHATRA_MEANINGS = {
    "Ashwini":      "Swift healing energy, horse-headed physicians. Pioneering, impulsive, therapeutic.",
    "Bharani":      "The bearer — ruled by Yama. Transformation through restraint, creative gestation.",
    "Krittika":     "The cutter — ruled by Agni. Sharp, purifying, decisive. Can be critical.",
    "Rohini":       "The red one — ruled by Brahma. Creative, sensual, growth-oriented, magnetic.",
    "Mrigashira":   "Deer's head — ruled by Soma. Seeking, restless, curious, delicate beauty.",
    "Ardra":        "The moist one — ruled by Rudra. Storm energy, emotional intensity, breakthrough.",
    "Punarvasu":    "Return of light — ruled by Aditi. Renewal, nurturing, boundless optimism.",
    "Pushya":       "The nourisher — ruled by Brihaspati. Sacred, protective, ritualistic, wise.",
    "Ashlesha":     "The entwiner — ruled by Sarpa. Kundalini, psychological depth, hypnotic.",
    "Magha":        "The mighty one — ruled by Pitris. Ancestral power, royalty, leadership, tradition.",
    "Purva Phalguni":"The former red one — ruled by Bhaga. Creative leisure, romance, relaxation.",
    "Uttara Phalguni":"The latter red one — ruled by Aryaman. Contracts, partnerships, patronage.",
    "Hasta":        "The hand — ruled by Savitar. Skill, dexterity, craftsmanship, service.",
    "Chitra":       "The brilliant — ruled by Tvashtar. Architecture, charisma, celestial design.",
    "Swati":        "The independent — ruled by Vayu. Freedom, movement, scattering, wind energy.",
    "Vishakha":     "The forked — ruled by Indra-Agni. Determination, goal-orientation, duality.",
    "Anuradha":     "Following devotion — ruled by Mitra. Friendship, alliance, cosmic devotion.",
    "Jyeshtha":     "The eldest — ruled by Indra. Seniority, protection, executive power.",
    "Mula":         "The root — ruled by Nirriti. Destruction for rebirth, investigation, depth.",
    "Purva Ashadha": "The former invincible — ruled by Apas. Water energy, early victory, flow.",
    "Uttara Ashadha": "The latter invincible — ruled by Vishwadevas. Final victory, enduring success.",
    "Shravana":     "The ear — ruled by Vishnu. Listening, learning, three footsteps of wisdom.",
    "Dhanishta":    "The wealthiest — ruled by Vasus. Rhythm, music, prosperity, community.",
    "Shatabhisha":  "Hundred physicians — ruled by Varuna. Healing, occult, circles, concealment.",
    "Purva Bhadrapada":"Former blessed feet — ruled by Aja Ekapada. Fire ritual, asceticism, piercing insight.",
    "Uttara Bhadrapada":"Latter blessed feet — ruled by Ahir Budhnya. Depth, stability, serpent wisdom.",
    "Revati":       "The wealthy — ruled by Pushan. Nourishment, completion, safe passage, compassion.",
}

HOUSE_MEANINGS = {
    1:  "Self, body, personality, appearance, head, overall life direction",
    2:  "Wealth, speech, family, values, food, face, right eye",
    3:  "Courage, siblings, communication, short journeys, hands, ears",
    4:  "Home, mother, heart, emotional foundation, vehicles, property, chest",
    5:  "Creativity, children, romance, intellect, past-life merit, stomach",
    6:  "Health, enemies, debts, service, daily routine, competition, intestines",
    7:  "Partnership, marriage, business, public image, lower back, kidneys",
    8:  "Transformation, occult, inheritance, longevity, secrets, genitals",
    9:  "Fortune, dharma, higher learning, father, long journeys, thighs, guru",
    10: "Career, status, karma, public achievements, knees, authority",
    11: "Gains, income, social networks, aspirations, elder siblings, ankles",
    12: "Loss, isolation, foreign lands, bed pleasures, spirituality, feet, liberation",
}

YOGA_MEANINGS = {
    "Gaja Kesari":        "Jupiter-Moon conjunction or mutual aspect. Wisdom and influence like an elephant-lion.",
    "Buddha-Aditya":      "Mercury-Sun conjunction. High intelligence, eloquence, sharp analytical mind.",
    "Dhana":              "Wealth yoga from 2nd/11th house lords. Natural capacity for financial accumulation.",
    "Raja":               "Royal yoga from Kendra-Trikona lord union. Leadership, authority, prominence.",
    "Kemadruma":          "Moon isolated without planets in adjacent signs. Emotional solitude or self-reliance.",
    "Pancha Mahapurusha": "Five great-person yogas from Mars/Mercury/Jupiter/Venus/Saturn in own/exaltation Kendra.",
    "Viparita Raja":      "Reversal of fortune from dusthana lords in dusthanas. Rise after difficulty.",
    "Amala":              "10th lord with a benefic. Pure reputation, ethical career standing.",
    "Parvata":            "Benefics in Kendras with 1st and 12th clear. Peak of fortune, elevated status.",
    "Sunapha":            "Planet in 2nd from Moon. Resourceful, accumulated wealth through effort.",
    "Anapha":             "Planet in 12th from Moon. Reserved wealth, internal resources, contemplative.",
    "Durudhara":          "Planets in both 2nd and 12th from Moon. Balanced resource flow in and out.",
}


CHINESE_STEMS = {
    "甲": "Jia — Yang Wood. Tall tree, leadership, direct, principled.",
    "乙": "Yi — Yin Wood. Grass, vine, flexible, adaptive, artistic.",
    "丙": "Bing — Yang Fire. Sun, warmth, passion, visibility, charisma.",
    "丁": "Ding — Yin Fire. Candle flame, focused, refined, perceptive.",
    "戊": "Wu — Yang Earth. Mountain, stable, reliable, slow-moving, protective.",
    "己": "Ji — Yin Earth. Soil, nurturing, accommodating, detail-oriented.",
    "庚": "Geng — Yang Metal. Axe, sword, decisive, transformative, justice-oriented.",
    "辛": "Xin — Yin Metal. Jewelry, refined, elegant, precise, value-conscious.",
    "壬": "Ren — Yang Water. Ocean, free-flowing, intelligent, broad-thinking.",
    "癸": "Gui — Yin Water. Mist, rain, intuitive, penetrating, mysterious.",
}

CHINESE_BRANCHES = {
    "子": "Zi — Rat. Yang Water. Clever, charming, resourceful, social.",
    "丑": "Chou — Ox. Yin Earth. Steady, methodical, patient, enduring.",
    "寅": "Yin — Tiger. Yang Wood. Bold, competitive, adventurous, charismatic.",
    "卯": "Mao — Rabbit. Yin Wood. Gentle, diplomatic, refined, peace-loving.",
    "辰": "Chen — Dragon. Yang Earth. Magnanimous, ambitious, energetic, proud.",
    "巳": "Si — Snake. Yin Fire. Wise, intuitive, strategic, magnetic.",
    "午": "Wu — Horse. Yang Fire. Free-spirited, passionate, independent, dynamic.",
    "未": "Wei — Goat. Yin Earth. Creative, gentle, compassionate, aesthetic.",
    "申": "Shen — Monkey. Yang Metal. Inventive, witty, versatile, curious.",
    "酉": "You — Rooster. Yin Metal. Organized, articulate, punctual, confident.",
    "戌": "Xu — Dog. Yang Earth. Loyal, just, protective, dependable.",
    "亥": "Hai — Pig. Yin Water. Generous, warm, sensuous, tolerant.",
}


NUMEROLOGY_MEANINGS = {
    1:  ("The Leader", "Independent, pioneering, ambitious, original. Shadow: domineering, impatient."),
    2:  ("The Diplomat", "Cooperative, sensitive, harmonious, intuitive. Shadow: passive, overly dependent."),
    3:  ("The Communicator", "Creative, expressive, joyful, social. Shadow: scattered, superficial, dramatic."),
    4:  ("The Builder", "Practical, disciplined, reliable, systematic. Shadow: rigid, stubborn, workaholic."),
    5:  ("The Freedom-Seeker", "Adventurous, versatile, progressive, sensual. Shadow: restless, irresponsible, addictive."),
    6:  ("The Nurturer", "Responsible, loving, harmonious, service-oriented. Shadow: martyr, controlling, anxious."),
    7:  ("The Seeker", "Analytical, spiritual, introspective, wise. Shadow: aloof, cynical, isolated."),
    8:  ("The Powerhouse", "Ambitious, authoritative, material mastery, executive. Shadow: ruthless, materialistic, intimidating."),
    9:  ("The Humanitarian", "Compassionate, wise, artistic, global consciousness. Shadow: detached, impractical, martyr."),
    11: ("The Illuminated", "Master number. Intuitive, visionary, inspirational. Shadow: nervous, high-strung, self-doubting. Keep as 11 — never reduce."),
    22: ("The Master Builder", "Master number. Practical vision, large-scale manifestation, leadership. Shadow: overwhelmed by own potential, controlling. Keep as 22 — never reduce."),
    33: ("The Master Teacher", "Master number. Selfless service, unconditional love, spiritual guidance. Shadow: over-sacrificing, emotionally overloaded. Keep as 33 — never reduce."),
}

PINNACLE_MEANINGS = {
    1:  "A period of independence and self-discovery. Take initiative; forge your own path.",
    2:  "Cooperation and relationships take center stage. Develop patience and diplomacy.",
    3:  "Creative self-expression and social expansion. Share your gifts with the world.",
    4:  "Build foundations — career, home, long-term structures. Hard work pays off.",
    5:  "Freedom, change, adventure. Expect unexpected opportunities. Stay adaptable.",
    6:  "Responsibility, family, service. Nurture others while maintaining boundaries.",
    7:  "Inner growth, study, spiritual development. A contemplative cycle — less outer action, more inner work.",
    8:  "Material achievement, power, recognition. Financial growth and authority are available.",
    9:  "Completion and humanitarian service. Let go of what no longer serves; give back.",
    11: "Master cycle of illumination. Intuition and spiritual insight are heightened. High nervous energy — ground yourself.",
    22: "Master cycle of large-scale building. Practical vision meets real-world manifestation.",
    33: "Master cycle of teaching and unconditional love. Serve humanity through wisdom.",
}

CHALLENGE_MEANINGS = {
    0:  "No single major challenge number. Life tests are varied and situational.",
    1:  "Challenge: Develop independence and overcome self-doubt. Learn to assert yourself authentically.",
    2:  "Challenge: Overcome oversensitivity and fear of confrontation. Build confidence in your own voice.",
    3:  "Challenge: Avoid scattering energy. Develop focus, discipline, and follow-through on creative projects.",
    4:  "Challenge: Release rigidity and perfectionism. Learn flexibility and trust in the process.",
    5:  "Challenge: Avoid escapism and impulsiveness. Channel freedom-seeking into constructive change.",
    6:  "Challenge: Balance service to others with self-care. Release perfectionist expectations in relationships.",
    7:  "Challenge: Overcome isolation and cynicism. Trust your depth without cutting yourself off from others.",
    8:  "Challenge: Integrate power with compassion. Avoid materialistic tunnel vision.",
}

# Human Design
HD_TYPES = {
    "Generator":        "The builders and doers — 70% of humanity. Your gift is sustainable life-force energy and mastery through response. Signature: Satisfaction. Not-Self: Frustration.",
    "Manifesting Generator": "A hybrid type — the multi-passionate builders. Fast, efficient, meant to skip steps. Signature: Satisfaction / Peace. Not-Self: Frustration / Anger.",
    "Projector":        "The guides — about 20% of humanity. Your gift is seeing into others and directing energy efficiently. Signature: Success. Not-Self: Bitterness.",
    "Manifestor":       "The initiators — about 8% of humanity. Your gift is starting things and impacting others. Signature: Peace. Not-Self: Anger.",
    "Reflector":        "The mirrors — about 1% of humanity. Your gift is reflecting the health of your environment. Signature: Surprise. Not-Self: Disappointment.",
}

HD_AUTHORITIES = {
    "Emotional":            "Emotional Solar Plexus — ride the wave. No truth in the now; wait for clarity across the full emotional arc. For big decisions, sleep on it (multiple nights if possible).",
    "Sacral":               "Sacral — gut response in the moment. The uh-huh / uh-uh. Binary, immediate, and trustworthy. Not a voice in the head — a physical, guttural response.",
    "Splenic":              "Splenic — instantaneous, quiet, once-only. A hit of knowing in the body that speaks in the now and never repeats. Trust the first hit; if you miss it, wait for the next.",
    "Ego":                  "Ego/Heart — what your will truly wants. Voice of the heart center. If your heart isn't in it, don't do it. Your word is your bond.",
    "Self-Projected":       "Self/G-Center — truth emerges when you hear yourself speak. Talk it out with a trusted listener who won't fix or advise, just reflect.",
    "Environmental":        "Mental/No Inner Authority — clarity comes through the right environment. Sound out decisions by discussing them in your correct spaces. Lunar cycle clarity for big calls.",
    "Lunar":                "Lunar Cycle — Reflectors only. Wait 28-29 days through a full lunar cycle. Clarity accumulates gradually; don't rush to decide.",
}

HD_GATES = {
    1:  "Gate 1 — The Creative: Self-expression through unique creative impulse. When aligned, originality flows naturally.",
    2:  "Gate 2 — The Direction of the Self: Receptivity to life's direction. Knowing where to go comes through being, not doing.",
    3:  "Gate 3 — Difficulty at the Beginning: Mutation through sequencing. Innovation that breaks old patterns to birth new order.",
    4:  "Gate 4 — Youthful Folly: Mental answers that provide solutions. Your mind formulates answers others need — share them.",
    5:  "Gate 5 — Fixed Rhythms: Natural timing and patience. When aligned, you sync with the rhythms of life without forcing.",
    6:  "Gate 6 — The Friction: Emotional intimacy and conflict resolution. Gate of feeling — emotional definition shapes relating.",
    7:  "Gate 7 — The Role of the Self in Interaction: Leadership by design. Natural authority that others recognize and follow.",
    8:  "Gate 8 — Contribution: Making things known through creative expression. The artist who shows humanity itself to itself.",
    9:  "Gate 9 — The Taming Power of the Small: Focused attention to detail. Small, consistent actions build massive results.",
    10: "Gate 10 — The Behavior of the Self: Authentic self-love and behavior. Living your truth empowers others to live theirs.",
    11: "Gate 11 — Peace: Ideas. A wellspring of conceptual inspiration. Ideas arrive — share them without attachment to execution.",
    12: "Gate 12 — Standstill: Caution and the capacity to articulate emotion. Your words carry the feeling; speak when moved.",
    13: "Gate 13 — The Listener: Listening to others' stories. People naturally confide in you — a keeper of collective memory.",
    14: "Gate 14 — Power Skills: Resource and direction management. The fuel that powers the material world — use with purpose.",
    15: "Gate 15 — Modesty: Extremes of rhythm and love of humanity. You oscillate between extremes but find your natural rhythm.",
    16: "Gate 16 — Skills: Enthusiasm and talent identification. Recognize and celebrate skill in yourself and others.",
    17: "Gate 17 — The Opinion: Formulating opinions for the collective. Your mind frames what needs improving for the tribe.",
    18: "Gate 18 — Correction: Pattern recognition and improvement. You see what can be better — the gift of refinement.",
    19: "Gate 19 — Wanting: Sensitivity to basic needs and belonging. Deep need for connection and tribe.",
    20: "Gate 20 — The Now: Pure presence and contemplation. The capacity to be fully in the present moment.",
    21: "Gate 21 — The Hunter/Huntress: Control over resources for the tribe. You manage material well-being with authority.",
    22: "Gate 22 — Grace: Emotional openness and beauty. Charm that opens doors — transmute mood into art.",
    23: "Gate 23 — Assimilation: Articulating new understanding. Your words can shatter old paradigms and install new ones.",
    24: "Gate 24 — Returning: Rationalization and the return to truth. Cyclical bursts of insight — then silence and integration.",
    25: "Gate 25 — Innocence: Universal love and spirit of the self. Unconditional love as a lived experience.",
    26: "Gate 26 — The Taming Power of the Great: Ego-driven will to achieve. Salesmanship, persuasion, getting things done.",
    27: "Gate 27 — Nourishment: Caring and feeding others. Responsibility to nurture — both physically and emotionally.",
    28: "Gate 28 — The Game Player: Struggle for life's meaning. You wrestle with purpose — the struggle itself is the point.",
    29: "Gate 29 — The Abyss: Saying yes to life's experiences. Perseverance through commitment. Say yes selectively.",
    30: "Gate 30 — The Clinging Fire: Desire, feeling, and emotional depth. Deep emotional experience — your fire is contagious.",
    31: "Gate 31 — Leading: Democratic leadership. Your voice carries weight in collective decision-making.",
    32: "Gate 32 — Duration: Instinct for continuity and longevity. You know what will last and what will fade.",
    33: "Gate 33 — Retrea: Privacy and reflection. Wisdom comes in seclusion — then you share it with the tribe.",
    34: "Gate 34 — The Power of the Great: Pure sacral power. Raw life-force energy — channel it into what you love.",
    35: "Gate 35 — Progress: Hunger for new experiences. You drive change and seek novelty — make it meaningful.",
    36: "Gate 36 — Crisis: Emotional depth and exploration. Crisis leads to growth — don't fear the intensity.",
    37: "Gate 37 — Friendship: Harmony and community. The glue of the tribe — create bonds that hold people together.",
    38: "Gate 38 — The Fighter: Struggle for individual purpose. You fight for what matters to you — pick your battles.",
    39: "Gate 39 — The Provocateur: Emotional provocation to release stuck energy. You stir things up so they can move.",
    40: "Gate 40 — Deliverance: Aloneness and the will to provide. You need solitude to rest — then you support others.",
    41: "Gate 41 — Decrease: Imagination and fantasy. The seed of all human experience — you dream what hasn't been dreamed.",
    42: "Gate 42 — Increase: Completion through growth. You bring things to their natural fruition.",
    43: "Gate 43 — Insight: Breakthrough mental clarity. Epiphanies that arrive in their own timing and must be stated simply.",
    44: "Gate 44 — Coming to Meet: Pattern recognition from the past. Your instincts pick up patterns others miss.",
    45: "Gate 45 — Gathering Together: The king/queen. Resources flow to you when you serve the tribe with heart.",
    46: "Gate 46 — The Determination of the Self: Love of the body and serendipity. Right place, right time — trust it.",
    47: "Gate 47 — Oppression: Mental pressure to make sense of experience. A restless mind seeking resolution — creative process.",
    48: "Gate 48 — The Well: Depth of knowing. Wisdom and skill that goes deep but needs the right question to surface.",
    49: "Gate 49 — Revolution: Principles and transformation. You reject what doesn't align and reshape relationships accordingly.",
    50: "Gate 50 — The Cauldron: Values and nurturing the community. You uphold standards — moral compass for the tribe.",
    51: "Gate 51 — The Arousing: Shock and awakening through individual will. Life shocks you into your unique path.",
    52: "Gate 52 — Keeping Still: Stillness and focused concentration. The mountain — you ground energy through inaction.",
    53: "Gate 53 — Development: Starting things. You initiate cycles of growth — beginnings come naturally.",
    54: "Gate 54 — The Marrying Maiden: Ambition and material ascent. Drive to rise — use it in service of something larger.",
    55: "Gate 55 — Abundance: Emotional spirit and abundance. Deep emotional waves that carry creative fertility.",
    56: "Gate 56 — The Wanderer: Storytelling and stimulation. You weave experience into stories others learn from.",
    57: "Gate 57 — The Gentle: Intuitive clarity in the present moment. Penetrating insight that cuts through noise.",
    58: "Gate 58 — The Joyous: Vitality and the joy of living. The drive to improve and correct — channeled as aliveness.",
    59: "Gate 59 — Sexuality: Breaking through barriers. Deep intimacy and creative union — connecting at a fundamental level.",
    60: "Gate 60 — Limitation: Acceptance of limitation. Constraints create form, and form creates beauty. Patience with process.",
    61: "Gate 61 — Mystery: Inner truth and the pressure to know. Mystery as a lived inquiry — not something to solve.",
    62: "Gate 62 — Detail: Expressing understanding through precise detail. Name things clearly — your precision is a gift.",
    63: "Gate 63 — Doubt: Logical pressure to question. After doubt comes certainty — your skepticism serves the truth.",
    64: "Gate 64 — Confusion: Imagination before completion. The creative chaos before clarity — don't rush it.",
}

HD_CHANNELS = {
    "1-8":  "Channel of Inspiration — Creative role model expressing unique direction.",
    "2-14": "Channel of the Beat — The key-keeper with direction for resources.",
    "3-60": "Channel of Mutation — Pulse that initiates change and innovation.",
    "4-63": "Channel of Logic — Mental clarity through doubt and answers.",
    "5-15": "Channel of Rhythm — Being in the flow of natural timing.",
    "6-59": "Channel of Intimacy — Deep bonding through emotional openness.",
    "7-31": "Channel of the Alpha — Leadership for the collective good.",
    "9-52": "Channel of Concentration — Deep focus and stillness that produces mastery.",
    "10-20": "Channel of Awakening — Commitment to higher self and present living.",
    "10-34": "Channel of Exploration — Following your own convictions with power.",
    "10-57": "Channel of Perfected Form — Living beauty and intuitive design.",
    "11-56": "Channel of Curiosity — The seeker searching for meaning through stories.",
    "12-22": "Channel of Openness — Emotional expression that moves others.",
    "13-33": "Channel of the Prodigal — Listening and sharing lived wisdom.",
    "15-5": "Channel of Rhythm — (same as 5-15).",
    "16-48": "Channel of Talent — Depth of skill emerging through practice.",
    "17-62": "Channel of Acceptance — Organizing understanding through detail.",
    "18-58": "Channel of Judgment — Pattern correction in service of life.",
    "19-49": "Channel of Synthesis — Sensitivity to tribe and principled relating.",
    "20-34": "Channel of Charisma — Pure presence in action. The busy channel.",
    "20-57": "Channel of the Brainwave — Knowing in the now through intuitive awareness.",
    "21-45": "Channel of Money — Material leadership for the tribe.",
    "23-43": "Channel of Structuring — Genius to freak. Unique insight breaking old frames.",
    "24-61": "Channel of Awareness — The thinker. Inspiration cycling into rational form.",
    "25-51": "Channel of Initiation — The shaman/priestess. Initiation through love or shock.",
    "26-44": "Channel of Surrender — Transmitting instinct through persuasion.",
    "27-50": "Channel of Preservation — Nurturing the tribe through values.",
    "28-38": "Channel of Struggle — Finding purpose through fighting for meaning.",
    "29-46": "Channel of Discovery — Succeeding through commitment and letting go.",
    "30-41": "Channel of Recognition — Feeling into new experiences as fuel for imagination.",
    "32-54": "Channel of Transformation — Ambition aligned with instinct for what endures.",
    "34-57": "Channel of Power — Archetype of power channeled through intuitive action.",
    "35-36": "Channel of Transitoriness — Emotional experience through new things.",
    "37-40": "Channel of Community — The bargain. Belonging through mutual support.",
    "39-55": "Channel of Emoting — Emotional provocation leading to creative spirit.",
    "42-53": "Channel of Maturation — Cyclic development bringing things to completion.",
    "47-64": "Channel of Abstraction — Mental pressure resolving into imaginative form.",
}

ELEMENT_FIVE_ELEMENT = {
    "Wood":  "Growth, expansion, vision, flexibility. Wood people are pioneers and strategists.",
    "Fire":  "Passion, charisma, warmth, transformation. Fire people inspire and energize.",
    "Earth": "Stability, nurturing, reliability, grounded. Earth people build and sustain.",
    "Metal": "Structure, precision, justice, refinement. Metal people organize and perfect.",
    "Water": "Wisdom, adaptability, depth, communication. Water people flow and penetrate.",
}

# ═══════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════

def safe_get(d, *keys, default="Not provided"):
    """Navigate nested dicts safely."""
    for k in keys:
        if isinstance(d, dict):
            d = d.get(k, {})
        else:
            return default
    return d if d != {} and d is not None else default


def is_empty(val):
    """Check if a value is effectively empty."""
    if val is None:
        return True
    if isinstance(val, str) and val.strip() == "":
        return True
    if isinstance(val, (list, dict)) and len(val) == 0:
        return True
    return False


def ben_mal_label(planet):
    """Return benefic/malefic label."""
    natural = "Benefic" if planet.get("natural_benefic") else "Malefic"
    functional = "Benefic" if planet.get("functional_benefic") else "Malefic"
    return f"Natural {natural}, Functional {functional}"


def format_num(num):
    """Format a number, noting master numbers."""
    if num in (11, 22, 33):
        return f"{num} (Master Number — do not reduce)"
    return str(num)


# ═══════════════════════════════════════════════════════════════════
# SECTION INTERPRETERS
# ═══════════════════════════════════════════════════════════════════

def interpret_vedic(vedic, query_focus=""):
    """Interpret Vedic chart section."""
    if is_empty(vedic):
        return {"overview": "Not provided — no Vedic data available.", "detailed": {}, "summary": ""}

    lagna = vedic.get("lagna", {})
    planets = vedic.get("planets", [])
    houses = vedic.get("houses", [])
    dasha = vedic.get("current_dasha", {})
    yogas = vedic.get("yogas", [])
    transits = vedic.get("transits", [])
    divisional = vedic.get("divisional_charts", {})

    # --- Lagna ---
    lagna_sign = lagna.get("sign", "Not provided")
    lagna_nak = lagna.get("nakshatra", "Not provided")
    lagna_pada = lagna.get("pada", "Not provided")
    lagna_qual = VEDIC_SIGN_QUALITIES.get(lagna_sign, {})
    lagna_detail = {
        "sign": lagna_sign,
        "degree": lagna.get("degree", "Not provided"),
        "nakshatra": lagna_nak,
        "pada": lagna_pada,
        "sign_quality": lagna_qual.get("nature", "Not provided") if lagna_qual else "Not provided",
        "element": lagna_qual.get("element", "Not provided") if lagna_qual else "Not provided",
        "modality": lagna_qual.get("modality", "Not provided") if lagna_qual else "Not provided",
        "interpretation": f"Ascendant in {lagna_sign} ({lagna_qual.get('element', '')} {lagna_qual.get('modality', '')}) — {lagna_qual.get('nature', '')}. {lagna_nak} nakshatra pada {lagna_pada} adds its specific flavor to the rising personality."
    }

    # --- Planets ---
    planet_details = []
    for p in planets:
        name = p.get("name", "")
        sign = p.get("sign", "")
        house = p.get("house", 0)
        nak = p.get("nakshatra", "")
        retro = " (Retrograde)" if p.get("is_retrograde") else ""
        ben_mal = ben_mal_label(p)
        meaning = PLANET_MEANINGS.get(name, "")
        planet_details.append({
            "planet": name,
            "sign": sign,
            "house": house,
            "nakshatra": nak,
            "is_retrograde": p.get("is_retrograde", False),
            "benefic_malefic": ben_mal,
            "interpretation": f"{name}{retro} in {sign} (House {house}), {nak} nakshatra. {ben_mal}. Governs: {meaning}."
        })

    # --- Houses ---
    house_details = []
    for h in houses:
        num = h.get("number", 0)
        sign = h.get("sign", "")
        lords = h.get("lords", [])
        meaning = HOUSE_MEANINGS.get(num, "")
        house_details.append({
            "number": num,
            "sign": sign,
            "lords": lords,
            "meaning": meaning,
            "interpretation": f"House {num} ({meaning}) in {sign}, ruled by {', '.join(lords)}."
        })

    # --- Dasha ---
    md_lord = dasha.get("mahadasha_lord", "Not provided") if dasha else "Not provided"
    ad_lord = dasha.get("antardasha_lord", "Not provided") if dasha else "Not provided"
    dasha_detail = {
        "mahadasha_lord": md_lord,
        "mahadasha_period": f"{dasha.get('mahadasha_start', '')} to {dasha.get('mahadasha_end', '')}" if dasha else "Not provided",
        "antardasha_lord": ad_lord,
        "antardasha_period": f"{dasha.get('antardasha_start', '')} to {dasha.get('antardasha_end', '')}" if dasha else "Not provided",
        "interpretation": f"Currently running {md_lord} Mahadasha with {ad_lord} Antardasha. This period's themes are shaped by {md_lord}'s placement and {ad_lord}'s activation."
    }

    # --- Yogas ---
    yoga_details = []
    for y in yogas:
        yoga_details.append({
            "yoga": y,
            "meaning": YOGA_MEANINGS.get(y, "A significant planetary combination."),
            "interpretation": f"{y}: {YOGA_MEANINGS.get(y, 'An important planetary combination affecting life outcomes.')}"
        })

    # --- Transits ---
    transit_details = []
    for t in transits:
        transit_details.append({
            "planet": t.get("planet", ""),
            "transit_sign": t.get("transit_sign", ""),
            "transit_house": t.get("transit_house", 0),
            "aspects_natal": t.get("aspects_natal", "Not provided"),
            "interpretation": f"Transit {t.get('planet', '')} in {t.get('transit_sign', '')} (natal House {t.get('transit_house', 0)}). {t.get('aspects_natal', '')}"
        })

    # --- Divisional ---
    div_detail = {}
    if divisional:
        d9 = divisional.get("d9", {})
        d10 = divisional.get("d10", {})
        div_detail["d9_navamsha"] = {
            "notes": d9.get("notes", "Not provided"),
            "interpretation": "The D9 (Navamsha) reveals the inner self, relationship capacity, and deeper karmic patterns beneath the surface chart."
        }
        div_detail["d10_dashamsha"] = {
            "notes": d10.get("notes", "Not provided"),
            "interpretation": "The D10 (Dashamsha) reveals career trajectory, professional reputation, and action in the material world."
        }

    # --- Overview ---
    nakshatras_in_chart = list(set(
        [lagna_nak] + [p.get("nakshatra", "") for p in planets if p.get("nakshatra")]
    ))
    overview = (
        f"Ascendant {lagna_sign} shapes the lens through which all of life is experienced — "
        f"a {lagna_qual.get('element', '')} rising with {lagna_qual.get('modality', '').lower()} rhythm. "
        f"The chart carries the nakshatras {', '.join(nakshatras_in_chart[:5])}. "
        f"Currently moving through {md_lord}-{ad_lord} dasha period, "
        f"which sets the temporal backdrop for all current developments."
    )

    summary = (
        f"Your {lagna_sign} Ascendant gives you a natural {lagna_qual.get('nature', 'style').lower() if lagna_qual else 'distinct'} approach to life. "
        f"The {md_lord} Mahadasha colors this entire period with the energy of {PLANET_MEANINGS.get(md_lord, md_lord)}. "
        + (f"Active yogas in your chart — {', '.join(yogas[:3])} — indicate special karmic signatures worth exploring in depth." if yogas else "No specific planetary yogas flagged in the provided data.")
    )

    return {
        "overview": overview,
        "detailed": {
            "lagna": lagna_detail,
            "planets": planet_details,
            "houses": house_details,
            "dasha": dasha_detail,
            "yogas": yoga_details,
            "transits": transit_details,
            "divisional": div_detail,
        },
        "summary": summary,
    }


def interpret_chinese(chinese, query_focus=""):
    """Interpret Chinese metaphysics section."""
    if is_empty(chinese):
        return {"overview": "Not provided — no Chinese metaphysical data available.", "detailed": {}, "summary": ""}

    pillars = chinese.get("four_pillars", {})
    day_master = chinese.get("day_master", "Not provided")
    fav_elems = chinese.get("favorable_elements", [])
    unfav_elems = chinese.get("unfavorable_elements", [])
    luck_pillar = chinese.get("current_luck_pillar", {})
    zwds = chinese.get("zwds", {})

    # --- Four Pillars ---
    pillar_detail = {}
    for pillar_key in ("year", "month", "day", "hour"):
        p = pillars.get(pillar_key, {})
        stem = p.get("stem", "Not provided")
        branch = p.get("branch", "Not provided")
        element = p.get("element", "Not provided")
        stem_meaning = CHINESE_STEMS.get(stem, "")
        branch_meaning = CHINESE_BRANCHES.get(branch, "")
        pillar_detail[f"{pillar_key}_pillar"] = {
            "stem": stem,
            "branch": branch,
            "element": element,
            "stem_meaning": stem_meaning,
            "branch_meaning": branch_meaning,
            "interpretation": f"{stem} ({stem_meaning[:40]}...) over {branch} ({branch_meaning[:40]}...). Element: {element}."
        }

    # --- Day Master ---
    dm_meaning = CHINESE_STEMS.get(day_master, "")
    dm_interpretation = {
        "day_master": day_master,
        "meaning": dm_meaning,
        "favorable_elements": fav_elems,
        "unfavorable_elements": unfav_elems,
        "interpretation": (
            f"Day Master {day_master} ({dm_meaning}) is your self-element — the core you. "
            f"Elements that support you: {', '.join(fav_elems) if fav_elems else 'Not specified'}. "
            f"Elements that challenge you: {', '.join(unfav_elems) if unfav_elems else 'Not specified'}."
        )
    }

    # --- Luck Pillar ---
    lp = luck_pillar
    luck_detail = {
        "pillar": lp.get("pillar", "Not provided"),
        "age_range": lp.get("age_range", "Not provided"),
        "element_relationship": lp.get("element_relationship", "Not provided"),
        "interpretation": (
            f"Current Luck Pillar: {lp.get('pillar', '')} ({lp.get('age_range', '')}). "
            f"Relationship to Day Master: {lp.get('element_relationship', 'Not specified')}. "
            f"This 10-year cycle sets the broader context for all shorter-term transits."
        )
    }

    # --- ZWDS ---
    zwds_detail = {}
    if not is_empty(zwds):
        zwds_detail["major_stars"] = zwds.get("major_stars", {})
        zwds_detail["palaces"] = zwds.get("palaces", {})
        zwds_detail["interpretation"] = (
            "Zi Wei Dou Shu provides the palace-based star map of life's twelve domains. "
            "Major stars in key palaces indicate areas of natural strength and challenge."
        )
    else:
        zwds_detail["note"] = "ZWDS data not provided — this is optional."

    overview = (
        f"Day Master {day_master} — your core elemental identity — interacts with the surrounding pillars "
        f"to shape your constitutional strengths. Favorable elements {', '.join(fav_elems) if fav_elems else '(not specified)'} "
        f"support your balance. Current Luck Pillar: {lp.get('pillar', 'Not provided')}."
    )

    summary = (
        f"Your Day Master {day_master} shapes how you navigate life's terrain. "
        f"Support comes from {', '.join(fav_elems) if fav_elems else 'balancing elements'}; "
        f"challenge from {', '.join(unfav_elems) if unfav_elems else 'imbalancing elements'}. "
        f"The current {lp.get('pillar', '')} Luck Pillar ({lp.get('age_range', '')}) "
        f"is a {lp.get('element_relationship', 'formative')} period."
    )

    return {
        "overview": overview,
        "detailed": {
            "four_pillars": pillar_detail,
            "day_master_analysis": dm_interpretation,
            "luck_pillar": luck_detail,
            "zwds": zwds_detail,
        },
        "summary": summary,
    }


def interpret_numerology(numerology, name=""):
    """Interpret Pythagorean numerology section."""
    if is_empty(numerology):
        return {"overview": "Not provided — no numerology data available.", "detailed": {}, "summary": ""}

    lp = numerology.get("life_path", "Not provided")
    expr = numerology.get("expression", "Not provided")
    soul = numerology.get("soul_urge", "Not provided")
    pers = numerology.get("personality", "Not provided")
    bday = numerology.get("birthday", "Not provided")
    py = numerology.get("personal_year", "Not provided")
    pm = numerology.get("personal_month", "Not provided")
    pd = numerology.get("personal_day", "Not provided")
    pinnacles = numerology.get("pinnacle_cycles", [])
    challenges = numerology.get("challenge_cycles", [])

    def num_detail(num, label):
        """Format a number detail with master number protection."""
        n_str = format_num(num)
        meaning = NUMEROLOGY_MEANINGS.get(num, ("", ""))
        return {
            "number": num,
            "is_master": num in (11, 22, 33),
            "title": meaning[0] if meaning else "",
            "meaning": meaning[1] if meaning else "",
            "interpretation": f"{label}: {n_str} — {meaning[0] if meaning else 'Unknown'}. {meaning[1] if meaning else ''}"
        }

    # Core numbers
    core_numbers = {
        "life_path": num_detail(lp, "Life Path"),
        "expression": num_detail(expr, "Expression/Destiny"),
        "soul_urge": num_detail(soul, "Soul Urge/Heart's Desire"),
        "personality": num_detail(pers, "Personality"),
        "birthday": num_detail(bday, "Birthday Number"),
    }

    # Pinnacle cycles
    pinnacle_detail = []
    for pc in pinnacles:
        pn = pc.get("number", 0)
        pinnacle_detail.append({
            "age": pc.get("age", "Not provided"),
            "number": pn,
            "is_master": pn in (11, 22, 33),
            "interpretation": f"Ages {pc.get('age', '')}: Number {format_num(pn)} — {PINNACLE_MEANINGS.get(pn, pc.get('meaning', ''))}"
        })

    # Challenge cycles
    challenge_detail = []
    for cc in challenges:
        cn = cc.get("number", 0)
        challenge_detail.append({
            "age": cc.get("age", "Not provided"),
            "number": cn,
            "is_master": cn in (11, 22, 33),
            "interpretation": f"Ages {cc.get('age', '')}: Number {format_num(cn)} — {CHALLENGE_MEANINGS.get(cn, 'A period of growth through challenge.')}"
        })

    # Current timing
    timing_detail = {
        "personal_year": num_detail(py, "Personal Year"),
        "personal_month": num_detail(pm, "Personal Month"),
        "personal_day": num_detail(pd, "Personal Day"),
        "interpretation": (
            f"In a {format_num(py)} Personal Year, {format_num(pm)} Personal Month, "
            f"{format_num(pd)} Personal Day. This timing reveals the energetic weather right now."
        )
    }

    overview = (
        f"Life Path {format_num(lp)} is your core curriculum — the lesson your soul signed up for. "
        f"Expression {format_num(expr)} shows how you manifest that purpose. "
        f"Soul Urge {format_num(soul)} is what truly drives you beneath the surface. "
        f"Currently in a {format_num(py)} Personal Year."
    )

    summary = (
        f"Life Path {format_num(lp)}: {NUMEROLOGY_MEANINGS.get(lp, ('', ''))[1][:120]}. "
        f"You're here to {NUMEROLOGY_MEANINGS.get(lp, ('', ''))[0].lower()}. "
        f"Current {format_num(py)} Personal Year sets the theme — align actions with this number's rhythm."
    )

    return {
        "overview": overview,
        "detailed": {
            "core_numbers": core_numbers,
            "pinnacle_cycles": pinnacle_detail,
            "challenge_cycles": challenge_detail,
            "current_timing": timing_detail,
        },
        "summary": summary,
    }


def interpret_human_design(hd, query_focus=""):
    """Interpret Human Design section."""
    if is_empty(hd):
        return {"overview": "Not provided — no Human Design data available.", "detailed": {}, "summary": ""}

    hd_type = hd.get("type", "Not provided")
    authority = hd.get("authority", "Not provided")
    profile = hd.get("profile", "Not provided")
    definition = hd.get("definition", "Not provided")
    inc_cross = hd.get("incarnation_cross", "Not provided")
    cons_sun = hd.get("conscious_sun_gate", "Not provided")
    cons_earth = hd.get("conscious_earth_gate", "Not provided")
    unc_sun = hd.get("unconscious_sun_gate", "Not provided")
    unc_earth = hd.get("unconscious_earth_gate", "Not provided")
    active_gates = hd.get("active_gates", [])
    active_channels = hd.get("active_channels", [])
    not_self = hd.get("not_self_theme", "Not provided")
    signature = hd.get("signature", "Not provided")
    transit_gates = hd.get("transit_gates_activated", [])

    type_info = HD_TYPES.get(hd_type, "")
    auth_info = HD_AUTHORITIES.get(authority, "")

    # Type + Authority
    ta_detail = {
        "type": hd_type,
        "type_description": type_info,
        "authority": authority,
        "authority_description": auth_info,
        "signature": signature,
        "not_self_theme": not_self,
        "interpretation": (
            f"Type: {hd_type}. {type_info} "
            f"Authority: {authority}. {auth_info} "
            f"Your Signature (correctness indicator) is {signature}. "
            f"Your Not-Self Theme (wrongness indicator) is {not_self}."
        )
    }

    # Profile
    profile_detail = {
        "profile": profile,
        "interpretation": f"Profile {profile} describes your role and costume — how you navigate the world and how others see you. Each profile line carries specific themes of personal vs. transpersonal orientation."
    }

    # Incarnation Cross
    cross_detail = {
        "incarnation_cross": inc_cross,
        "interpretation": f"Incarnation Cross {inc_cross} is your life's thematic purpose — the plot your life is written around. It's not what you do but the flavor of why you're here."
    }

    # Definition
    def_detail = {
        "definition": definition,
        "interpretation": f"Definition '{definition}' describes how your defined centers connect and process energy. This shapes your decision-making speed, relational dynamics, and information processing style."
    }

    # Gates
    gate_detail = []
    for g in active_gates:
        gate_detail.append({
            "gate": g,
            "name": HD_GATES.get(g, f"Gate {g}").split(" — ")[-1] if " — " in HD_GATES.get(g, "") else HD_GATES.get(g, f"Gate {g}"),
            "interpretation": HD_GATES.get(g, f"Gate {g} — A consistent thematic energy in your design.")
        })

    # Channels
    channel_detail = []
    for ch in active_channels:
        channel_detail.append({
            "channel": ch,
            "interpretation": HD_CHANNELS.get(ch, f"Channel {ch} — A life-force pathway connecting two centers in your design.")
        })

    # Sun/Earth
    sun_earth_detail = {
        "conscious_sun": {"gate": cons_sun, "meaning": HD_GATES.get(cons_sun, f"Gate {cons_sun}")},
        "conscious_earth": {"gate": cons_earth, "meaning": HD_GATES.get(cons_earth, f"Gate {cons_earth}")},
        "unconscious_sun": {"gate": unc_sun, "meaning": HD_GATES.get(unc_sun, f"Gate {unc_sun}")},
        "unconscious_earth": {"gate": unc_earth, "meaning": HD_GATES.get(unc_earth, f"Gate {unc_earth}")},
        "interpretation": (
            f"Conscious (Personality) Sun Gate {cons_sun}/Earth Gate {cons_earth} — what you identify with consciously. "
            f"Unconscious (Design) Sun Gate {unc_sun}/Earth Gate {unc_earth} — the deeper genetic imprint driving you."
        )
    }

    # Transit gates
    transit_detail = []
    for tg in transit_gates:
        transit_detail.append({
            "gate": tg,
            "interpretation": f"Current transit activation: {HD_GATES.get(tg, f'Gate {tg}')}"
        })

    overview = (
        f"A {hd_type} with {authority} Authority and {profile} Profile. "
        f"Your strategy is to {'respond' if 'Generator' in hd_type else 'wait for the invitation' if hd_type == 'Projector' else 'inform before acting' if hd_type == 'Manifestor' else 'wait a lunar cycle' if hd_type == 'Reflector' else 'follow your authority'}. "
        f"Incarnation Cross: {inc_cross}. {definition} Definition. "
        f"Active gates: {len(active_gates)}; channels: {len(active_channels)}."
    )

    summary = (
        f"As a {hd_type}, your strategy flows through {authority} Authority. "
        f"When aligned, you feel {signature}; when off-track, {not_self} is the signal. "
        f"Your {profile} Profile and {inc_cross} Incarnation Cross shape how and why you're here."
    )

    return {
        "overview": overview,
        "detailed": {
            "type_and_authority": ta_detail,
            "profile": profile_detail,
            "definition": def_detail,
            "incarnation_cross": cross_detail,
            "sun_earth": sun_earth_detail,
            "active_gates": gate_detail,
            "active_channels": channel_detail,
            "transits": transit_detail,
        },
        "summary": summary,
    }


def synthesize(vedic_result, chinese_result, num_result, hd_result, query_focus=""):
    """Unified synthesis across all four systems."""

    cross_themes = []
    conflicts = []

    # --- Cross-system theme detection ---

    # 1. Fire/leadership themes
    fire_signals = []
    if vedic_result.get("detailed", {}).get("lagna", {}).get("element") == "Fire":
        fire_signals.append("Vedic: Fire Ascendant")
    # Check Bazi Day Master for Fire
    dm = safe_get(chinese_result, "detailed", "day_master_analysis", "day_master", default="")
    hd_auth = safe_get(hd_result, "detailed", "type_and_authority", "authority", default="")
    hd_type = safe_get(hd_result, "detailed", "type_and_authority", "type", default="")
    if dm in ("丙", "丁"):
        fire_signals.append("Chinese: Fire Day Master")
    if fire_signals:
        cross_themes.append(
            f"**Fire Signature**: {', '.join(fire_signals)}. "
            "A naturally charismatic, initiating presence. You lead by radiating — not by pushing. "
            "Your energy precedes you into rooms. Channel this fire consciously: it can inspire or burn out."
        )

    # 2. Earth/stability themes
    earth_signals = []
    if vedic_result.get("detailed", {}).get("lagna", {}).get("element") == "Earth":
        earth_signals.append("Vedic: Earth Ascendant")
    if dm in ("戊", "己"):
        earth_signals.append("Chinese: Earth Day Master")
    lp_num = safe_get(num_result, "detailed", "core_numbers", "life_path", "number", default=0)
    if lp_num in (4, 6, 8, 22):
        earth_signals.append(f"Numerology: Life Path {lp_num} (builder/nurturer)")
    if earth_signals:
        cross_themes.append(
            f"**Earth Anchoring**: {', '.join(earth_signals)}. "
            "You build things that last. There's a deep need for structure, security, and tangible results. "
            "Your gift is turning vision into foundation. Your shadow is resisting necessary change."
        )

    # 3. Water/emotional depth themes
    water_signals = []
    if vedic_result.get("detailed", {}).get("lagna", {}).get("element") == "Water":
        water_signals.append("Vedic: Water Ascendant")
    if dm in ("壬", "癸"):
        water_signals.append("Chinese: Water Day Master")
    if hd_auth == "Emotional":
        water_signals.append("Human Design: Emotional Authority")
    if water_signals:
        cross_themes.append(
            f"**Water Depth**: {', '.join(water_signals)}. "
            "You feel deeply and process emotionally. There's wisdom in the waves — but it requires patience. "
            "The emotional body is not an obstacle; it's your navigation system."
        )

    # 4. Master Number themes
    master_nums = []
    for key in ("life_path", "expression", "soul_urge"):
        n = safe_get(num_result, "detailed", "core_numbers", key, "number", default=0)
        if n in (11, 22, 33):
            master_nums.append(f"{key.replace('_', ' ').title()}: {n}")
    if master_nums:
        cross_themes.append(
            f"**Master Number Activation**: {', '.join(master_nums)}. "
            "Master numbers carry amplified voltage — gifts that demand responsibility. "
            "You're operating at a higher frequency range; self-doubt is the cost of that voltage, not evidence you're off-path."
        )

    # 5. Defined vs Undefined HD + Dasha timing
    md_lord = safe_get(vedic_result, "detailed", "dasha", "mahadasha_lord", default="")
    hd_def = safe_get(hd_result, "detailed", "definition", "definition", default="")
    if md_lord and hd_def:
        cross_themes.append(
            f"**Temporal + Energetic Frame**: Vedic {md_lord} Mahadasha meets Human Design {hd_def} Definition. "
            f"The Dasha sets the lesson plan; your Definition determines how you process it. "
            f"Working with both is more effective than fighting either."
        )

    # --- Conflict detection ---

    # Vedic expansive Dasha vs HD Splenic (instant, quiet)
    expansive_dasha = md_lord in ("Jupiter", "Venus")
    if expansive_dasha and hd_auth == "Splenic":
        conflicts.append(
            "**Jupiter/Venus expansion vs. Splenic Authority**: Your Vedic Dasha encourages growth, variety, and saying yes — "
            "but your Splenic Authority only speaks once, quietly, in the moment. "
            "Resolution: Trust the Splenic hit. The Dasha's expansion will express itself through opportunities "
            "that feel right in the body — not through forcing what doesn't click instantly."
        )

    # Numerology 5 (freedom) vs HD Generator (respond)
    if lp_num == 5 and "Generator" in safe_get(hd_result, "detailed", "type_and_authority", "type", default=""):
        conflicts.append(
            "**Life Path 5 (Freedom-Seeker) vs. Generator Strategy (respond, don't initiate)**: "
            "Your soul craves freedom and novelty, but your Generator design works by responding to what life brings, "
            "not chasing it. Resolution: Freedom isn't initiating — it's saying yes to the right invitations. "
            "Your variety comes through response, not pursuit."
        )

    # Saturn Dasha + Water Day Master
    if md_lord == "Saturn" and dm in ("壬", "癸"):
        conflicts.append(
            "**Saturn (Earth, restriction) Mahadasha + Water Day Master**: Saturn's contracting energy "
            "can feel suffocating to a Water constitution that needs to flow. "
            "Resolution: Saturn builds the container; Water fills it. This is a period of giving form to fluid gifts — "
            "discipline that serves freedom, not crushes it."
        )

    # LP 7 + Projector
    if lp_num == 7 and hd_type == "Projector":
        cross_themes.append(
            "**Life Path 7 + Projector Design**: Double signature of the seeker/guide. "
            "You're here to go deep, understand, and then share what you see — but only when recognized and invited. "
            "Your solitude is not isolation; it's where your wisdom gestates."
        )

    # --- Query answer ---
    query_answer = ""
    if query_focus:
        query_answer = (
            f"Regarding '{query_focus}': Each system offers a different lens. "
            f"From Vedic: your current {md_lord}-{safe_get(vedic_result, 'detailed', 'dasha', 'antardasha_lord', default='')} dasha "
            f"period indicates the timing backdrop. "
            f"From Chinese: your Day Master {dm} interacts with the current Luck Pillar to indicate elemental support or challenge. "
            f"Numerology: Personal Year {format_num(py_n := safe_get(num_result, 'detailed', 'current_timing', 'personal_year', 'number', default='N/A'))} "
            f"gives the energetic theme. "
            f"Human Design: your {hd_type} strategy through {hd_auth} Authority shows how to make the decision. "
            f"Cross-reference your Authority with the timing indicators — when the timing aligns AND your body/emotion says yes, move."
        )

    # --- Practical guidance ---
    guidance_lines = []
    if hd_auth == "Emotional":
        guidance_lines.append("Wait for clarity across your emotional wave. No major decisions in the heat of a high or low.")
    elif hd_auth == "Splenic":
        guidance_lines.append("Honor the first instantaneous hit. If you miss it, wait for the next — don't loop in the mind.")
    elif hd_auth == "Sacral":
        guidance_lines.append("Practice listening to your gut sounds — uh-huh and uh-uh. They're more trustworthy than your mind's pros and cons list.")

    if lp_num in (11, 22, 33):
        guidance_lines.append(f"Master Number {lp_num}: Ground yourself daily. The voltage is high — physical practices (exercise, bodywork, nature) are non-negotiable.")

    if dm in ("丙", "丁"):
        guidance_lines.append("Fire Day Master: You need outlets for your intensity. Creative work, physical activity, or leadership roles that don't burn you out.")

    if not guidance_lines:
        guidance_lines.append("Follow your Authority. Track what brings your Signature feeling (satisfaction, success, peace, surprise) and what brings your Not-Self (frustration, bitterness, anger, disappointment). Your own body is the most accurate oracle you'll ever have.")

    return {
        "cross_system_themes": cross_themes if cross_themes else ["No strong cross-system themes detected — each system's patterns are relatively self-contained."],
        "conflicts_and_reconciliation": conflicts if conflicts else ["No significant conflicts detected between systems."],
        "query_answer": query_answer if query_answer else "No specific query provided for synthesis.",
        "practical_guidance": guidance_lines,
    }


# ═══════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Esoteric Oracle — Unified Reading Engine")
    parser.add_argument("--file", "-f", type=str, help="Path to chart_data JSON file")
    parser.add_argument("--output", "-o", type=str, help="Path to write output JSON (default: stdout)")
    parser.add_argument("--pretty", action="store_true", default=True, help="Pretty-print JSON (default: True)")
    args = parser.parse_args()

    # Read input
    if args.file:
        raw = Path(args.file).read_text()
    else:
        raw = sys.stdin.read()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {e}"}), file=sys.stderr)
        sys.exit(1)

    # Support both wrappers: {"chart_data": {...}} or raw chart_data
    chart = data.get("chart_data", data)
    # Also support top-level fields
    name = data.get("name", "")
    query_focus = data.get("query_focus", "")
    theme = data.get("theme", "")
    output_language = data.get("output_language", "en")
    reading_id = data.get("reading_id", str(uuid.uuid4()))

    vedic = chart.get("vedic", {})
    chinese = chart.get("chinese", {})
    numerology = chart.get("numerology", {})
    hd = chart.get("human_design", {})

    # Interpret each system
    vedic_result = interpret_vedic(vedic, query_focus)
    chinese_result = interpret_chinese(chinese, query_focus)
    num_result = interpret_numerology(numerology, name)
    hd_result = interpret_human_design(hd, query_focus)

    # Synthesize
    synthesis = synthesize(vedic_result, chinese_result, num_result, hd_result, query_focus)

    # Determine confidence
    sections_present = sum(1 for s in [vedic, chinese, numerology, hd] if not is_empty(s))
    if sections_present >= 4:
        confidence = "high"
    elif sections_present >= 2:
        confidence = "medium"
    else:
        confidence = "low"

    # Missing data notes
    missing = []
    if is_empty(vedic):
        missing.append("Vedic chart data not provided")
    if is_empty(chinese):
        missing.append("Chinese metaphysical data not provided")
    if is_empty(numerology):
        missing.append("Numerology data not provided")
    if is_empty(hd):
        missing.append("Human Design data not provided")
    if not name:
        missing.append("Name not provided (name-based numerology skipped)")

    # Assemble output
    output = {
        "reading_id": reading_id,
        "sections": {
            "vedic": vedic_result,
            "chinese": chinese_result,
            "numerology": num_result,
            "human_design": hd_result,
            "unified_synthesis": synthesis,
        },
        "meta": {
            "confidence_score": confidence,
            "missing_data_notes": missing if missing else ["All data provided"],
            "model_version": "deepseek-v4-pro",
        },
    }

    output_json = json.dumps(output, indent=2, ensure_ascii=False)

    if args.output:
        Path(args.output).write_text(output_json, encoding="utf-8")
        print(f"Reading written to {args.output}")
    else:
        print(output_json)


if __name__ == "__main__":
    main()
