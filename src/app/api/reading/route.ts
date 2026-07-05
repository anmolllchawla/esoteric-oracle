// ─── API Route: /api/reading ────────────────────────────────────────
// POST: { name, birthDate, birthTime, birthPlace, phone?, queryFocus? }
// → Computes chart data → Calls DeepSeek Flash for interpretation → Returns reading

import { NextRequest, NextResponse } from "next/server";
import { computeChartData } from "@/lib/astro/compute";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

interface PlaceCoords {
  lat: number;
  lon: number;
  displayName: string;
}

// Simple geocoding cache
const geocodeCache: Record<string, PlaceCoords> = {
  "vancouver": { lat: 49.2827, lon: -123.1207, displayName: "Vancouver, BC, Canada" },
  "toronto": { lat: 43.6532, lon: -79.3832, displayName: "Toronto, ON, Canada" },
  "new york": { lat: 40.7128, lon: -74.006, displayName: "New York, NY, USA" },
  "los angeles": { lat: 34.0522, lon: -118.2437, displayName: "Los Angeles, CA, USA" },
  "london": { lat: 51.5074, lon: -0.1278, displayName: "London, UK" },
  "mumbai": { lat: 19.076, lon: 72.8777, displayName: "Mumbai, India" },
  "delhi": { lat: 28.6139, lon: 77.209, displayName: "Delhi, India" },
  "surrey": { lat: 49.1913, lon: -122.849, displayName: "Surrey, BC, Canada" },
  "dubai": { lat: 25.2048, lon: 55.2708, displayName: "Dubai, UAE" },
  "singapore": { lat: 1.3521, lon: 103.8198, displayName: "Singapore" },
  "sydney": { lat: -33.8688, lon: 151.2093, displayName: "Sydney, Australia" },
  "paris": { lat: 48.8566, lon: 2.3522, displayName: "Paris, France" },
  "berlin": { lat: 52.52, lon: 13.405, displayName: "Berlin, Germany" },
  "tokyo": { lat: 35.6762, lon: 139.6503, displayName: "Tokyo, Japan" },
  "san francisco": { lat: 37.7749, lon: -122.4194, displayName: "San Francisco, CA, USA" },
  "chicago": { lat: 41.8781, lon: -87.6298, displayName: "Chicago, IL, USA" },
  "boston": { lat: 42.3601, lon: -71.0589, displayName: "Boston, MA, USA" },
  "seattle": { lat: 47.6062, lon: -122.3321, displayName: "Seattle, WA, USA" },
  "austin": { lat: 30.2672, lon: -97.7431, displayName: "Austin, TX, USA" },
  "bengaluru": { lat: 12.9716, lon: 77.5946, displayName: "Bengaluru, India" },
  "bangalore": { lat: 12.9716, lon: 77.5946, displayName: "Bangalore, India" },
  "montreal": { lat: 45.5017, lon: -73.5673, displayName: "Montreal, QC, Canada" },
  "calgary": { lat: 51.0447, lon: -114.0719, displayName: "Calgary, AB, Canada" },
};

async function geocode(place: string): Promise<PlaceCoords> {
  const key = place.toLowerCase().trim();
  if (geocodeCache[key]) return geocodeCache[key];

  // Try partial match
  for (const [cached, coords] of Object.entries(geocodeCache)) {
    if (key.includes(cached) || cached.includes(key)) {
      return coords;
    }
  }

  // Fallback: try OpenStreetMap Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { "User-Agent": "EsotericOracle/1.0" } });
    const data = await res.json();
    if (data && data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
      geocodeCache[key] = result;
      return result;
    }
  } catch {
    // fall through to default
  }

  return { lat: 28.6139, lon: 77.209, displayName: place }; // Default: Delhi
}

function buildPrompt(chartData: Record<string, unknown>): string {
  return `You are a master esoteric oracle. You receive a pre-computed birth chart across four systems and produce a unified reading.

## OUTPUT SCHEMA (return strictly valid JSON)

{
  "reading_id": "UUID",
  "sections": {
    "vedic": { "overview": "string", "detailed": {...}, "summary": "string" },
    "chinese": { "overview": "string", "detailed": {...}, "summary": "string" },
    "numerology": { "overview": "string", "detailed": {...}, "summary": "string" },
    "human_design": { "overview": "string", "detailed": {...}, "summary": "string" },
    "unified_synthesis": {
      "cross_system_themes": ["string..."],
      "conflicts_and_reconciliation": ["string..."],
      "query_answer": "string — specifically address the query_focus",
      "practical_guidance": ["string..."]
    }
  },
  "meta": {
    "confidence_score": "high|medium|low",
    "missing_data_notes": ["string..."],
    "model_version": "deepseek-v4-flash"
  }
}

## INTERPRETATION RULES

- Vedic uses sidereal zodiac only. Never mix tropical/sidereal.
- Zi Wei Dou Shu is optional. If empty, skip it.
- Numerology master numbers (11, 22, 33) are sacred — never reduce them.
- Human Design gates 1-64: use both number AND name.
- When systems conflict, surface it explicitly in conflicts_and_reconciliation. E.g., "Vedic Jupiter Dasha suggests expansion, but your HD Splenic Authority warns against forcing things. Resolution: trust the Splenic hit."
- Tone: Wise but grounded. "Sharp intuitive counselor" — not fortune teller.
- Every claim should trace back to a placement or number.
- No disclaimers about "consult a professional." Give the interpretation with confidence.
- If query_focus is set, all sections should orient toward answering it.
- Aim for 2000-3000 total tokens.

## CHART DATA

${JSON.stringify(chartData, null, 2)}

Return ONLY valid JSON — no markdown wrappers, no code fences. Start with { and end with }.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, birthDate, birthTime, birthPlace, phone, queryFocus } = body;

    if (!birthDate || !birthTime || !birthPlace) {
      return NextResponse.json({ error: "Missing required fields: birthDate, birthTime, birthPlace" }, { status: 400 });
    }

    // Geocode
    const coords = await geocode(birthPlace);

    // Compute chart
    const chartData = computeChartData({
      name: name || "",
      birthDate,
      birthTime,
      birthPlace,
      latitude: coords.lat,
      longitude: coords.lon,
      phone,
      queryFocus,
    });

    // Call DeepSeek
    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: "DEEPSEEK_API_KEY not configured on server" }, { status: 500 });
    }

    const prompt = buildPrompt(chartData);

    const deepseekRes = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!deepseekRes.ok) {
      const err = await deepseekRes.text();
      console.error("DeepSeek API error:", deepseekRes.status, err);
      return NextResponse.json({ error: `DeepSeek API error: ${deepseekRes.status}` }, { status: 502 });
    }

    const dsData = await deepseekRes.json();
    const content = dsData.choices?.[0]?.message?.content || "";

    // Parse the LLM's JSON response
    let reading;
    try {
      // Strip possible markdown code fences
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      reading = JSON.parse(cleaned);
    } catch {
      // If parsing fails, return raw content
      reading = { raw_response: content, note: "Could not parse as JSON — raw LLM output" };
    }

    return NextResponse.json({
      reading,
      chart_data: chartData.chart_data,
      location: coords,
    });
  } catch (e) {
    console.error("Reading generation error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
