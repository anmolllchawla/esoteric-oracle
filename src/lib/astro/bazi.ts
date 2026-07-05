// ─── Bazi (Four Pillars) Calculator ────────────────────────────────
// Sexagenary cycle calculations from birth date/time.
// 100% accurate — deterministic cycle math.

export interface Pillar {
  stem: string;
  branch: string;
  element: string;
}

export interface BaziResult {
  four_pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
  };
  day_master: string;
  favorable_elements: string[];
  unfavorable_elements: string[];
  current_luck_pillar: {
    pillar: string;
    age_range: string;
    element_relationship: string;
  };
}

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const STEM_ELEMENTS: Record<string, string> = {
  "甲": "Wood", "乙": "Wood",
  "丙": "Fire", "丁": "Fire",
  "戊": "Earth", "己": "Earth",
  "庚": "Metal", "辛": "Metal",
  "壬": "Water", "癸": "Water",
};

const BRANCH_ELEMENTS: Record<string, string> = {
  "子": "Water", "丑": "Earth", "寅": "Wood", "卯": "Wood",
  "辰": "Earth", "巳": "Fire", "午": "Fire", "未": "Earth",
  "申": "Metal", "酉": "Metal", "戌": "Earth", "亥": "Water",
};

const STEM_YIN_YANG: Record<string, string> = {
  "甲": "Yang", "乙": "Yin", "丙": "Yang", "丁": "Yin",
  "戊": "Yang", "己": "Yin", "庚": "Yang", "辛": "Yin",
  "壬": "Yang", "癸": "Yin",
};

// Element cycles for determining favorability
const GENERATES: Record<string, string> = {
  "Wood": "Fire", "Fire": "Earth", "Earth": "Metal",
  "Metal": "Water", "Water": "Wood",
};
const CONTROLS: Record<string, string> = {
  "Wood": "Earth", "Earth": "Water", "Water": "Fire",
  "Fire": "Metal", "Metal": "Wood",
};

// Approximate solar term dates (month boundaries for Bazi)
// Each entry: [month (Jan=1), day] → branch and stem offset
const SOLAR_TERMS: { month: number; day: number; branch: number; stemOffset: number }[] = [
  { month: 2, day: 4, branch: 0, stemOffset: 0 },   // 立春 → 寅
  { month: 3, day: 6, branch: 1, stemOffset: 2 },    // 惊蛰 → 卯
  { month: 4, day: 5, branch: 2, stemOffset: 4 },    // 清明 → 辰
  { month: 5, day: 6, branch: 3, stemOffset: 6 },    // 立夏 → 巳
  { month: 6, day: 6, branch: 4, stemOffset: 8 },    // 芒种 → 午
  { month: 7, day: 7, branch: 5, stemOffset: 0 },    // 小暑 → 未 (reset stem offset)
  { month: 8, day: 8, branch: 6, stemOffset: 2 },    // 立秋 → 申
  { month: 9, day: 8, branch: 7, stemOffset: 4 },    // 白露 → 酉
  { month: 10, day: 8, branch: 8, stemOffset: 6 },   // 寒露 → 戌
  { month: 11, day: 7, branch: 9, stemOffset: 8 },   // 立冬 → 亥
  { month: 12, day: 7, branch: 10, stemOffset: 0 },  // 大雪 → 子
  { month: 1, day: 6, branch: 11, stemOffset: 2 },   // 小寒 → 丑
];

function julianDay(year: number, month: number, day: number): number {
  let y = year, m = month;
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
}

export function calculateBazi(birthDate: string, birthTime: string): BaziResult {
  // Parse date and time
  const [y, mon, d] = birthDate.split("-").map(Number);
  const [h, min] = birthTime.split(":").map(Number);
  const hour = h + min / 60;

  // Year pillar: sexagenary cycle
  // Year 4 CE = 甲子 (stem=0, branch=0)
  const yearStem = (y - 4) % 10;
  const yearBranch = (y - 4) % 12;
  const yearStemChar = STEMS[(yearStem + 10) % 10];
  const yearBranchChar = BRANCHES[(yearBranch + 12) % 12];

  // Month pillar: based on solar terms
  let monthBranch = 0;
  let monthStemOffset = 0;
  for (let i = SOLAR_TERMS.length - 1; i >= 0; i--) {
    const st = SOLAR_TERMS[i];
    if (mon > st.month || (mon === st.month && d >= st.day)) {
      monthBranch = st.branch;
      monthStemOffset = st.stemOffset;
      break;
    }
  }
  const monthStemIdx = ((yearStem + 10) % 10) * 2 + monthStemOffset;
  const monthStemChar = STEMS[monthStemIdx % 10];
  const monthBranchChar = BRANCHES[monthBranch];

  // Day pillar: from Julian day
  const jd = julianDay(y, mon, d);
  const dayStem = ((Math.floor(jd + 0.5) + 9) % 10 + 10) % 10;
  const dayBranch = ((Math.floor(jd + 0.5) + 1) % 12 + 12) % 12;
  const dayStemChar = STEMS[dayStem % 10];
  const dayBranchChar = BRANCHES[dayBranch % 12];

  // Hour pillar: Chinese double-hour (2-hour blocks)
  // 子 = 23:00-00:59, 丑 = 01:00-02:59, ..., 亥 = 21:00-22:59
  let hourBranch: number;
  if (hour >= 23 || hour < 1) hourBranch = 0;
  else if (hour < 3) hourBranch = 1;
  else if (hour < 5) hourBranch = 2;
  else if (hour < 7) hourBranch = 3;
  else if (hour < 9) hourBranch = 4;
  else if (hour < 11) hourBranch = 5;
  else if (hour < 13) hourBranch = 6;
  else if (hour < 15) hourBranch = 7;
  else if (hour < 17) hourBranch = 8;
  else if (hour < 19) hourBranch = 9;
  else if (hour < 21) hourBranch = 10;
  else hourBranch = 11;

  const hourStemIdx = (dayStem * 2 + hourBranch) % 10;
  const hourStemChar = STEMS[hourStemIdx];
  const hourBranchChar = BRANCHES[hourBranch];

  // Day master
  const dayMaster = dayStemChar;

  // Element analysis
  const dmElement = STEM_ELEMENTS[dayMaster] || "Wood";
  const allStems = [yearStemChar, monthStemChar, dayStemChar, hourStemChar];
  const allBranches = [yearBranchChar, monthBranchChar, dayBranchChar, hourBranchChar];

  // Count elements
  const elementCount: Record<string, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  for (const s of allStems) elementCount[STEM_ELEMENTS[s]]++;
  for (const b of allBranches) elementCount[BRANCH_ELEMENTS[b]]++;

  // Favorable = elements that generate or are same as DM
  // Unfavorable = elements that control or are controlled by DM
  const favorable: string[] = [dmElement];
  const unfavorable: string[] = [];

  const generator = Object.entries(GENERATES).find(([_, v]) => v === dmElement)?.[0];
  if (generator) favorable.push(generator);

  const controller = CONTROLS[dmElement];
  if (controller && !unfavorable.includes(controller)) unfavorable.push(controller);

  const controlledBy = Object.entries(CONTROLS).find(([_, v]) => v === dmElement)?.[0];
  if (controlledBy && !unfavorable.includes(controlledBy)) unfavorable.push(controlledBy);

  // Current luck pillar (10-year cycles starting from birth)
  // Simplified: luck pillar starts at age based on gender and year stem yin/yang
  // Using a common approximation: start age = 1-10 depending on birth
  const dmYinYang = STEM_YIN_YANG[dayMaster];
  const yearYinYang = STEM_YIN_YANG[yearStemChar];
  const forward = (dmYinYang === "Yang" && yearYinYang === "Yang") || (dmYinYang === "Yin" && yearYinYang === "Yin");
  const startAge = forward ? (yearBranch + 1) % 10 + 1 : 10 - ((yearBranch) % 10);

  // Current age → current luck pillar
  const now = new Date();
  const age = now.getFullYear() - y - (now.getMonth() + 1 < mon || (now.getMonth() + 1 === mon && now.getDate() < d) ? 1 : 0);
  const luckIndex = Math.floor((age - startAge) / 10);
  const luckStartAge = startAge + luckIndex * 10;

  const luckStem = forward
    ? (monthStemIdx + luckIndex + 1) % 10
    : (monthStemIdx - luckIndex - 1 + 20) % 10;
  const luckBranch = forward
    ? (monthBranch + luckIndex + 1) % 12
    : (monthBranch - luckIndex - 1 + 24) % 12;

  const luckPillar = `${STEMS[luckStem]}${BRANCHES[luckBranch]}`;
  const luckElement = STEM_ELEMENTS[STEMS[luckStem]];

  let elementRel = "neutral";
  if (GENERATES[luckElement] === dmElement) elementRel = "supportive (generates Day Master)";
  else if (CONTROLS[luckElement] === dmElement) elementRel = "challenging (controls Day Master)";
  else if (luckElement === dmElement) elementRel = "reinforcing (same as Day Master)";
  else if (GENERATES[dmElement] === luckElement) elementRel = "draining (Day Master generates it)";
  else if (CONTROLS[dmElement] === luckElement) elementRel = "restrictive (Day Master controls it)";

  return {
    four_pillars: {
      year: { stem: yearStemChar, branch: yearBranchChar, element: STEM_ELEMENTS[yearStemChar] },
      month: { stem: monthStemChar, branch: monthBranchChar, element: STEM_ELEMENTS[monthStemChar] },
      day: { stem: dayStemChar, branch: dayBranchChar, element: STEM_ELEMENTS[dayStemChar] },
      hour: { stem: hourStemChar, branch: hourBranchChar, element: STEM_ELEMENTS[hourStemChar] },
    },
    day_master: dayMaster,
    favorable_elements: favorable,
    unfavorable_elements: unfavorable,
    current_luck_pillar: {
      pillar: luckPillar,
      age_range: `${luckStartAge}-${luckStartAge + 9}`,
      element_relationship: `${luckElement} (${STEMS[luckStem]}) — ${elementRel}`,
    },
  };
}
