# ─── API Service ───────────────────────────────────────────────────
# FastAPI endpoint that:
# 1. Accepts birth details (name, DOB, time, place, query focus)
# 2. Geocodes place → lat/lon
# 3. Computes chart data via the Python engine (Swiss Ephemeris)
# 4. Calls DeepSeek Flash for the reading interpretation
# 5. Returns the full reading

import os
import json
import logging
from datetime import datetime
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add engine_py to path
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from engine_py import compute_all

# ─── Config ────────────────────────────────────────────────────────

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE = "https://api.deepseek.com/v1"

# Simple geocode cache
GEOCODE_CACHE = {
    "vancouver": (49.2827, -123.1207, "Vancouver, BC, Canada"),
    "toronto": (43.6532, -79.3832, "Toronto, ON, Canada"),
    "surrey": (49.1913, -122.8490, "Surrey, BC, Canada"),
    "new york": (40.7128, -74.0060, "New York, NY, USA"),
    "los angeles": (34.0522, -118.2437, "Los Angeles, CA, USA"),
    "london": (51.5074, -0.1278, "London, UK"),
    "mumbai": (19.0760, 72.8777, "Mumbai, India"),
    "delhi": (28.6139, 77.2090, "Delhi, India"),
    "dubai": (25.2048, 55.2708, "Dubai, UAE"),
    "singapore": (1.3521, 103.8198, "Singapore"),
    "sydney": (-33.8688, 151.2093, "Sydney, Australia"),
    "paris": (48.8566, 2.3522, "Paris, France"),
    "berlin": (52.5200, 13.4050, "Berlin, Germany"),
    "tokyo": (35.6762, 139.6503, "Tokyo, Japan"),
    "san francisco": (37.7749, -122.4194, "San Francisco, CA, USA"),
    "seattle": (47.6062, -122.3321, "Seattle, WA, USA"),
    "bengaluru": (12.9716, 77.5946, "Bengaluru, India"),
    "bangalore": (12.9716, 77.5946, "Bangalore, India"),
    "montreal": (45.5017, -73.5673, "Montreal, QC, Canada"),
    "calgary": (51.0447, -114.0719, "Calgary, AB, Canada"),
    "chicago": (41.8781, -87.6298, "Chicago, IL, USA"),
    "boston": (42.3601, -71.0589, "Boston, MA, USA"),
    "austin": (30.2672, -97.7431, "Austin, TX, USA"),
    "melbourne": (-37.8136, 144.9631, "Melbourne, Australia"),
    "hong kong": (22.3193, 114.1694, "Hong Kong"),
    "shanghai": (31.2304, 121.4737, "Shanghai, China"),
}

# ─── Pydantic Models ───────────────────────────────────────────────

class ReadingRequest(BaseModel):
    name: Optional[str] = ""
    birth_date: str  # YYYY-MM-DD
    birth_time: str  # HH:MM (24h local)
    birth_place: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    tz_offset: Optional[float] = None
    query_focus: Optional[str] = ""
    phone: Optional[str] = ""

# ─── App Setup ─────────────────────────────────────────────────────

app = FastAPI(title="Esoteric Oracle API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("oracle")

# ─── Geocoding ─────────────────────────────────────────────────────

async def geocode(place: str):
    """Geocode a place name to lat/lon."""
    key = place.lower().strip()
    if key in GEOCODE_CACHE:
        return GEOCODE_CACHE[key]

    # Partial match
    for cached, (lat, lon, name) in GEOCODE_CACHE.items():
        if key in cached or cached in key:
            return (lat, lon, name)

    # Fallback to Nominatim
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={place}&format=json&limit=1"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers={"User-Agent": "EsotericOracle/2.0"})
            data = resp.json()
            if data:
                lat = float(data[0]["lat"])
                lon = float(data[0]["lon"])
                display = data[0]["display_name"]
                return (lat, lon, display)
    except Exception as e:
        log.warning(f"Geocode failed for {place}: {e}")

    return (28.6139, 77.209, place)  # Default Delhi

# ─── DeepSeek Integration ──────────────────────────────────────────

INTERPRETATION_SYSTEM_PROMPT = """You are a master esoteric oracle. You receive a computed birth chart across four systems and produce a unified reading.

TODAY'S DATE: {today_date}

## OUTPUT SCHEMA (return strictly valid JSON)
{{
  "reading_id": "UUID",
  "sections": {{
    "vedic": {{ "overview": "string", "summary": "string" }},
    "chinese": {{ "overview": "string", "summary": "string" }},
    "numerology": {{ "overview": "string", "summary": "string" }},
    "human_design": {{ "overview": "string", "summary": "string" }},
    "unified_synthesis": {{
      "cross_system_themes": ["string..."],
      "conflicts_and_reconciliation": ["string..."],
      "query_answer": "string — specifically address the query_focus",
      "practical_guidance": ["string..."]
    }}
  }},
  "meta": {{
    "confidence_score": "high|medium|low",
    "missing_data_notes": ["string..."],
    "model_version": "deepseek-v4-flash"
  }}
}}

## INTERPRETATION RULES
1. Vedic uses sidereal zodiac only. Never mix tropical/sidereal.
2. Numerology master numbers (11, 22, 33) are sacred — never reduce them.
3. Human Design gates 1-64 — use both number AND name.
4. When systems conflict, surface it explicitly.
5. Tone: Wise but grounded. "Sharp intuitive counselor" — not fortune teller.
6. Every claim traces back to a placement or number.
7. No disclaimers. Give the interpretation with confidence.
8. If query_focus is set, all sections should orient toward answering it.
9. Aim for 2000-3000 total tokens.
10. TODAY'S DATE IS {today_date}. All current transits, personal years, and dasha periods should reference THIS date — not 2025.
11. Return ONLY valid JSON. No markdown wrappers, no code fences. Start with {{ and end with }}."""


async def call_deepseek(chart_data: dict, query_focus: str, name: str):
    """Call DeepSeek Flash to generate the reading interpretation."""
    if not DEEPSEEK_API_KEY:
        raise HTTPException(status_code=500, detail="DEEPSEEK_API_KEY not configured")

    today = datetime.now().strftime("%Y-%m-%d")
    system_prompt = INTERPRETATION_SYSTEM_PROMPT.format(today_date=today)

    user_message = f"""Generate a unified esoteric reading for {name or 'this person'}.

QUERY: {query_focus or 'General life overview'}

CHART DATA:
{json.dumps(chart_data, indent=2, ensure_ascii=False)}

Return the reading in the exact JSON format specified in the instructions."""

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{DEEPSEEK_BASE}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "temperature": 0.7,
                "max_tokens": 4000,
            },
        )

    if resp.status_code != 200:
        log.error(f"DeepSeek API error: {resp.status_code} {resp.text}")
        raise HTTPException(status_code=502, detail=f"AI service error: {resp.status_code}")

    data = resp.json()
    content = data["choices"][0]["message"]["content"]

    # Parse the JSON from the response
    cleaned = content.replace("```json\n", "").replace("```\n", "").replace("```", "").strip()
    try:
        reading = json.loads(cleaned)
    except json.JSONDecodeError:
        reading = {"raw_response": content, "note": "Could not parse as JSON"}

    return reading


# ─── Routes ────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "Esoteric Oracle API",
        "version": "2.0",
        "usage": "POST /api/reading with birth details",
        "today": datetime.now().strftime("%Y-%m-%d"),
    }


@app.post("/api/reading")
async def create_reading(req: ReadingRequest):
    """Generate a complete reading from birth details."""

    # Geocode if lat/lon not provided
    lat = req.latitude
    lon = req.longitude
    place_name = req.birth_place

    if lat is None or lon is None:
        geo_lat, geo_lon, place_name = await geocode(req.birth_place)
        lat = geo_lat
        lon = geo_lon

    # Determine timezone offset (rough estimate from longitude)
    tz_offset = req.tz_offset
    if tz_offset is None:
        tz_offset = round(lon / 15)
        # Clamp to reasonable values
        tz_offset = max(-12, min(12, tz_offset))

    try:
        # Compute chart data (rule-based, no AI)
        computation = compute_all(
            birth_date=req.birth_date,
            birth_time=req.birth_time,
            lat=lat,
            lon=lon,
            tz_offset=tz_offset,
            birth_place=place_name,
            name=req.name or "",
            query_focus=req.query_focus or "",
        )
    except Exception as e:
        log.exception("Chart computation failed")
        raise HTTPException(status_code=400, detail=f"Chart computation error: {str(e)}")

    chart_data = computation["chart_data"]

    # Call DeepSeek for interpretation
    reading = await call_deepseek(chart_data, req.query_focus or "", req.name or "")

    missing = []
    confidence = "high"

    return {
        "reading": reading,
        "chart_data": chart_data,
        "location": {
            "displayName": place_name,
            "lat": lat,
            "lon": lon,
            "tz_offset": tz_offset,
        },
        "reading_id": reading.get("reading_id", ""),
    }


@app.get("/api/health")
async def health():
    return {"status": "ok", "time": datetime.now().isoformat()}


# ─── Run ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8400))
    uvicorn.run(app, host="0.0.0.0", port=port)
