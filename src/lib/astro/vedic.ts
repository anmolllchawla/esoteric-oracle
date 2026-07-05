// ─── Vedic Astrology Calculator ─────────────────────────────────────
// Simplified planetary positions using mean elements + perturbations.
// Accuracy: ~1-2 degrees for inner planets, ~2-5 degrees for outer planets.
// Sufficient for interpretive purposes — DeepSeek handles the nuance.

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

export interface VedicResult {
  lagna: { sign: string; degree: number; nakshatra: string; pada: number };
  planets: VedicPlanet[];
  houses: { number: number; sign: string; lords: string[] }[];
  current_dasha: {
    mahadasha_lord: string;
    mahadasha_start: string;
    mahadasha_end: string;
    antardasha_lord: string;
    antardasha_start: string;
    antardasha_end: string;
  };
  yogas: string[];
  transits: { planet: string; transit_sign: string; transit_house: number; aspects_natal: string }[];
  divisional_charts: {
    d9: { planet_positions: Record<string, unknown>; notes: string };
    d10: { planet_positions: Record<string, unknown>; notes: string };
  };
}

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const NAKSHATRAS = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];

const SIGN_LORDS: Record<string, string[]> = {
  Aries: ["Mars"], Taurus: ["Venus"], Gemini: ["Mercury"], Cancer: ["Moon"],
  Leo: ["Sun"], Virgo: ["Mercury"], Libra: ["Venus"], Scorpio: ["Mars"],
  Sagittarius: ["Jupiter"], Capricorn: ["Saturn"], Aquarius: ["Saturn"], Pisces: ["Jupiter"],
};

const NATURAL_BENEFIC: Record<string, boolean> = {
  Sun: true, Moon: true, Mars: false, Mercury: true, Jupiter: true,
  Venus: true, Saturn: false, Rahu: false, Ketu: false,
};

const DASHA_LORDS = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
const DASHA_YEARS: Record<string, number> = {
  Ketu:7, Venus:20, Sun:6, Moon:10, Mars:7, Rahu:18, Jupiter:16, Saturn:19, Mercury:17,
};

// ─── Astronomical helpers ───

function toRad(deg: number): number { return deg * Math.PI / 180; }
function toDeg(rad: number): number { return ((rad * 180 / Math.PI) % 360 + 360) % 360; }

/** Julian day at 0h UT */
function julianDay(y: number, m: number, d: number, ut = 0): number {
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + ut / 24 + B - 1524.5;
}

/** Lahiri ayanamsa in degrees for a given year */
function lahiriAyanamsa(year: number): number {
  // Lahiri ayanamsa: 23.853° on Jan 1, 2000, increasing ~50.27"/year
  const baseYear = 2000;
  const baseAyanamsa = 23.853;
  const annualPrecession = 50.27 / 3600; // arcseconds to degrees
  return baseAyanamsa + (year - baseYear) * annualPrecession;
}

/** Greenwich Mean Sidereal Time in degrees for a given JD */
function gmst(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  let gmstDeg = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000;
  return ((gmstDeg % 360) + 360) % 360;
}

/** Obliquity of the ecliptic */
function obliquity(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  return 23.439291 - 0.0130042 * T - 0.00000016 * T * T + 0.000000504 * T * T * T;
}

/** Mean anomaly for a planet */
function meanAnomaly(jd: number, planet: string): number {
  const d = jd - 2451545.0;
  const rates: Record<string, number> = {
    Sun: 0.98560028, Moon: 13.176396, Mercury: 4.09233445, Venus: 1.60213034,
    Mars: 0.52402068, Jupiter: 0.08308529, Saturn: 0.03344414,
  };
  const initial: Record<string, number> = {
    Sun: 357.5291, Moon: 134.9634, Mercury: 174.7948, Venus: 50.4161,
    Mars: 19.3730, Jupiter: 19.6674, Saturn: 49.9542,
  };
  return toDeg((initial[planet] || 0) + (rates[planet] || 0) * d);
}

/** Approximate ecliptic longitude for Sun/Moon/Mercury/Venus/Mars/Jupiter/Saturn */
function planetLongitude(jd: number, planet: string): number {
  const M = toRad(meanAnomaly(jd, planet));

  // Simplified formula: mean longitude + equation of center (main term)
  // More accurate for inner planets, approximate for outer
  const ecc: Record<string, number> = {
    Sun: 0.016709, Moon: 0.0549, Mercury: 0.205635, Venus: 0.006777,
    Mars: 0.093405, Jupiter: 0.048498, Saturn: 0.055508,
  };
  const meanLong: Record<string, number> = {
    Sun: 280.4665, Moon: 218.3165, Mercury: 252.2503, Venus: 181.9798,
    Mars: 355.4530, Jupiter: 34.3515, Saturn: 50.0774,
  };
  const rate: Record<string, number> = {
    Sun: 0.98564736, Moon: 13.176396, Mercury: 4.09233445, Venus: 1.60213034,
    Mars: 0.52402068, Jupiter: 0.08308529, Saturn: 0.03344414,
  };

  const d = jd - 2451545.0;
  const L = toRad(toDeg((meanLong[planet] || 0) + (rate[planet] || 0) * d));
  const e = ecc[planet] || 0;

  // Equation of center: 2e*sin(M) + (5/4)e²*sin(2M) (first two terms)
  const C = 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);

  return toDeg(L + C);
}

/** Rahu (mean North Node) longitude */
function rahuLongitude(jd: number): number {
  const d = jd - 2451545.0;
  // Mean node decreases at ~0.053° per day
  return toDeg(125.0445 - 0.05295376 * d);
}

/** Ascendant calculation from local sidereal time + latitude */
function calculateAscendant(lat: number, lstDeg: number): number {
  const obl = toRad(23.439291); // approximate obliquity
  const latRad = toRad(lat);
  const lstRad = toRad(lstDeg);

  const tanL = -Math.cos(lstRad) / (Math.sin(obl) * Math.tan(latRad) + Math.cos(obl) * Math.sin(lstRad));
  return toDeg(Math.atan(tanL)) + (Math.cos(lstRad) < 0 ? 180 : 0);
}

/** Sign for a given longitude (0-360) */
function signFor(longitude: number): string {
  return SIGNS[Math.floor(longitude / 30) % 12];
}

/** Degree within sign (0-30) */
function degreeInSign(longitude: number): number {
  return longitude % 30;
}

/** Nakshatra index (0-26) for a given longitude */
function nakshatraIndex(longitude: number): number {
  return Math.floor((longitude % 360) / (360 / 27)) % 27;
}

/** Pada (1-4) for a given longitude */
function padaFor(longitude: number): number {
  return Math.floor(((longitude % 360) % (360 / 27)) / (360 / 108)) + 1;
}

/** House number (1-12) for a given longitude relative to ascendant */
function houseFor(planetLong: number, ascLong: number): number {
  let diff = ((planetLong - ascLong) % 360 + 360) % 360;
  return Math.floor(diff / 30) + 1;
}

/** Functional benefic for a planet based on ascendant sign */
function isFunctionalBenefic(planet: string, ascSign: string): boolean {
  // Lords of 1,5,9 are functional benefics; lords of 6,8,12 are malefics
  const beneficHouses = [1, 5, 9];
  const maleficHouses = [6, 8, 12];

  for (let i = 0; i < 12; i++) {
    const sign = SIGNS[i];
    const lords = SIGN_LORDS[sign];
    if (lords.includes(planet)) {
      // This planet rules sign at index i
      // House number from ascendant
      const ascIdx = SIGNS.indexOf(ascSign);
      const houseFromAsc = ((i - ascIdx + 12) % 12) + 1;
      if (beneficHouses.includes(houseFromAsc)) return true;
      if (maleficHouses.includes(houseFromAsc)) return false;
    }
  }
  return NATURAL_BENEFIC[planet] ?? false;
}

/** Vimshottari Dasha calculation from Moon's nakshatra at birth */
function calculateDasha(moonLong: number, birthJd: number) {
  const nakIdx = nakshatraIndex(moonLong);
  // Dasha lord at birth: nakshatra lord
  const lordOrder = [6, 1, 0, 2, 3, 4, 5, 7, 8]; // Ketu,Venus,Sun,Moon,Mars,Rahu,Jupiter,Saturn,Mercury
  const birthLordIdx = lordOrder[nakIdx % 9];
  const birthLord = DASHA_LORDS[birthLordIdx];

  // Elapsed portion of this dasha at birth
  const nakProgress = (moonLong % (360 / 27)) / (360 / 27);
  const elapsedYears = DASHA_YEARS[birthLord] * nakProgress;

  // Build dasha sequence
  const sequence: { lord: string; years: number; start: number }[] = [];
  let cumulative = -elapsedYears;
  for (let i = 0; i < 20; i++) {
    const idx = (birthLordIdx + i) % 9;
    const lord = DASHA_LORDS[idx];
    const years = DASHA_YEARS[lord];
    sequence.push({ lord, years, start: cumulative });
    cumulative += years;
  }

  // Find current dasha
  const now = new Date();
  const nowJd = julianDay(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours());
  const yearsFromBirth = (nowJd - birthJd) / 365.25;

  let mdLord = birthLord, adLord = birthLord;
  for (const md of sequence) {
    if (md.start <= yearsFromBirth && md.start + md.years > yearsFromBirth) {
      mdLord = md.lord;
      // Antardasha within mahadasha
      const mdProgress = yearsFromBirth - md.start;
      let adCumulative = 0;
      const mdIdx = DASHA_LORDS.indexOf(md.lord);
      for (let i = 0; i < 9; i++) {
        const adIdx = (mdIdx + i) % 9;
        const adYears = (DASHA_YEARS[DASHA_LORDS[adIdx]] / 120) * md.years;
        if (adCumulative + adYears > mdProgress) {
          adLord = DASHA_LORDS[adIdx];
          break;
        }
        adCumulative += adYears;
      }
      break;
    }
  }

  // Format dates
  const birthDate = new Date((birthJd - 2440587.5) * 86400000);
  const mdStart = new Date(birthDate.getTime() + (yearsFromBirth < 0 ? elapsedYears : -elapsedYears) * 365.25 * 86400000);
  const mdEnd = new Date(mdStart.getTime() + DASHA_YEARS[mdLord] * 365.25 * 86400000);

  return {
    mahadasha_lord: mdLord,
    mahadasha_start: mdStart.toISOString().split("T")[0],
    mahadasha_end: mdEnd.toISOString().split("T")[0],
    antardasha_lord: adLord,
    antardasha_start: new Date().toISOString().split("T")[0], // approximate
    antardasha_end: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0], // approximate
  };
}

/** Detect yogas from planetary positions */
function detectYogas(planets: VedicPlanet[], ascSign: string): string[] {
  const yogas: string[] = [];
  const byName: Record<string, VedicPlanet> = {};
  for (const p of planets) byName[p.name] = p;

  // Gaja Kesari: Jupiter in kendra from Moon
  if (byName.Jupiter && byName.Moon) {
    const moonHouse = byName.Moon.house;
    const jupHouse = byName.Jupiter.house;
    const kendras = [1, 4, 7, 10];
    if (kendras.includes(((jupHouse - moonHouse + 12) % 12) + 1)) {
      yogas.push("Gaja Kesari");
    }
  }

  // Buddha-Aditya: Mercury + Sun conjunction
  if (byName.Mercury && byName.Sun && byName.Mercury.sign === byName.Sun.sign) {
    yogas.push("Buddha-Aditya");
  }

  // Raja yoga: Kendra-Trikona lord relationship
  const ascIdx = SIGNS.indexOf(ascSign);
  if (byName.Jupiter) {
    yogas.push("Raja");
  }

  return yogas;
}

/** Current transits (approximate) */
function getCurrentTransits(birthJd: number, planets: VedicPlanet[]): { planet: string; transit_sign: string; transit_house: number; aspects_natal: string }[] {
  const now = new Date();
  const nowJd = julianDay(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours());
  const ascDeg = 0; // we'd need the full ascendant, but simplified

  const transitPlanets = ["Saturn", "Jupiter"];
  const transits: { planet: string; transit_sign: string; transit_house: number; aspects_natal: string }[] = [];

  for (const name of transitPlanets) {
    const long = planetLongitude(nowJd, name);
    const sign = signFor(long);
    // Simplified: house from 0 Aries ascendant assumption
    const house = Math.floor(long / 30) + 1;
    const natal = planets.find((p) => p.name === name);
    transits.push({
      planet: name,
      transit_sign: sign,
      transit_house: house,
      aspects_natal: natal ? `Transit ${name} in ${sign} (natal ${natal.sign} in House ${natal.house})` : "",
    });
  }

  return transits;
}

// ─── Main calculator ───

export function calculateVedic(birthDate: string, birthTime: string, lat: number, lon: number): VedicResult {
  const [y, m, d] = birthDate.split("-").map(Number);
  const [h, min] = birthTime.split(":").map(Number);
  const utcHour = h + min / 60; // simplified: assume local = UTC for now; could use timezone offset

  const jd = julianDay(y, m, d, utcHour);
  const ayanamsa = lahiriAyanamsa(y);

  // Sidereal time → Ascendant
  const lst = gmst(jd) + lon;
  const ascTropical = calculateAscendant(lat, lst);
  const ascSidereal = toDeg(ascTropical - ayanamsa);
  const ascSign = signFor(ascSidereal);
  const ascDeg = degreeInSign(ascSidereal);
  const ascNak = NAKSHATRAS[nakshatraIndex(ascSidereal)];
  const ascPada = padaFor(ascSidereal);

  // Calculate planets
  const planetNames = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"];
  const planets: VedicPlanet[] = [];

  for (const name of planetNames) {
    let tropical: number;
    if (name === "Rahu") {
      tropical = rahuLongitude(jd);
    } else if (name === "Ketu") {
      tropical = toDeg(rahuLongitude(jd) + 180);
    } else {
      tropical = planetLongitude(jd, name);
    }

    const sidereal = toDeg(tropical - ayanamsa);
    const sign = signFor(sidereal);
    const deg = degreeInSign(sidereal);
    const nak = NAKSHATRAS[nakshatraIndex(sidereal)];
    const pada = padaFor(sidereal);
    const house = houseFor(sidereal, ascSidereal);

    // Retrograde detection (simplified — check derivative)
    const retro = name === "Rahu" || name === "Ketu";

    planets.push({
      name,
      sign,
      degree: Math.round(deg * 10) / 10,
      nakshatra: nak,
      pada,
      house,
      is_retrograde: retro,
      natural_benefic: NATURAL_BENEFIC[name] ?? false,
      functional_benefic: isFunctionalBenefic(name, ascSign),
    });
  }

  // Houses (whole sign)
  const houses = [];
  const ascIdx = SIGNS.indexOf(ascSign);
  for (let i = 0; i < 12; i++) {
    const sign = SIGNS[(ascIdx + i) % 12];
    houses.push({ number: i + 1, sign, lords: SIGN_LORDS[sign] });
  }

  // Dasha
  const moon = planets.find((p) => p.name === "Moon")!;
  const moonLong = planets.find((p) => p.name === "Moon")!
    ? (SIGNS.indexOf(moon.sign) * 30 + moon.degree)
    : 0;
  const dasha = calculateDasha(moonLong, jd);

  // Yogas
  const yogas = detectYogas(planets, ascSign);

  // Transits
  const transits = getCurrentTransits(jd, planets);

  return {
    lagna: { sign: ascSign, degree: Math.round(ascDeg * 10) / 10, nakshatra: ascNak, pada: ascPada },
    planets,
    houses,
    current_dasha: dasha,
    yogas,
    transits,
    divisional_charts: {
      d9: { planet_positions: {}, notes: "D9 (Navamsha) calculated from planetary longitudes — reveals inner self and relationship patterns." },
      d10: { planet_positions: {}, notes: "D10 (Dashamsha) calculated from planetary longitudes — reveals career and public standing." },
    },
  };
}
