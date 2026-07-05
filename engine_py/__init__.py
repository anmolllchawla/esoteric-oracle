"""
Esoteric Oracle — Unified Calculator
Rule-based. Computes Vedic, Bazi, Numerology, and Human Design from birth details.
No AI involved in calculation — purely ephemeris + cycle math.
"""

import json
import sys
from datetime import datetime

from .vedic import calculate_vedic
from .bazi import calculate_bazi
from .numerology import calculate_numerology
from .humandesign import calculate_humandesign


def compute_all(birth_date, birth_time, lat, lon, tz_offset, birth_place="",
                name="", query_focus=""):
    """Compute all four systems from birth details.

    Returns a dict with chart_data + metadata.
    """
    vedic = calculate_vedic(birth_date, birth_time, lat, lon, tz_offset)
    bazi = calculate_bazi(birth_date, birth_time)
    numerology = calculate_numerology(birth_date, name)

    planets_for_hd = vedic["planets"]
    humandesign = calculate_humandesign(planets_for_hd)

    return {
        "name": name,
        "birth_date": birth_date,
        "birth_time": birth_time,
        "birth_place": birth_place,
        "latitude": lat,
        "longitude": lon,
        "tz_offset": tz_offset,
        "query_focus": query_focus or "",
        "chart_data": {
            "vedic": vedic,
            "chinese": bazi,
            "numerology": numerology,
            "human_design": humandesign,
        },
    }


def main():
    """CLI entry point. Reads JSON from stdin or --file."""
    import argparse

    parser = argparse.ArgumentParser(description="Esoteric Oracle Calculator")
    parser.add_argument("--file", "-f", type=str, help="Input JSON file")
    parser.add_argument("--output", "-o", type=str, help="Output JSON file")
    args = parser.parse_args()

    if args.file:
        raw = open(args.file).read()
    else:
        raw = sys.stdin.read()

    data = json.loads(raw)

    # Support both wrapped and flat input
    chart = data.get("chart_data", data) if not all(k in data for k in
        ["birth_date", "birth_time", "latitude"]) else data

    if "birth_date" in data:
        result = compute_all(
            birth_date=data["birth_date"],
            birth_time=data.get("birth_time", "12:00"),
            lat=float(data.get("latitude", 28.6)),
            lon=float(data.get("longitude", 77.2)),
            tz_offset=float(data.get("tz_offset", 0)),
            birth_place=data.get("birth_place", ""),
            name=data.get("name", ""),
            query_focus=data.get("query_focus", ""),
        )
    else:
        print("Input must contain birth_date, birth_time, latitude, longitude",
              file=sys.stderr)
        sys.exit(1)

    output = json.dumps(result, indent=2, ensure_ascii=False)

    if args.output:
        open(args.output, "w").write(output)
        print(f"Written to {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
