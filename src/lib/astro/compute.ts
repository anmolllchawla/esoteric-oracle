// ─── Chart Computation Orchestrator ──────────────────────────────────
// Takes birth details → computes all four systems → returns full chart_data

import { calculateNumerology } from "./numerology";
import { calculateBazi } from "./bazi";
import { calculateVedic } from "./vedic";
import { calculateHumanDesign } from "./humandesign";

export interface BirthInput {
  name: string;
  birthDate: string;   // YYYY-MM-DD
  birthTime: string;   // HH:MM (24h, local)
  birthPlace: string;  // "City, Country" — geocoded to lat/lon
  latitude: number;
  longitude: number;
  phone?: string;
  queryFocus?: string;
}

export function computeChartData(input: BirthInput) {
  const { name, birthDate, birthTime, latitude, longitude, queryFocus } = input;

  const vedic = calculateVedic(birthDate, birthTime, latitude, longitude);
  const bazi = calculateBazi(birthDate, birthTime);
  const numerology = calculateNumerology(birthDate, name);
  const humandesign = calculateHumanDesign(birthDate, birthTime, vedic.planets);

  return {
    name,
    birth_date: birthDate,
    birth_time: birthTime,
    birth_place: input.birthPlace,
    latitude,
    longitude,
    query_focus: queryFocus || "",
    chart_data: {
      vedic,
      chinese: bazi,
      numerology,
      human_design: humandesign,
    },
  };
}
