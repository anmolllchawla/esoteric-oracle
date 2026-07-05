"""
Vedic Astrology Calculator
Uses Swiss Ephemeris (pyswisseph) for sidereal planetary positions.
Rule-based — no AI involved in calculation.
"""

import swisseph as swe
import math
import os
from datetime import datetime, timezone, timedelta

SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
         "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
]

SIGN_LORDS = {
    "Aries": ["Mars"], "Taurus": ["Venus"], "Gemini": ["Mercury"],
    "Cancer": ["Moon"], "Leo": ["Sun"], "Virgo": ["Mercury"],
    "Libra": ["Venus"], "Scorpio": ["Mars"], "Sagittarius": ["Jupiter"],
    "Capricorn": ["Saturn"], "Aquarius": ["Saturn"], "Pisces": ["Jupiter"],
}

NATURAL_BENEFIC = {"Sun": True, "Moon": True, "Mars": False, "Mercury": True,
                   "Jupiter": True, "Venus": True, "Saturn": False,
                   "Rahu": False, "Ketu": False}

DASHA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu",
               "Jupiter", "Saturn", "Mercury"]
DASHA_YEARS = {"Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7,
               "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17}

BENEFIC_HOUSES = {1, 5, 9}
MALEFIC_HOUSES = {6, 8, 12}

EPHE_PATH = '/tmp/swe_ephe'


def init_ephe():
    os.makedirs(EPHE_PATH, exist_ok=True)
    swe.set_ephe_path(EPHE_PATH)


def to_utc(year, month, day, hour, minute, tz_offset):
    local = datetime(year, month, day, hour, minute)
    return local - timedelta(hours=tz_offset)


def julday_ut(dt):
    return swe.julday(dt.year, dt.month, dt.day,
                      dt.hour + dt.minute / 60.0)


def get_sidereal(jd, swe_id):
    res, _ = swe.calc_ut(jd, swe_id, swe.FLG_SWIEPH | swe.FLG_SIDEREAL)
    return res[0] % 360


def get_tropical(jd, swe_id):
    res, _ = swe.calc_ut(jd, swe_id, swe.FLG_SWIEPH)
    return res[0] % 360


def sign_idx(lon):
    return int(lon / 30) % 12


def deg_in_sign(lon):
    return lon % 30


def nak_idx(lon):
    return int((lon % 360) / (360 / 27)) % 27


def nak_pada(lon):
    nak_size = 360.0 / 27
    return int(((lon % 360) % nak_size) / (nak_size / 4)) + 1


def house_num(planet_lon, asc_lon):
    return int(((planet_lon - asc_lon) % 360) / 30) + 1


def is_retro(jd, swe_id):
    res, _ = swe.calc_ut(jd, swe_id, swe.FLG_SWIEPH | swe.FLG_SPEED)
    return res[3] < 0


def is_func_benefic(planet_name, asc_sign):
    asc_idx = SIGNS.index(asc_sign)
    for i, sign in enumerate(SIGNS):
        if planet_name in SIGN_LORDS[sign]:
            house = ((i - asc_idx) % 12) + 1
            if house in BENEFIC_HOUSES:
                return True
            if house in MALEFIC_HOUSES:
                return False
    return NATURAL_BENEFIC.get(planet_name, False)


def calc_ascendant(jd, lat, lon):
    cusps, ascmc = swe.houses_ex(jd, lat, lon, b'P',
                                 swe.FLG_SWIEPH | swe.FLG_SIDEREAL)
    return ascmc[0] % 360, ascmc[1] % 360, cusps


def calc_planets(jd):
    planets = []
    entries = [
        (swe.SUN, "Sun"), (swe.MOON, "Moon"), (swe.MARS, "Mars"),
        (swe.MERCURY, "Mercury"), (swe.JUPITER, "Jupiter"),
        (swe.VENUS, "Venus"), (swe.SATURN, "Saturn"),
        (swe.TRUE_NODE, "Rahu"),
    ]
    for swe_id, name in entries:
        lon = get_sidereal(jd, swe_id)
        ret = is_retro(jd, swe_id) if name != "Rahu" else False
        planets.append({
            "name": name,
            "sign": SIGNS[sign_idx(lon)],
            "degree": round(deg_in_sign(lon), 2),
            "nakshatra": NAKSHATRAS[nak_idx(lon)],
            "pada": nak_pada(lon),
            "is_retrograde": ret,
            "natural_benefic": NATURAL_BENEFIC[name],
        })
    # Ketu opposite Rahu
    rahu = [p for p in planets if p["name"] == "Rahu"][0]
    rl = SIGNS.index(rahu["sign"]) * 30 + rahu["degree"]
    kl = (rl + 180) % 360
    planets.append({
        "name": "Ketu",
        "sign": SIGNS[sign_idx(kl)],
        "degree": round(deg_in_sign(kl), 2),
        "nakshatra": NAKSHATRAS[nak_idx(kl)],
        "pada": nak_pada(kl),
        "is_retrograde": True,
        "natural_benefic": False,
    })
    return planets


def assign_houses(planets, asc_lon):
    for p in planets:
        pl = SIGNS.index(p["sign"]) * 30 + p["degree"]
        p["house"] = house_num(pl, asc_lon)
        asc_sign = SIGNS[sign_idx(asc_lon)]
        p["functional_benefic"] = is_func_benefic(p["name"], asc_sign)


def detect_yogas(planets, asc_sign):
    yogas = []
    by_name = {p["name"]: p for p in planets}

    if "Jupiter" in by_name and "Moon" in by_name:
        diff = ((by_name["Jupiter"]["house"] - by_name["Moon"]["house"]) % 12) + 1
        if diff in {1, 4, 7, 10}:
            yogas.append("Gaja Kesari")

    if "Mercury" in by_name and "Sun" in by_name:
        if by_name["Mercury"]["sign"] == by_name["Sun"]["sign"]:
            yogas.append("Buddha-Aditya")

    asc_idx = SIGNS.index(asc_sign)
    kendra = {(asc_idx + i) % 12 for i in (0, 3, 6, 9)}
    trikona = {(asc_idx + i) % 12 for i in (0, 4, 8)}

    kendra_lords = set()
    trikona_lords = set()
    for i, sign in enumerate(SIGNS):
        if i in kendra:
            kendra_lords.update(SIGN_LORDS[sign])
        if i in trikona:
            trikona_lords.update(SIGN_LORDS[sign])

    for p in planets:
        if p["name"] in kendra_lords and p["name"] in trikona_lords:
            yogas.append("Raja")
            break

    dusthana = {(asc_idx + 5) % 12, (asc_idx + 7) % 12, (asc_idx + 11) % 12}
    dusthana_lords = set()
    for i, sign in enumerate(SIGNS):
        if i in dusthana:
            dusthana_lords.update(SIGN_LORDS[sign])

    viparita_count = sum(1 for p in planets
                         if p["name"] in dusthana_lords and p["house"] in (6, 8, 12))
    if viparita_count >= 2:
        yogas.append("Viparita Raja")

    for p in planets:
        h = ((SIGNS.index(p["sign"]) - asc_idx) % 12) + 1
        if h in (2, 11) and p["house"] in {1, 4, 5, 7, 9, 10}:
            yogas.append("Dhana")
            break

    return yogas


def calc_dasha(moon_lon, birth_jd):
    nk = nak_idx(moon_lon)
    birth_lord_idx = nk % 9
    birth_lord = DASHA_ORDER[birth_lord_idx]

    nak_size = 360.0 / 27
    progress = (moon_lon % nak_size) / nak_size
    elapsed = DASHA_YEARS[birth_lord] * progress

    sequence = []
    cum = -elapsed
    for i in range(20):
        idx = (birth_lord_idx + i) % 9
        lord = DASHA_ORDER[idx]
        sequence.append({"lord": lord, "years": DASHA_YEARS[lord], "start": cum})
        cum += DASHA_YEARS[lord]

    now = datetime.now(timezone.utc)
    now_jd = swe.julday(now.year, now.month, now.day,
                        now.hour + now.minute / 60.0)
    yfb = (now_jd - birth_jd) / 365.25

    md_lord = birth_lord
    ad_lord = birth_lord
    md_start_yr = 0.0
    md_years = 0.0
    ad_start_yr = 0.0
    ad_years = 0.0

    for md in sequence:
        if md["start"] <= yfb < md["start"] + md["years"]:
            md_lord = md["lord"]
            md_start_yr = md["start"]
            md_years = md["years"]
            md_progress = yfb - md["start"]

            md_idx = DASHA_ORDER.index(md_lord)
            ad_cum = 0.0
            for j in range(9):
                ad_name = DASHA_ORDER[(md_idx + j) % 9]
                ay = (DASHA_YEARS[ad_name] / 120) * md_years
                if ad_cum + ay > md_progress:
                    ad_lord = ad_name
                    ad_start_yr = md_start_yr + ad_cum
                    ad_years = ay
                    break
                ad_cum += ay
            break

    def jd_from_offset(offs):
        return swe.jdut1_to_utc(birth_jd + offs * 365.25)

    def fmt_date(yr, mo, dy):
        return f"{yr:04d}-{mo:02d}-{dy:02d}"

    try:
        md_s = jd_from_offset(md_start_yr)
        md_e = jd_from_offset(md_start_yr + md_years)
        ad_s = jd_from_offset(ad_start_yr) if ad_start_yr else md_s
        ad_e = jd_from_offset(ad_start_yr + ad_years) if ad_start_yr and ad_years else md_e

        dasha = {
            "mahadasha_lord": md_lord,
            "mahadasha_start": fmt_date(*md_s[:3]),
            "mahadasha_end": fmt_date(*md_e[:3]),
            "antardasha_lord": ad_lord,
            "antardasha_start": fmt_date(*ad_s[:3]),
            "antardasha_end": fmt_date(*ad_e[:3]),
        }
    except Exception:
        # Fallback approximate dates
        dasha = {
            "mahadasha_lord": md_lord,
            "mahadasha_start": "Approximate — see birth year",
            "mahadasha_end": "Approximate",
            "antardasha_lord": ad_lord,
            "antardasha_start": "Approximate",
            "antardasha_end": "Approximate",
        }

    return dasha


def calc_transits(jd, planets, asc_lon):
    now = datetime.now(timezone.utc)
    now_jd = swe.julday(now.year, now.month, now.day,
                        now.hour + now.minute / 60.0)
    transits = []
    for swe_id, name in [(swe.SATURN, "Saturn"), (swe.JUPITER, "Jupiter")]:
        sid = get_sidereal(now_jd, swe_id)
        sig = SIGNS[sign_idx(sid)]
        natal = next((p for p in planets if p["name"] == name), None)
        transits.append({
            "planet": name,
            "transit_sign": sig,
            "transit_house": house_num(sid, asc_lon),
            "aspects_natal": (
                f"Transit {name} in {sig}. "
                f"Natal {name} in {natal['sign']} (H{natal['house']})"
                if natal else f"Transit {name} in {sig}"
            ),
        })
    return transits


def calculate_vedic(birth_date, birth_time, lat, lon, tz_offset):
    """
    Calculate full Vedic chart using Swiss Ephemeris.

    Args:
        birth_date: "YYYY-MM-DD"
        birth_time: "HH:MM" (24h local)
        lat: float (positive north)
        lon: float (positive east; negative for west)
        tz_offset: float (UTC offset, e.g. -8 for PST)
    """
    init_ephe()

    y, m, d = map(int, birth_date.split("-"))
    h, mi = map(int, birth_time.split(":"))

    utc_dt = to_utc(y, m, d, h, mi, tz_offset)
    jd = julday_ut(utc_dt)

    # Ascendant
    asc_lon, mc_lon, _ = calc_ascendant(jd, lat, lon)
    asc_sign = SIGNS[sign_idx(asc_lon)]

    # Planets
    planets = calc_planets(jd)
    assign_houses(planets, asc_lon)

    # Houses
    asc_idx = SIGNS.index(asc_sign)
    houses = [
        {"number": i + 1, "sign": SIGNS[(asc_idx + i) % 12],
         "lords": SIGN_LORDS[SIGNS[(asc_idx + i) % 12]]}
        for i in range(12)
    ]

    # Dasha
    moon_lon = SIGNS.index(planets[1]["sign"]) * 30 + planets[1]["degree"]
    dasha = calc_dasha(moon_lon, jd)

    # Yogas
    yogas = detect_yogas(planets, asc_sign)

    # Transits
    transits = calc_transits(jd, planets, asc_lon)

    return {
        "lagna": {
            "sign": asc_sign,
            "degree": round(deg_in_sign(asc_lon), 2),
            "nakshatra": NAKSHATRAS[nak_idx(asc_lon)],
            "pada": nak_pada(asc_lon),
        },
        "planets": planets,
        "houses": houses,
        "current_dasha": dasha,
        "yogas": yogas,
        "transits": transits,
        "divisional_charts": {
            "d9": {"notes": "D9 (Navamsha) — reveals relationship capacity and inner self."},
            "d10": {"notes": "D10 (Dashamsha) — reveals career and public standing."},
        },
    }
