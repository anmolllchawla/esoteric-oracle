"""
Vercel Python Serverless Function — Esoteric Oracle
1. Computes chart data from birth details (Swiss Ephemeris — rule-based)
2. Calls DeepSeek Flash for interpretation
3. Returns full reading
"""

import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse
from datetime import datetime
from urllib.request import Request, urlopen

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from vedic import calculate_vedic
from bazi import calculate_bazi
from numerology import calculate_numerology
from humandesign import calculate_humandesign


GEOCODE_CACHE = {
    "vancouver": (49.2827, -123.1207, "Vancouver, BC, Canada"),
    "toronto": (43.6532, -79.3832, "Toronto, ON, Canada"),
    "surrey": (49.1913, -122.8490, "Surrey, BC, Canada"),
    "new york": (40.7128, -74.0060, "New York, NY, USA"),
    "los angeles": (34.0522, -118.2437, "Los Angeles, CA, USA"),
    "london": (51.5074, -0.1278, "London, UK"),
    "mumbai": (19.0760, 72.8777, "Mumbai, India"),
    "delhi": (28.6139, 77.2090, "Delhi, India"),
    "ambala": (30.3250, 76.8500, "Ambala, Haryana, India"),
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
    "chicago": (41.8781, -87.6298, "Chicago, IL, USA"),
    "boston": (42.3601, -71.0589, "Boston, MA, USA"),
    "austin": (30.2672, -97.7431, "Austin, TX, USA"),
    "melbourne": (-37.8136, 144.9631, "Melbourne, Australia"),
    "hong kong": (22.3193, 114.1694, "Hong Kong"),
    "shanghai": (31.2304, 121.4737, "Shanghai, China"),
}

# Timezone map: place keyword -> UTC offset in hours
TZ_MAP = {
    "india": 5.5,
    "mumbai": 5.5, "delhi": 5.5, "ambala": 5.5, "bengaluru": 5.5, "bangalore": 5.5,
    "calcutta": 5.5, "kolkata": 5.5, "chennai": 5.5, "hyderabad": 5.5,
    "pune": 5.5, "ahmedabad": 5.5, "jaipur": 5.5, "lucknow": 5.5, "chandigarh": 5.5,
    "vancouver": -8, "surrey": -8, "toronto": -5, "montreal": -5,
    "calgary": -7, "new york": -5, "chicago": -6, "boston": -5,
    "los angeles": -8, "san francisco": -8, "seattle": -8, "austin": -6,
    "london": 0, "paris": 1, "berlin": 1,
    "dubai": 4, "singapore": 8, "hong kong": 8, "shanghai": 8,
    "tokyo": 9, "sydney": 10, "melbourne": 10,
}
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE = "https://api.deepseek.com/v1"

INTERPRETATION_PROMPT = """You are a master esoteric oracle. You receive a pre-computed birth chart across four systems and produce a unified reading.

TODAY'S DATE: {today}

OUTPUT SCHEMA (return strictly valid JSON):
{{
  "reading_id": "UUID",
  "sections": {{
    "vedic": {{ "overview": "string", "summary": "string", "detailed": {{}} }},
    "chinese": {{ "overview": "string", "summary": "string", "detailed": {{}} }},
    "numerology": {{ "overview": "string", "summary": "string", "detailed": {{}} }},
    "human_design": {{ "overview": "string", "summary": "string", "detailed": {{}} }},
    "unified_synthesis": {{
      "cross_system_themes": ["string..."],
      "conflicts_and_reconciliation": ["string..."],
      "query_answer": "string",
      "practical_guidance": ["string..."]
    }}
  }},
  "meta": {{
    "confidence_score": "high|medium|low",
    "missing_data_notes": ["..."],
    "model_version": "deepseek-v4-flash"
  }}
}}

RULES:
- Vedic uses sidereal zodiac only
- Master numbers (11,22,33) are sacred — never reduce
- HD gates use number + name (e.g., "Gate 1 — The Creative")
- Surface system conflicts explicitly
- Tone: Wise, grounded, specific. Not fortune-teller.
- Every claim must trace back to a placement or number
- No disclaimers — interpret with confidence
- {query_instruction}
- Today is {today}. Use THIS date for transits, personal years, dashas — not 2025.
- Return ONLY valid JSON, no markdown, no code fences"""


def geocode(place):
    key = place.lower().strip()
    if key in GEOCODE_CACHE:
        return GEOCODE_CACHE[key]
    for cached, (lat, lon, name) in GEOCODE_CACHE.items():
        if key in cached or cached in key:
            return (lat, lon, name)
    return (28.6139, 77.209, place)


def compute_chart(name, birth_date, birth_time, lat, lon, tz_offset):
    vedic = calculate_vedic(birth_date, birth_time, lat, lon, tz_offset)
    bazi = calculate_bazi(birth_date, birth_time)
    numerology = calculate_numerology(birth_date, name)
    hd = calculate_humandesign(vedic["planets"])
    return {"vedic": vedic, "chinese": bazi, "numerology": numerology, "human_design": hd}


def call_deepseek(chart_data, query_focus, name):
    today = datetime.now().strftime("%Y-%m-%d")
    query_instruction = f"The user's question is: '{query_focus}'. Orient all sections toward answering this." if query_focus else "No specific query — provide a general life reading."

    prompt_text = INTERPRETATION_PROMPT.format(today=today, query_instruction=query_instruction)

    user_msg = f"Generate a unified esoteric reading for {name or 'this person'}.\n\nCHART DATA:\n{json.dumps(chart_data, indent=2, ensure_ascii=False)}"

    payload = json.dumps({
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": prompt_text},
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.7,
        "max_tokens": 4000,
    }).encode("utf-8")

    req = Request(
        f"{DEEPSEEK_BASE}/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        },
        method="POST",
    )

    resp = urlopen(req, timeout=60)
    data = json.loads(resp.read())

    content = data["choices"][0]["message"]["content"]
    cleaned = content.replace("```json\n", "").replace("```\n", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"raw_response": content, "note": "Could not parse as JSON"}


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ("/api/oracle", "/api/oracle/", "/"):
            self.send_json({
                "service": "Esoteric Oracle (Python + DeepSeek)",
                "version": "2.0",
                "today": datetime.now().strftime("%Y-%m-%d"),
                "usage": "POST /api/oracle with {birth_date, birth_time, birth_place}",
            })
        else:
            self.send_json({"error": "Not found"}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/oracle":
            self.send_json({"error": "Not found"}, 404)
            return

        try:
            content_len = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_len))

            name = body.get("name", "")
            birth_date = body.get("birth_date") or body.get("birthDate", "")
            birth_time = body.get("birth_time") or body.get("birthTime", "12:00")
            birth_place = body.get("birth_place") or body.get("birthPlace", "")
            lat = body.get("latitude") or body.get("lat")
            lon = body.get("longitude") or body.get("lon")
            tz_offset = body.get("tz_offset") or body.get("tzOffset")
            query_focus = body.get("query_focus") or body.get("queryFocus", "")

            if not birth_date or not birth_time or not birth_place:
                self.send_json({"error": "Missing required: birth_date, birth_time, birth_place"}, 400)
                return

            if lat is None or lon is None:
                geo_lat, geo_lon, place_name = geocode(birth_place)
                lat, lon = geo_lat, geo_lon
            else:
                place_name = birth_place

            if tz_offset is None:
                # Check TZ_MAP for known cities/countries in the place name
                tz_offset = None
                place_lower = (birth_place or place_name or "").lower()
                for keyword, offset in TZ_MAP.items():
                    if keyword in place_lower:
                        tz_offset = offset
                        break
                if tz_offset is None:
                    tz_offset = max(-12, min(12, round(lon / 15)))

            # Compute chart (rule-based)
            try:
                chart_data = compute_chart(name, birth_date, birth_time, lat, lon, tz_offset)
            except Exception as e:
                self.send_json({"error": f"Chart computation failed: {str(e)}"}, 400)
                return

            # DeepSeek interpretation
            try:
                reading = call_deepseek(chart_data, query_focus, name)
            except Exception as e:
                self.send_json({
                    "chart_data": chart_data,
                    "location": {"displayName": place_name, "lat": lat, "lon": lon, "tz_offset": tz_offset},
                    "reading_error": f"AI service error: {str(e)}",
                    "chart_only": True,
                })
                return

            self.send_json({
                "reading": reading,
                "chart_data": chart_data,
                "location": {"displayName": place_name, "lat": lat, "lon": lon, "tz_offset": tz_offset},
                "today": datetime.now().strftime("%Y-%m-%d"),
            })

        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON"}, 400)
        except Exception as e:
            self.send_json({"error": f"Internal error: {str(e)}"}, 500)

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2, ensure_ascii=False).encode("utf-8"))
