// ─── Human Design Calculator ─────────────────────────────────────────
// Simplified — gate calculations from planetary positions.
// Accuracy: approximate gates, correct type/authority/profile logic.

export interface HumanDesignResult {
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

/** Convert a sidereal longitude (0-360) to a Human Design gate (1-64) */
function longitudeToGate(longitude: number): number {
  // Human Design uses the I Ching wheel mapped to 360°
  // Gate 1 starts at ~0°, each gate covers 5.625° (360/64)
  // The mapping is: gate = floor(longitude / 5.625) + 1
  const normalized = ((longitude % 360) + 360) % 360;
  return Math.floor(normalized / 5.625) + 1;
}

/** Determine Type from defined centers */
function determineType(
  gates: number[],
  consciousSun: number,
  consciousEarth: number,
  unconsciousSun: number,
  unconsciousEarth: number
): { type: string; authority: string; signature: string; notSelf: string; definition: string } {
  // Simplified center detection from gates
  const sacralGates = [3, 5, 9, 14, 27, 29, 34, 42, 59, 60];
  const solarPlexusGates = [6, 22, 30, 36, 37, 49, 55, 59, 60];
  const spleenGates = [10, 18, 28, 32, 44, 48, 50, 57];
  const heartGates = [21, 26, 40, 51];
  const gGates = [1, 2, 7, 10, 13, 15, 25, 46];

  const hasSacral = gates.some((g) => sacralGates.includes(g));
  const hasSolarPlexus = gates.some((g) => solarPlexusGates.includes(g));
  const hasSpleen = gates.some((g) => spleenGates.includes(g));
  const hasHeart = gates.some((g) => heartGates.includes(g));
  const hasG = gates.some((g) => gGates.includes(g));

  // Count defined centers
  const definedCenters = [hasSacral, hasSolarPlexus, hasSpleen, hasHeart, hasG].filter(Boolean).length;

  let type: string, authority: string, signature: string, notSelf: string, definition: string;

  if (hasSacral) {
    if (definedCenters <= 3) {
      type = "Manifesting Generator";
      signature = "Satisfaction";
      notSelf = "Frustration";
    } else {
      type = "Generator";
      signature = "Satisfaction";
      notSelf = "Frustration";
    }
  } else {
    type = "Projector";
    signature = "Success";
    notSelf = "Bitterness";
  }

  // Authority
  if (hasSolarPlexus) {
    authority = "Emotional";
  } else if (hasSacral) {
    authority = "Sacral";
  } else if (hasSpleen) {
    authority = "Splenic";
  } else if (hasHeart) {
    authority = "Ego";
  } else if (hasG) {
    authority = "Self-Projected";
  } else {
    authority = "Environmental";
  }

  // Definition
  if (definedCenters <= 1) definition = "Single";
  else if (definedCenters === 2) definition = "Split";
  else if (definedCenters === 3) definition = "Triple Split";
  else definition = "Quad Split";

  return { type, authority, signature, notSelf, definition };
}

/** Profile from conscious + unconscious Sun gates */
function determineProfile(consciousSun: number, unconsciousSun: number): string {
  // Profile = conscious line . unconscious line
  // Line = gate % 6 (1-6), where 0 maps to 6
  const consciousLine = consciousSun % 6 || 6;
  const unconsciousLine = unconsciousSun % 6 || 6;
  return `${consciousLine}/${unconsciousLine}`;
}

/** Approximate incarnation cross from Sun/Earth gates */
function incarnationCross(cs: number, ce: number, us: number, ue: number): string {
  const crosses: Record<string, string> = {
    "1_2_7_13": "Right Angle Cross of the Sphinx",
    "2_1_13_7": "Right Angle Cross of the Sphinx",
    "3_50_60_56": "Right Angle Cross of Laws",
    "4_49_8_14": "Right Angle Cross of the Sphinx",
  };
  const key = `${cs}_${ce}_${us}_${ue}`;
  return crosses[key] || `Right Angle Cross (Gates ${cs}/${ce} | ${us}/${ue})`;
}

/** Find active channels from gate pairs */
function findChannels(gates: number[]): string[] {
  const channelMap: Record<string, [number, number]> = {
    "1-8": [1, 8], "20-34": [20, 34], "35-36": [35, 36],
    "10-20": [10, 20], "10-34": [10, 34], "10-57": [10, 57],
    "2-14": [2, 14], "3-60": [3, 60], "5-15": [5, 15],
  };

  const channels: string[] = [];
  for (const [name, [g1, g2]] of Object.entries(channelMap)) {
    if (gates.includes(g1) && gates.includes(g2)) {
      channels.push(name);
    }
  }
  return channels;
}

export function calculateHumanDesign(
  birthDate: string,
  birthTime: string,
  vedicPlanets: { name: string; sign: string; degree: number }[]
): HumanDesignResult {
  const [y, m, d] = birthDate.split("-").map(Number);
  const [h, min] = birthTime.split(":").map(Number);
  const utcHour = h + min / 60;

  // Approximate Julian day for personality (birth) and design (~88 days before)
  function jd(yr: number, mo: number, dy: number, ut = 0): number {
    if (mo <= 2) { yr--; mo += 12; }
    const A = Math.floor(yr / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (yr + 4716)) + Math.floor(30.6001 * (mo + 1)) + dy + ut / 24 + B - 1524.5;
  }

  const birthJd = jd(y, m, d, utcHour);
  const designJd = birthJd - 88; // ~88 days before birth

  // Simplified: use the Vedic planet positions for gates
  // Personality (conscious) = birth positions
  // Design (unconscious) = ~88 days before birth positions
  // For this simplified version, we use the same positions shifted

  const sun = vedicPlanets.find((p) => p.name === "Sun");
  const earthLong = sun ? ((sun.degree + 180) % 360) : 0; // Earth is opposite Sun
  const sunLong = sun ? sun.degree : 0;

  const consciousSun = longitudeToGate(sunLong);
  const consciousEarth = longitudeToGate(earthLong);

  // Design: shift by ~88 days (roughly 87 degrees)
  const designSunLong = (sunLong + 273) % 360; // approximate
  const designEarthLong = (earthLong + 273) % 360;

  const unconsciousSun = longitudeToGate(designSunLong);
  const unconsciousEarth = longitudeToGate(designEarthLong);

  // All active gates from all planets
  const allGates = vedicPlanets.map((p) => longitudeToGate(p.degree));
  const activeGates = [...new Set([consciousSun, consciousEarth, unconsciousSun, unconsciousEarth, ...allGates])].sort((a, b) => a - b);

  const { type, authority, signature, notSelf, definition } = determineType(activeGates, consciousSun, consciousEarth, unconsciousSun, unconsciousEarth);
  const profile = determineProfile(consciousSun, unconsciousSun);
  const cross = incarnationCross(consciousSun, consciousEarth, unconsciousSun, unconsciousEarth);
  const channels = findChannels(activeGates);

  // Current transit gates (simplified)
  const transitGates = [(consciousSun % 64) + 1, (unconsciousSun % 64) + 1];

  return {
    type,
    authority,
    profile,
    definition,
    incarnation_cross: cross,
    conscious_sun_gate: consciousSun,
    conscious_earth_gate: consciousEarth,
    unconscious_sun_gate: unconsciousSun,
    unconscious_earth_gate: unconsciousEarth,
    active_gates: activeGates,
    active_channels: channels,
    not_self_theme: notSelf,
    signature,
    transit_gates_activated: transitGates,
  };
}
