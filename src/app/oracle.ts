// ─── Esoteric Oracle Engine (TypeScript) ───────────────────────────────
// Ported from oracle.py — all reference data + interpretation logic
// Runs entirely client-side. No API keys, no server needed.

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface VedicPlanet {
  name: string;
  sign: string;
  degree: number;
  nakshatra: string;
  pada: number;
  house: number;
  is_retrograde: boolean;
  natural_benefic: boolean;
  functional_benefic: boolean;
}

export interface VedicHouse {
  number: number;
  sign: string;
  lords: string[];
}

export interface Dasha {
  mahadasha_lord: string;
  mahadasha_start: string;
  mahadasha_end: string;
  antardasha_lord: string;
  antardasha_start: string;
  antardasha_end: string;
}

export interface Transit {
  planet: string;
  transit_sign: string;
  transit_house: number;
  aspects_natal: string;
}

export interface VedicData {
  lagna: { sign: string; degree: number; nakshatra: string; pada: number };
  planets: VedicPlanet[];
  houses: VedicHouse[];
  current_dasha: Dasha;
  yogas: string[];
  transits: Transit[];
  divisional_charts: {
    d9?: { planet_positions: Record<string, unknown>; notes: string };
    d10?: { planet_positions: Record<string, unknown>; notes: string };
  };
}

export interface FourPillar {
  stem: string;
  branch: string;
  element: string;
}

export interface ChineseData {
  four_pillars: {
    year: FourPillar;
    month: FourPillar;
    day: FourPillar;
    hour: FourPillar;
  };
  day_master: string;
  favorable_elements: string[];
  unfavorable_elements: string[];
  current_luck_pillar: {
    pillar: string;
    age_range: string;
    element_relationship: string;
  };
  zwds?: {
    major_stars: Record<string, string>;
    palaces: Record<string, string>;
  };
}

export interface PinnacleCycle {
  age: string;
  number: number;
  meaning?: string;
}

export interface ChallengeCycle {
  age: string;
  number: number;
}

export interface NumerologyData {
  life_path: number;
  expression: number;
  soul_urge: number;
  personality: number;
  birthday: number;
  pinnacle_cycles: PinnacleCycle[];
  challenge_cycles: ChallengeCycle[];
  personal_year: number;
  personal_month: number;
  personal_day: number;
}

export interface HumanDesignData {
  type: string;
  authority: string;
  profile: string;
  definition: string;
  incarnation_cross: string;
  conscious_sun_gate: number;
  conscious_earth_gate: number;
  unconscious_sun_gate: number;
  unconscious_earth_gate: number;
  active_gates: number[];
  active_channels: string[];
  not_self_theme: string;
  signature: string;
  transit_gates_activated: number[];
}

export interface ChartData {
  vedic?: VedicData;
  chinese?: ChineseData;
  numerology?: NumerologyData;
  human_design?: HumanDesignData;
}

export interface OracleInput {
  name?: string;
  chart_data: ChartData;
  query_focus?: string;
  theme?: string;
  output_language?: string;
  reading_id?: string;
}

// ═══════════════════════════════════════════════════════════════
// REFERENCE DATA
// ═══════════════════════════════════════════════════════════════

interface SignQuality {
  element: string;
  modality: string;
  ruler: string;
  nature: string;
}

const VEDIC_SIGN_QUALITIES: Record<string, SignQuality> = {
  Aries: { element: "Fire", modality: "Movable", ruler: "Mars", nature: "Aggressive, pioneering" },
  Taurus: { element: "Earth", modality: "Fixed", ruler: "Venus", nature: "Steady, sensual" },
  Gemini: { element: "Air", modality: "Dual", ruler: "Mercury", nature: "Curious, adaptable" },
  Cancer: { element: "Water", modality: "Movable", ruler: "Moon", nature: "Nurturing, emotional" },
  Leo: { element: "Fire", modality: "Fixed", ruler: "Sun", nature: "Radiant, commanding" },
  Virgo: { element: "Earth", modality: "Dual", ruler: "Mercury", nature: "Analytical, precise" },
  Libra: { element: "Air", modality: "Movable", ruler: "Venus", nature: "Diplomatic, balanced" },
  Scorpio: { element: "Water", modality: "Fixed", ruler: "Mars", nature: "Intense, transformative" },
  Sagittarius: { element: "Fire", modality: "Dual", ruler: "Jupiter", nature: "Expansive, philosophical" },
  Capricorn: { element: "Earth", modality: "Movable", ruler: "Saturn", nature: "Ambitious, structured" },
  Aquarius: { element: "Air", modality: "Fixed", ruler: "Saturn", nature: "Innovative, detached" },
  Pisces: { element: "Water", modality: "Dual", ruler: "Jupiter", nature: "Mystical, compassionate" },
};

const PLANET_MEANINGS: Record<string, string> = {
  Sun: "Soul purpose, vitality, authority, self-expression, father",
  Moon: "Mind, emotions, mother, nurturing, intuition, public life",
  Mars: "Energy, courage, drive, aggression, siblings, property",
  Mercury: "Intellect, communication, commerce, adaptability, speech",
  Jupiter: "Wisdom, expansion, fortune, teaching, children, spirituality",
  Venus: "Love, beauty, art, relationships, luxuries, vehicles",
  Saturn: "Discipline, karma, delay, structure, longevity, service",
  Rahu: "Obsession, foreignness, innovation, shadow desire, amplification",
  Ketu: "Detachment, past-life mastery, spirituality, isolation, renunciation",
};

const NAKSHATRA_MEANINGS: Record<string, string> = {
  Ashwini: "Swift healing energy, horse-headed physicians. Pioneering, impulsive, therapeutic.",
  Bharani: "The bearer — ruled by Yama. Transformation through restraint, creative gestation.",
  Krittika: "The cutter — ruled by Agni. Sharp, purifying, decisive. Can be critical.",
  Rohini: "The red one — ruled by Brahma. Creative, sensual, growth-oriented, magnetic.",
  Mrigashira: "Deer's head — ruled by Soma. Seeking, restless, curious, delicate beauty.",
  Ardra: "The moist one — ruled by Rudra. Storm energy, emotional intensity, breakthrough.",
  Punarvasu: "Return of light — ruled by Aditi. Renewal, nurturing, boundless optimism.",
  Pushya: "The nourisher — ruled by Brihaspati. Sacred, protective, ritualistic, wise.",
  Ashlesha: "The entwiner — ruled by Sarpa. Kundalini, psychological depth, hypnotic.",
  Magha: "The mighty one — ruled by Pitris. Ancestral power, royalty, leadership, tradition.",
  "Purva Phalguni": "The former red one — ruled by Bhaga. Creative leisure, romance, relaxation.",
  "Uttara Phalguni": "The latter red one — ruled by Aryaman. Contracts, partnerships, patronage.",
  Hasta: "The hand — ruled by Savitar. Skill, dexterity, craftsmanship, service.",
  Chitra: "The brilliant — ruled by Tvashtar. Architecture, charisma, celestial design.",
  Swati: "The independent — ruled by Vayu. Freedom, movement, scattering, wind energy.",
  Vishakha: "The forked — ruled by Indra-Agni. Determination, goal-orientation, duality.",
  Anuradha: "Following devotion — ruled by Mitra. Friendship, alliance, cosmic devotion.",
  Jyeshtha: "The eldest — ruled by Indra. Seniority, protection, executive power.",
  Mula: "The root — ruled by Nirriti. Destruction for rebirth, investigation, depth.",
  "Purva Ashadha": "The former invincible — ruled by Apas. Water energy, early victory, flow.",
  "Uttara Ashadha": "The latter invincible — ruled by Vishwadevas. Final victory, enduring success.",
  Shravana: "The ear — ruled by Vishnu. Listening, learning, three footsteps of wisdom.",
  Dhanishta: "The wealthiest — ruled by Vasus. Rhythm, music, prosperity, community.",
  Shatabhisha: "Hundred physicians — ruled by Varuna. Healing, occult, circles, concealment.",
  "Purva Bhadrapada": "Former blessed feet — ruled by Aja Ekapada. Fire ritual, asceticism, piercing insight.",
  "Uttara Bhadrapada": "Latter blessed feet — ruled by Ahir Budhnya. Depth, stability, serpent wisdom.",
  Revati: "The wealthy — ruled by Pushan. Nourishment, completion, safe passage, compassion.",
};

const HOUSE_MEANINGS: Record<number, string> = {
  1: "Self, body, personality, appearance, head, overall life direction",
  2: "Wealth, speech, family, values, food, face, right eye",
  3: "Courage, siblings, communication, short journeys, hands, ears",
  4: "Home, mother, heart, emotional foundation, vehicles, property, chest",
  5: "Creativity, children, romance, intellect, past-life merit, stomach",
  6: "Health, enemies, debts, service, daily routine, competition, intestines",
  7: "Partnership, marriage, business, public image, lower back, kidneys",
  8: "Transformation, occult, inheritance, longevity, secrets, genitals",
  9: "Fortune, dharma, higher learning, father, long journeys, thighs, guru",
  10: "Career, status, karma, public achievements, knees, authority",
  11: "Gains, income, social networks, aspirations, elder siblings, ankles",
  12: "Loss, isolation, foreign lands, bed pleasures, spirituality, feet, liberation",
};

const YOGA_MEANINGS: Record<string, string> = {
  "Gaja Kesari": "Jupiter-Moon conjunction or mutual aspect. Wisdom and influence like an elephant-lion.",
  "Buddha-Aditya": "Mercury-Sun conjunction. High intelligence, eloquence, sharp analytical mind.",
  Dhana: "Wealth yoga from 2nd/11th house lords. Natural capacity for financial accumulation.",
  Raja: "Royal yoga from Kendra-Trikona lord union. Leadership, authority, prominence.",
  Kemadruma: "Moon isolated without planets in adjacent signs. Emotional solitude or self-reliance.",
  "Pancha Mahapurusha": "Five great-person yogas from Mars/Mercury/Jupiter/Venus/Saturn in own/exaltation Kendra.",
  "Viparita Raja": "Reversal of fortune from dusthana lords in dusthanas. Rise after difficulty.",
  Amala: "10th lord with a benefic. Pure reputation, ethical career standing.",
  Parvata: "Benefics in Kendras with 1st and 12th clear. Peak of fortune, elevated status.",
  Sunapha: "Planet in 2nd from Moon. Resourceful, accumulated wealth through effort.",
  Anapha: "Planet in 12th from Moon. Reserved wealth, internal resources, contemplative.",
  Durudhara: "Planets in both 2nd and 12th from Moon. Balanced resource flow in and out.",
};

const CHINESE_STEMS: Record<string, string> = {
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
};

const CHINESE_BRANCHES: Record<string, string> = {
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
};

interface NumberMeaning {
  title: string;
  meaning: string;
  isMaster: boolean;
}

const NUMEROLOGY_MEANINGS: Record<number, NumberMeaning> = {
  1: { title: "The Leader", meaning: "Independent, pioneering, ambitious, original. Shadow: domineering, impatient.", isMaster: false },
  2: { title: "The Diplomat", meaning: "Cooperative, sensitive, harmonious, intuitive. Shadow: passive, overly dependent.", isMaster: false },
  3: { title: "The Communicator", meaning: "Creative, expressive, joyful, social. Shadow: scattered, superficial, dramatic.", isMaster: false },
  4: { title: "The Builder", meaning: "Practical, disciplined, reliable, systematic. Shadow: rigid, stubborn, workaholic.", isMaster: false },
  5: { title: "The Freedom-Seeker", meaning: "Adventurous, versatile, progressive, sensual. Shadow: restless, irresponsible, addictive.", isMaster: false },
  6: { title: "The Nurturer", meaning: "Responsible, loving, harmonious, service-oriented. Shadow: martyr, controlling, anxious.", isMaster: false },
  7: { title: "The Seeker", meaning: "Analytical, spiritual, introspective, wise. Shadow: aloof, cynical, isolated.", isMaster: false },
  8: { title: "The Powerhouse", meaning: "Ambitious, authoritative, material mastery, executive. Shadow: ruthless, materialistic, intimidating.", isMaster: false },
  9: { title: "The Humanitarian", meaning: "Compassionate, wise, artistic, global consciousness. Shadow: detached, impractical, martyr.", isMaster: false },
  11: { title: "The Illuminated", meaning: "Master number. Intuitive, visionary, inspirational. Shadow: nervous, high-strung, self-doubting. Keep as 11 — never reduce.", isMaster: true },
  22: { title: "The Master Builder", meaning: "Master number. Practical vision, large-scale manifestation, leadership. Shadow: overwhelmed by own potential, controlling. Keep as 22 — never reduce.", isMaster: true },
  33: { title: "The Master Teacher", meaning: "Master number. Selfless service, unconditional love, spiritual guidance. Shadow: over-sacrificing, emotionally overloaded. Keep as 33 — never reduce.", isMaster: true },
};

const PINNACLE_MEANINGS: Record<number, string> = {
  1: "A period of independence and self-discovery. Take initiative; forge your own path.",
  2: "Cooperation and relationships take center stage. Develop patience and diplomacy.",
  3: "Creative self-expression and social expansion. Share your gifts with the world.",
  4: "Build foundations — career, home, long-term structures. Hard work pays off.",
  5: "Freedom, change, adventure. Expect unexpected opportunities. Stay adaptable.",
  6: "Responsibility, family, service. Nurture others while maintaining boundaries.",
  7: "Inner growth, study, spiritual development. A contemplative cycle — less outer action, more inner work.",
  8: "Material achievement, power, recognition. Financial growth and authority are available.",
  9: "Completion and humanitarian service. Let go of what no longer serves; give back.",
  11: "Master cycle of illumination. Intuition and spiritual insight are heightened. Ground yourself.",
  22: "Master cycle of large-scale building. Practical vision meets real-world manifestation.",
  33: "Master cycle of teaching and unconditional love. Serve humanity through wisdom.",
};

const CHALLENGE_MEANINGS: Record<number, string> = {
  0: "No single major challenge number. Life tests are varied and situational.",
  1: "Challenge: Develop independence and overcome self-doubt. Assert yourself authentically.",
  2: "Challenge: Overcome oversensitivity and fear of confrontation. Build confidence.",
  3: "Challenge: Avoid scattering energy. Develop focus, discipline, and follow-through.",
  4: "Challenge: Release rigidity and perfectionism. Learn flexibility and trust.",
  5: "Challenge: Avoid escapism and impulsiveness. Channel freedom into constructive change.",
  6: "Challenge: Balance service to others with self-care. Release perfectionist expectations.",
  7: "Challenge: Overcome isolation and cynicism. Trust your depth without cutting off.",
  8: "Challenge: Integrate power with compassion. Avoid materialistic tunnel vision.",
};

const HD_TYPES: Record<string, string> = {
  Generator: "The builders and doers — 70% of humanity. Sustainable life-force energy and mastery through response. Signature: Satisfaction.",
  "Manifesting Generator": "A hybrid type — the multi-passionate builders. Fast, efficient, meant to skip steps. Signature: Satisfaction.",
  Projector: "The guides — about 20% of humanity. Your gift is seeing into others and directing energy efficiently. Signature: Success.",
  Manifestor: "The initiators — about 8% of humanity. Your gift is starting things and impacting others. Signature: Peace.",
  Reflector: "The mirrors — about 1% of humanity. Your gift is reflecting the health of your environment. Signature: Surprise.",
};

const HD_AUTHORITIES: Record<string, string> = {
  Emotional: "Emotional Solar Plexus — ride the wave. No truth in the now; wait for clarity across the full emotional arc.",
  Sacral: "Sacral — gut response in the moment. The uh-huh / uh-uh. Binary, immediate, and trustworthy.",
  Splenic: "Splenic — instantaneous, quiet, once-only. A hit of knowing in the body. Trust the first hit.",
  Ego: "Ego/Heart — what your will truly wants. If your heart isn't in it, don't do it.",
  "Self-Projected": "Self/G-Center — truth emerges when you hear yourself speak. Talk it out.",
  Environmental: "Mental/No Inner Authority — clarity comes through the right environment.",
  Lunar: "Lunar Cycle — Reflectors only. Wait 28-29 days through a full lunar cycle.",
};

const HD_GATES: Record<number, string> = {
  1: "Gate 1 — The Creative: Self-expression through unique creative impulse.",
  2: "Gate 2 — The Direction of the Self: Receptivity to life's direction.",
  3: "Gate 3 — Difficulty at the Beginning: Mutation through sequencing. Innovation.",
  4: "Gate 4 — Youthful Folly: Mental answers that provide solutions.",
  5: "Gate 5 — Fixed Rhythms: Natural timing and patience.",
  6: "Gate 6 — The Friction: Emotional intimacy and conflict resolution.",
  7: "Gate 7 — The Role of the Self in Interaction: Leadership by design.",
  8: "Gate 8 — Contribution: Making things known through creative expression.",
  9: "Gate 9 — The Taming Power of the Small: Focused attention to detail.",
  10: "Gate 10 — The Behavior of the Self: Authentic self-love and behavior.",
  11: "Gate 11 — Peace: Ideas. A wellspring of conceptual inspiration.",
  12: "Gate 12 — Standstill: Caution and the capacity to articulate emotion.",
  13: "Gate 13 — The Listener: Listening to others' stories.",
  14: "Gate 14 — Power Skills: Resource and direction management.",
  15: "Gate 15 — Modesty: Extremes of rhythm and love of humanity.",
  16: "Gate 16 — Skills: Enthusiasm and talent identification.",
  17: "Gate 17 — The Opinion: Formulating opinions for the collective.",
  18: "Gate 18 — Correction: Pattern recognition and improvement.",
  19: "Gate 19 — Wanting: Sensitivity to basic needs and belonging.",
  20: "Gate 20 — The Now: Pure presence and contemplation.",
  21: "Gate 21 — The Hunter/Huntress: Control over resources for the tribe.",
  22: "Gate 22 — Grace: Emotional openness and beauty.",
  23: "Gate 23 — Assimilation: Articulating new understanding.",
  24: "Gate 24 — Returning: Rationalization and the return to truth.",
  25: "Gate 25 — Innocence: Universal love and spirit of the self.",
  26: "Gate 26 — The Taming Power of the Great: Ego-driven will to achieve.",
  27: "Gate 27 — Nourishment: Caring and feeding others.",
  28: "Gate 28 — The Game Player: Struggle for life's meaning.",
  29: "Gate 29 — The Abyss: Saying yes to life's experiences.",
  30: "Gate 30 — The Clinging Fire: Desire, feeling, and emotional depth.",
  31: "Gate 31 — Leading: Democratic leadership.",
  32: "Gate 32 — Duration: Instinct for continuity and longevity.",
  33: "Gate 33 — Retreat: Privacy and reflection.",
  34: "Gate 34 — The Power of the Great: Pure sacral power.",
  35: "Gate 35 — Progress: Hunger for new experiences.",
  36: "Gate 36 — Crisis: Emotional depth and exploration.",
  37: "Gate 37 — Friendship: Harmony and community.",
  38: "Gate 38 — The Fighter: Struggle for individual purpose.",
  39: "Gate 39 — The Provocateur: Emotional provocation to release stuck energy.",
  40: "Gate 40 — Deliverance: Aloneness and the will to provide.",
  41: "Gate 41 — Decrease: Imagination and fantasy. The seed of human experience.",
  42: "Gate 42 — Increase: Completion through growth.",
  43: "Gate 43 — Insight: Breakthrough mental clarity.",
  44: "Gate 44 — Coming to Meet: Pattern recognition from the past.",
  45: "Gate 45 — Gathering Together: The king/queen. Resources flow to you.",
  46: "Gate 46 — The Determination of the Self: Love of the body and serendipity.",
  47: "Gate 47 — Oppression: Mental pressure to make sense of experience.",
  48: "Gate 48 — The Well: Depth of knowing.",
  49: "Gate 49 — Revolution: Principles and transformation.",
  50: "Gate 50 — The Cauldron: Values and nurturing the community.",
  51: "Gate 51 — The Arousing: Shock and awakening through individual will.",
  52: "Gate 52 — Keeping Still: Stillness and focused concentration.",
  53: "Gate 53 — Development: Starting things. You initiate cycles of growth.",
  54: "Gate 54 — The Marrying Maiden: Ambition and material ascent.",
  55: "Gate 55 — Abundance: Emotional spirit and abundance.",
  56: "Gate 56 — The Wanderer: Storytelling and stimulation.",
  57: "Gate 57 — The Gentle: Intuitive clarity in the present moment.",
  58: "Gate 58 — The Joyous: Vitality and the joy of living.",
  59: "Gate 59 — Sexuality: Breaking through barriers. Deep intimacy.",
  60: "Gate 60 — Limitation: Acceptance of limitation. Constraints create form.",
  61: "Gate 61 — Mystery: Inner truth and the pressure to know.",
  62: "Gate 62 — Detail: Expressing understanding through precise detail.",
  63: "Gate 63 — Doubt: Logical pressure to question.",
  64: "Gate 64 — Confusion: Imagination before completion.",
};

const HD_CHANNELS: Record<string, string> = {
  "1-8": "Channel of Inspiration — Creative role model expressing unique direction.",
  "2-14": "Channel of the Beat — The key-keeper with direction for resources.",
  "3-60": "Channel of Mutation — Pulse that initiates change and innovation.",
  "4-63": "Channel of Logic — Mental clarity through doubt and answers.",
  "5-15": "Channel of Rhythm — Being in the flow of natural timing.",
  "6-59": "Channel of Intimacy — Deep bonding through emotional openness.",
  "7-31": "Channel of the Alpha — Leadership for the collective good.",
  "9-52": "Channel of Concentration — Deep focus and stillness.",
  "10-20": "Channel of Awakening — Commitment to higher self and present living.",
  "10-34": "Channel of Exploration — Following your own convictions with power.",
  "10-57": "Channel of Perfected Form — Living beauty and intuitive design.",
  "11-56": "Channel of Curiosity — The seeker searching for meaning through stories.",
  "12-22": "Channel of Openness — Emotional expression that moves others.",
  "13-33": "Channel of the Prodigal — Listening and sharing lived wisdom.",
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
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function isMasterNumber(n: number): boolean {
  return n === 11 || n === 22 || n === 33;
}

function formatNum(n: number): string {
  if (isMasterNumber(n)) return `${n} (Master Number — do not reduce)`;
  return String(n);
}

function benMalLabel(p: VedicPlanet): string {
  const natural = p.natural_benefic ? "Benefic" : "Malefic";
  const functional = p.functional_benefic ? "Benefic" : "Malefic";
  return `Natural ${natural}, Functional ${functional}`;
}

function isEmpty(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === "string" && val.trim() === "") return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === "object" && Object.keys(val as object).length === 0) return true;
  return false;
}

// ═══════════════════════════════════════════════════════════════
// SECTION INTERPRETERS
// ═══════════════════════════════════════════════════════════════

function interpretVedic(vedic: VedicData | undefined) {
  if (!vedic) return { overview: "Not provided — no Vedic data available.", detailed: {}, summary: "" };

  const { lagna, planets, houses, current_dasha: dasha, yogas, transits, divisional_charts } = vedic;
  const lq = VEDIC_SIGN_QUALITIES[lagna.sign] || { element: "", modality: "", ruler: "", nature: "" };

  const lagnaDetail = {
    sign: lagna.sign,
    degree: lagna.degree,
    nakshatra: lagna.nakshatra,
    pada: lagna.pada,
    sign_quality: lq.nature,
    element: lq.element,
    modality: lq.modality,
    interpretation: `Ascendant in ${lagna.sign} (${lq.element} ${lq.modality}) — ${lq.nature}. ${lagna.nakshatra} nakshatra pada ${lagna.pada}.`,
  };

  const planetDetails = planets.map((p) => ({
    planet: p.name,
    sign: p.sign,
    house: p.house,
    nakshatra: p.nakshatra,
    is_retrograde: p.is_retrograde,
    benefic_malefic: benMalLabel(p),
    interpretation: `${p.name}${p.is_retrograde ? " (Retrograde)" : ""} in ${p.sign} (House ${p.house}), ${p.nakshatra} nakshatra. ${benMalLabel(p)}. Governs: ${PLANET_MEANINGS[p.name] || ""}.`,
  }));

  const houseDetails = houses.map((h) => ({
    number: h.number,
    sign: h.sign,
    lords: h.lords,
    meaning: HOUSE_MEANINGS[h.number] || "",
    interpretation: `House ${h.number} (${HOUSE_MEANINGS[h.number] || ""}) in ${h.sign}, ruled by ${h.lords.join(", ")}.`,
  }));

  const dashaDetail = {
    mahadasha_lord: dasha.mahadasha_lord,
    mahadasha_period: `${dasha.mahadasha_start} to ${dasha.mahadasha_end}`,
    antardasha_lord: dasha.antardasha_lord,
    antardasha_period: `${dasha.antardasha_start} to ${dasha.antardasha_end}`,
    interpretation: `Currently running ${dasha.mahadasha_lord} Mahadasha with ${dasha.antardasha_lord} Antardasha.`,
  };

  const yogaDetails = yogas.map((y) => ({
    yoga: y,
    meaning: YOGA_MEANINGS[y] || "A significant planetary combination.",
    interpretation: `${y}: ${YOGA_MEANINGS[y] || "An important planetary combination."}`,
  }));

  const transitDetails = transits.map((t) => ({
    planet: t.planet,
    transit_sign: t.transit_sign,
    transit_house: t.transit_house,
    aspects_natal: t.aspects_natal,
    interpretation: `Transit ${t.planet} in ${t.transit_sign} (natal House ${t.transit_house}). ${t.aspects_natal}`,
  }));

  const divDetail: Record<string, unknown> = {};
  if (divisional_charts?.d9) {
    divDetail.d9_navamsha = {
      notes: divisional_charts.d9.notes,
      interpretation: "The D9 (Navamsha) reveals the inner self, relationship capacity, and deeper karmic patterns.",
    };
  }
  if (divisional_charts?.d10) {
    divDetail.d10_dashamsha = {
      notes: divisional_charts.d10.notes,
      interpretation: "The D10 (Dashamsha) reveals career trajectory, professional reputation, and action in the material world.",
    };
  }

  const nakshatrasInChart = [...new Set([lagna.nakshatra, ...planets.map((p) => p.nakshatra).filter(Boolean)])];

  const overview = `Ascendant ${lagna.sign} shapes the lens through which all life is experienced — a ${lq.element} rising with ${lq.modality.toLowerCase()} rhythm. Nakshatras: ${nakshatrasInChart.slice(0, 5).join(", ")}. Currently moving through ${dasha.mahadasha_lord}-${dasha.antardasha_lord} dasha period.`;

  const summary = `Your ${lagna.sign} Ascendant gives you a natural ${lq.nature.toLowerCase()} approach to life. The ${dasha.mahadasha_lord} Mahadasha colors this period with the energy of ${PLANET_MEANINGS[dasha.mahadasha_lord] || dasha.mahadasha_lord}.${yogas.length ? ` Active yogas: ${yogas.slice(0, 3).join(", ")}.` : ""}`;

  return {
    overview,
    detailed: { lagna: lagnaDetail, planets: planetDetails, houses: houseDetails, dasha: dashaDetail, yogas: yogaDetails, transits: transitDetails, divisional: divDetail },
    summary,
  };
}

function interpretChinese(chinese: ChineseData | undefined) {
  if (!chinese) return { overview: "Not provided — no Chinese metaphysical data available.", detailed: {}, summary: "" };

  const { four_pillars: pillars, day_master: dm, favorable_elements: fav, unfavorable_elements: unfav, current_luck_pillar: lp, zwds } = chinese;

  const pillarDetail: Record<string, unknown> = {};
  for (const key of ["year", "month", "day", "hour"] as const) {
    const p = pillars[key];
    pillarDetail[`${key}_pillar`] = {
      stem: p.stem,
      branch: p.branch,
      element: p.element,
      stem_meaning: CHINESE_STEMS[p.stem] || "",
      branch_meaning: CHINESE_BRANCHES[p.branch] || "",
      interpretation: `${p.stem} (${(CHINESE_STEMS[p.stem] || "").slice(0, 40)}...) over ${p.branch} — ${p.element}.`,
    };
  }

  const dmInterpretation = {
    day_master: dm,
    meaning: CHINESE_STEMS[dm] || "",
    favorable_elements: fav,
    unfavorable_elements: unfav,
    interpretation: `Day Master ${dm} (${CHINESE_STEMS[dm] || ""}) is your self-element. Supports: ${fav.join(", ") || "not specified"}. Challenges: ${unfav.join(", ") || "not specified"}.`,
  };

  const luckDetail = {
    pillar: lp.pillar,
    age_range: lp.age_range,
    element_relationship: lp.element_relationship,
    interpretation: `Current Luck Pillar: ${lp.pillar} (${lp.age_range}). Relationship to Day Master: ${lp.element_relationship}.`,
  };

  const zwdsDetail: Record<string, unknown> = {};
  if (zwds && !isEmpty(zwds)) {
    zwdsDetail.major_stars = zwds.major_stars;
    zwdsDetail.palaces = zwds.palaces;
    zwdsDetail.interpretation = "Zi Wei Dou Shu provides the palace-based star map of life's twelve domains.";
  } else {
    zwdsDetail.note = "ZWDS data not provided — this is optional.";
  }

  const overview = `Day Master ${dm} interacts with surrounding pillars to shape constitutional strengths. Favorable elements: ${fav.join(", ") || "not specified"}. Current Luck Pillar: ${lp.pillar}.`;

  const summary = `Day Master ${dm} shapes how you navigate life. Support from ${fav.join(", ") || "balancing elements"}; challenge from ${unfav.join(", ") || "imbalancing elements"}. The ${lp.pillar} Luck Pillar (${lp.age_range}) is a ${lp.element_relationship} period.`;

  return { overview, detailed: { four_pillars: pillarDetail, day_master_analysis: dmInterpretation, luck_pillar: luckDetail, zwds: zwdsDetail }, summary };
}

function interpretNumerology(num: NumerologyData | undefined) {
  if (!num) return { overview: "Not provided — no numerology data available.", detailed: {}, summary: "" };

  const coreNumbers: Record<string, unknown> = {};
  const entries: [string, number][] = [
    ["life_path", num.life_path],
    ["expression", num.expression],
    ["soul_urge", num.soul_urge],
    ["personality", num.personality],
    ["birthday", num.birthday],
  ];
  for (const [key, n] of entries) {
    const nm = NUMEROLOGY_MEANINGS[n] || { title: "", meaning: "" };
    coreNumbers[key] = { number: n, is_master: isMasterNumber(n), title: nm.title, meaning: nm.meaning, interpretation: `${key.replace("_", " ")}: ${formatNum(n)} — ${nm.title}. ${nm.meaning}` };
  }

  const pinnacleDetail = num.pinnacle_cycles.map((pc) => ({
    age: pc.age,
    number: pc.number,
    is_master: isMasterNumber(pc.number),
    interpretation: `Ages ${pc.age}: Number ${formatNum(pc.number)} — ${PINNACLE_MEANINGS[pc.number] || pc.meaning || ""}`,
  }));

  const challengeDetail = num.challenge_cycles.map((cc) => ({
    age: cc.age,
    number: cc.number,
    is_master: isMasterNumber(cc.number),
    interpretation: `Ages ${cc.age}: Number ${formatNum(cc.number)} — ${CHALLENGE_MEANINGS[cc.number] || ""}`,
  }));

  const timingDetail = {
    personal_year: { number: num.personal_year, interpretation: `Personal Year ${formatNum(num.personal_year)}` },
    personal_month: { number: num.personal_month, interpretation: `Personal Month ${formatNum(num.personal_month)}` },
    personal_day: { number: num.personal_day, interpretation: `Personal Day ${formatNum(num.personal_day)}` },
    interpretation: `In a ${formatNum(num.personal_year)} Personal Year, ${formatNum(num.personal_month)} Personal Month, ${formatNum(num.personal_day)} Personal Day.`,
  };

  const overview = `Life Path ${formatNum(num.life_path)} is your core curriculum. Expression ${formatNum(num.expression)} shows how you manifest. Soul Urge ${formatNum(num.soul_urge)} drives you beneath the surface. Currently in a ${formatNum(num.personal_year)} Personal Year.`;

  const lp = NUMEROLOGY_MEANINGS[num.life_path] || { title: "", meaning: "" };
  const summary = `Life Path ${formatNum(num.life_path)}: ${lp.meaning.slice(0, 120)}. Current ${formatNum(num.personal_year)} Personal Year sets the theme.`;

  return { overview, detailed: { core_numbers: coreNumbers, pinnacle_cycles: pinnacleDetail, challenge_cycles: challengeDetail, current_timing: timingDetail }, summary };
}

function interpretHumanDesign(hd: HumanDesignData | undefined) {
  if (!hd) return { overview: "Not provided — no Human Design data available.", detailed: {}, summary: "" };

  const typeInfo = HD_TYPES[hd.type] || "";
  const authInfo = HD_AUTHORITIES[hd.authority] || "";

  const taDetail = {
    type: hd.type,
    type_description: typeInfo,
    authority: hd.authority,
    authority_description: authInfo,
    signature: hd.signature,
    not_self_theme: hd.not_self_theme,
    interpretation: `Type: ${hd.type}. ${typeInfo} Authority: ${hd.authority}. ${authInfo} Signature (correct): ${hd.signature}. Not-Self (off-track): ${hd.not_self_theme}.`,
  };

  const gateDetail = hd.active_gates.map((g) => ({ gate: g, name: HD_GATES[g]?.split(" — ")[1] || `Gate ${g}`, interpretation: HD_GATES[g] || `Gate ${g} — A consistent thematic energy.` }));

  const channelDetail = hd.active_channels.map((ch) => ({ channel: ch, interpretation: HD_CHANNELS[ch] || `Channel ${ch} — A life-force pathway.` }));

  const transitDetail = hd.transit_gates_activated.map((tg) => ({ gate: tg, interpretation: `Current transit: ${HD_GATES[tg] || `Gate ${tg}`}` }));

  const crossDetail = { incarnation_cross: hd.incarnation_cross, interpretation: `Incarnation Cross ${hd.incarnation_cross} — your life's thematic purpose.` };

  const defDetail = { definition: hd.definition, interpretation: `Definition '${hd.definition}' describes how your defined centers connect and process energy.` };

  const sunEarthDetail = {
    conscious_sun: { gate: hd.conscious_sun_gate, meaning: HD_GATES[hd.conscious_sun_gate] || `Gate ${hd.conscious_sun_gate}` },
    conscious_earth: { gate: hd.conscious_earth_gate, meaning: HD_GATES[hd.conscious_earth_gate] || `Gate ${hd.conscious_earth_gate}` },
    unconscious_sun: { gate: hd.unconscious_sun_gate, meaning: HD_GATES[hd.unconscious_sun_gate] || `Gate ${hd.unconscious_sun_gate}` },
    unconscious_earth: { gate: hd.unconscious_earth_gate, meaning: HD_GATES[hd.unconscious_earth_gate] || `Gate ${hd.unconscious_earth_gate}` },
    interpretation: `Conscious Sun Gate ${hd.conscious_sun_gate}/Earth Gate ${hd.conscious_earth_gate}. Unconscious Sun Gate ${hd.unconscious_sun_gate}/Earth Gate ${hd.unconscious_earth_gate}.`,
  };

  const strategy = hd.type.includes("Generator") ? "respond" : hd.type === "Projector" ? "wait for the invitation" : hd.type === "Manifestor" ? "inform before acting" : hd.type === "Reflector" ? "wait a lunar cycle" : "follow your authority";

  const overview = `A ${hd.type} with ${hd.authority} Authority and ${hd.profile} Profile. Strategy: ${strategy}. Incarnation Cross: ${hd.incarnation_cross}. ${hd.definition} Definition. Active gates: ${hd.active_gates.length}; channels: ${hd.active_channels.length}.`;

  const summary = `As a ${hd.type}, your strategy flows through ${hd.authority} Authority. When aligned: ${hd.signature}; off-track: ${hd.not_self_theme}. ${hd.profile} Profile and ${hd.incarnation_cross} Incarnation Cross.`;

  return {
    overview,
    detailed: { type_and_authority: taDetail, profile: { profile: hd.profile, interpretation: `Profile ${hd.profile} — how you navigate the world.` }, definition: defDetail, incarnation_cross: crossDetail, sun_earth: sunEarthDetail, active_gates: gateDetail, active_channels: channelDetail, transits: transitDetail },
    summary,
  };
}

function synthesize(
  vedicResult: ReturnType<typeof interpretVedic>,
  chineseResult: ReturnType<typeof interpretChinese>,
  numResult: ReturnType<typeof interpretNumerology>,
  hdResult: ReturnType<typeof interpretHumanDesign>,
  queryFocus: string
) {
  const crossThemes: string[] = [];
  const conflicts: string[] = [];

  // Extract key signals
  const lagnaElement = (vedicResult?.detailed as Record<string, unknown>)?.lagna as Record<string, unknown> | undefined;
  const dm = (chineseResult?.detailed as Record<string, unknown>)?.day_master_analysis as Record<string, unknown> | undefined;
  const hdTA = (hdResult?.detailed as Record<string, unknown>)?.type_and_authority as Record<string, unknown> | undefined;
  const coreNums = (numResult?.detailed as Record<string, unknown>)?.core_numbers as Record<string, Record<string, unknown>> | undefined;
  const dashaDetail = (vedicResult?.detailed as Record<string, unknown>)?.dasha as Record<string, unknown> | undefined;

  const element = lagnaElement?.element as string | undefined;
  const dmStem = dm?.day_master as string | undefined;
  const hdAuth = hdTA?.authority as string | undefined;
  const hdType = hdTA?.type as string | undefined;
  const hdDef = ((hdResult?.detailed as Record<string, unknown>)?.definition as Record<string, unknown>)?.definition as string | undefined;
  const mdLord = dashaDetail?.mahadasha_lord as string | undefined;
  const lpNum = coreNums?.life_path?.number as number | undefined;

  // Fire signature
  const fireSignals: string[] = [];
  if (element === "Fire") fireSignals.push("Vedic: Fire Ascendant");
  if (dmStem === "丙" || dmStem === "丁") fireSignals.push("Chinese: Fire Day Master");
  if (fireSignals.length) crossThemes.push(`**Fire Signature**: ${fireSignals.join(", ")}. Naturally charismatic — lead by radiating, not pushing.`);

  // Earth signature
  const earthSignals: string[] = [];
  if (element === "Earth") earthSignals.push("Vedic: Earth Ascendant");
  if (dmStem === "戊" || dmStem === "己") earthSignals.push("Chinese: Earth Day Master");
  if (lpNum && [4, 6, 8, 22].includes(lpNum)) earthSignals.push(`Numerology: Life Path ${lpNum} (builder/nurturer)`);
  if (earthSignals.length) crossThemes.push(`**Earth Anchoring**: ${earthSignals.join(", ")}. You build things that last. Gift: turning vision into foundation.`);

  // Water signature
  const waterSignals: string[] = [];
  if (element === "Water") waterSignals.push("Vedic: Water Ascendant");
  if (dmStem === "壬" || dmStem === "癸") waterSignals.push("Chinese: Water Day Master");
  if (hdAuth === "Emotional") waterSignals.push("Human Design: Emotional Authority");
  if (waterSignals.length) crossThemes.push(`**Water Depth**: ${waterSignals.join(", ")}. You feel deeply. The emotional body is your navigation system.`);

  // Master numbers
  const masterNums: string[] = [];
  if (coreNums) for (const key of ["life_path", "expression", "soul_urge"]) {
    const n = coreNums[key]?.number as number | undefined;
    if (n && isMasterNumber(n)) masterNums.push(`${key.replace("_", " ")}: ${n}`);
  }
  if (masterNums.length) crossThemes.push(`**Master Number Activation**: ${masterNums.join(", ")}. Amplified voltage — gifts demanding responsibility.`);

  // Dasha + Definition
  if (mdLord && hdDef) crossThemes.push(`**Temporal + Energetic Frame**: Vedic ${mdLord} Mahadasha meets ${hdDef} Definition. Dasha sets the lesson plan; Definition determines processing.`);

  // Conflicts
  if (mdLord && ["Jupiter", "Venus"].includes(mdLord) && hdAuth === "Splenic") {
    conflicts.push("**Jupiter/Venus expansion vs. Splenic Authority**: Dasha encourages growth, but Splenic Authority only speaks once. Resolution: Trust the Splenic hit — expansion comes through what feels right in the body.");
  }
  if (lpNum === 5 && hdType?.includes("Generator")) {
    conflicts.push("**Life Path 5 vs. Generator Strategy**: Soul craves freedom, but design works by responding. Resolution: Freedom isn't initiating — it's saying yes to the right invitations.");
  }
  if (mdLord === "Saturn" && dmStem && ["壬", "癸"].includes(dmStem)) {
    conflicts.push("**Saturn (restriction) + Water Day Master**: Contracting energy vs. need to flow. Resolution: Saturn builds the container; Water fills it. Discipline serving freedom.");
  }

  // LP 7 + Projector
  if (lpNum === 7 && hdType === "Projector") crossThemes.push("**Life Path 7 + Projector**: Double seeker/guide signature. Solitude is where your wisdom gestates.");

  // Query answer
  let queryAnswer = "";
  if (queryFocus) {
    const pyNum = coreNums?.personal_year?.number;
    queryAnswer = `Regarding '${queryFocus}': Vedic — your current ${mdLord || "?"}-${dashaDetail?.antardasha_lord || "?"} dasha indicates the timing. Chinese — Day Master ${dmStem || "?"} + Luck Pillar show support/challenge. Numerology — Personal Year ${pyNum ? formatNum(pyNum as number) : "?"} sets the theme. Human Design — ${hdType || "?"} strategy through ${hdAuth || "?"} Authority shows how to decide. Cross-reference Authority with timing — when both align, move.`;
  }

  // Guidance
  const guidance: string[] = [];
  if (hdAuth === "Emotional") guidance.push("Wait for clarity across your emotional wave. No major decisions in the heat of a high or low.");
  else if (hdAuth === "Splenic") guidance.push("Honor the first instantaneous hit. If you miss it, wait for the next — don't loop in the mind.");
  else if (hdAuth === "Sacral") guidance.push("Practice listening to your gut sounds — uh-huh and uh-uh are more trustworthy than mental pros/cons.");
  if (lpNum && isMasterNumber(lpNum)) guidance.push(`Master Number ${lpNum}: Ground yourself daily. Physical practices are non-negotiable.`);
  if (dmStem === "丙" || dmStem === "丁") guidance.push("Fire Day Master: You need outlets for your intensity — creative work, activity, or leadership roles.");
  if (!guidance.length) guidance.push("Follow your Authority. Track Signature vs. Not-Self. Your own body is the most accurate oracle.");

  return {
    cross_system_themes: crossThemes.length ? crossThemes : ["No strong cross-system themes detected."],
    conflicts_and_reconciliation: conflicts.length ? conflicts : ["No significant conflicts detected between systems."],
    query_answer: queryAnswer || "No specific query provided for synthesis.",
    practical_guidance: guidance,
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN ORACLE FUNCTION
// ═══════════════════════════════════════════════════════════════

export interface OracleOutput {
  reading_id: string;
  sections: {
    vedic: ReturnType<typeof interpretVedic>;
    chinese: ReturnType<typeof interpretChinese>;
    numerology: ReturnType<typeof interpretNumerology>;
    human_design: ReturnType<typeof interpretHumanDesign>;
    unified_synthesis: ReturnType<typeof synthesize>;
  };
  meta: {
    confidence_score: "high" | "medium" | "low";
    missing_data_notes: string[];
    model_version: string;
  };
}

export function generateReading(input: OracleInput): OracleOutput {
  const chart = input.chart_data;
  const queryFocus = input.query_focus || "";

  const vedicResult = interpretVedic(chart.vedic);
  const chineseResult = interpretChinese(chart.chinese);
  const numResult = interpretNumerology(chart.numerology);
  const hdResult = interpretHumanDesign(chart.human_design);
  const synthesis = synthesize(vedicResult, chineseResult, numResult, hdResult, queryFocus);

  // Confidence
  const present = [chart.vedic, chart.chinese, chart.numerology, chart.human_design].filter((s) => !isEmpty(s)).length;
  const confidence: "high" | "medium" | "low" = present >= 4 ? "high" : present >= 2 ? "medium" : "low";

  // Missing data
  const missing: string[] = [];
  if (isEmpty(chart.vedic)) missing.push("Vedic chart data not provided");
  if (isEmpty(chart.chinese)) missing.push("Chinese metaphysical data not provided");
  if (isEmpty(chart.numerology)) missing.push("Numerology data not provided");
  if (isEmpty(chart.human_design)) missing.push("Human Design data not provided");
  if (!input.name) missing.push("Name not provided (name-based numerology skipped)");
  if (!missing.length) missing.push("All data provided");

  return {
    reading_id: input.reading_id || crypto.randomUUID(),
    sections: { vedic: vedicResult, chinese: chineseResult, numerology: numResult, human_design: hdResult, unified_synthesis: synthesis },
    meta: { confidence_score: confidence, missing_data_notes: missing, model_version: "deepseek-v4-pro" },
  };
}
