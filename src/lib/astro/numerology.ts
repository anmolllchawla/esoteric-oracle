// ─── Numerology Calculator ───────────────────────────────────────────
// Pythagorean numerology from birth date and name.
// 100% accurate — pure date math.

export interface NumerologyResult {
  life_path: number;
  expression: number;
  soul_urge: number;
  personality: number;
  birthday: number;
  pinnacle_cycles: { age: string; number: number; meaning: string }[];
  challenge_cycles: { age: string; number: number }[];
  personal_year: number;
  personal_month: number;
  personal_day: number;
}

function digitSum(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split("").reduce((s, d) => s + parseInt(d), 0);
  }
  return n;
}

const LETTER_VALUES: Record<string, number> = {
  a:1,b:2,c:3,d:4,e:5,f:6,g:7,h:8,i:9,
  j:1,k:2,l:3,m:4,n:5,o:6,p:7,q:8,r:9,
  s:1,t:2,u:3,v:4,w:5,x:6,y:7,z:8,
};

function nameNumber(name: string): number {
  const cleaned = name.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return 0;
  const sum = cleaned.split("").reduce((s, c) => s + (LETTER_VALUES[c] || 0), 0);
  return digitSum(sum);
}

function vowelsNumber(name: string): number {
  const vowels = name.toLowerCase().replace(/[^aeiou]/g, "");
  if (!vowels) return 0;
  return digitSum(vowels.split("").reduce((s, c) => s + (LETTER_VALUES[c] || 0), 0));
}

function consonantsNumber(name: string): number {
  const cons = name.toLowerCase().replace(/[aeiou]/g, "").replace(/[^a-z]/g, "");
  if (!cons) return 0;
  return digitSum(cons.split("").reduce((s, c) => s + (LETTER_VALUES[c] || 0), 0));
}

const PINNACLE_MEANINGS: Record<number, string> = {
  1: "A period of independence and self-discovery. Take initiative.",
  2: "Cooperation and relationships take center stage. Develop patience.",
  3: "Creative self-expression and social expansion.",
  4: "Build foundations — career, home, long-term structures.",
  5: "Freedom, change, adventure. Expect unexpected opportunities.",
  6: "Responsibility, family, service. Nurture others.",
  7: "Inner growth, study, spiritual development.",
  8: "Material achievement, power, recognition.",
  9: "Completion and humanitarian service. Let go, give back.",
  11: "Master cycle of illumination. Heightened intuition.",
  22: "Master cycle of large-scale building.",
  33: "Master cycle of teaching and unconditional love.",
};

export function calculateNumerology(birthDate: string, name: string = ""): NumerologyResult {
  const d = new Date(birthDate + "T12:00:00"); // noon to avoid timezone issues
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();

  // Life Path
  const lifePath = digitSum(digitSum(month) + digitSum(day) + digitSum(year));

  // Birthday number
  const birthday = digitSum(day);

  // Expression / Soul Urge / Personality
  const expression = name ? nameNumber(name) : 0;
  const soulUrge = name ? vowelsNumber(name) : 0;
  const personality = name ? consonantsNumber(name) : 0;

  // Pinnacle cycles
  const firstPinnacle = digitSum(month + day);
  const secondPinnacle = digitSum(day + year);
  const thirdPinnacle = digitSum(firstPinnacle + secondPinnacle);
  const fourthPinnacle = digitSum(month + year);

  const baseAge = 36 - lifePath;
  const pinnacleCycles = [
    { age: `0-${baseAge}`, number: firstPinnacle, meaning: PINNACLE_MEANINGS[firstPinnacle] || "" },
    { age: `${baseAge}-${baseAge + 9}`, number: secondPinnacle, meaning: PINNACLE_MEANINGS[secondPinnacle] || "" },
    { age: `${baseAge + 9}-${baseAge + 18}`, number: thirdPinnacle, meaning: PINNACLE_MEANINGS[thirdPinnacle] || "" },
    { age: `${baseAge + 18}+`, number: fourthPinnacle, meaning: PINNACLE_MEANINGS[fourthPinnacle] || "" },
  ];

  // Challenge cycles
  const challengeCycles = [
    { age: `0-${baseAge}`, number: digitSum(Math.abs(month - day)) },
    { age: `${baseAge}-${baseAge + 9}`, number: digitSum(Math.abs(day - year)) },
    { age: `${baseAge + 9}-${baseAge + 18}`, number: digitSum(Math.abs(firstPinnacle - secondPinnacle)) },
    { age: `${baseAge + 18}+`, number: digitSum(Math.abs(month - year)) },
  ];

  // Personal year/month/day
  const now = new Date();
  const currentYear = now.getFullYear();
  const personalYear = digitSum(digitSum(day) + digitSum(month) + digitSum(currentYear));
  const personalMonth = digitSum(personalYear + (now.getMonth() + 1));
  const personalDay = digitSum(personalMonth + now.getDate());

  return {
    life_path: lifePath,
    expression,
    soul_urge: soulUrge,
    personality,
    birthday,
    pinnacle_cycles: pinnacleCycles,
    challenge_cycles: challengeCycles,
    personal_year: personalYear,
    personal_month: personalMonth,
    personal_day: personalDay,
  };
}
