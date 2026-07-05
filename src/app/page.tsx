"use client";

import { useState, useCallback } from "react";
import { generateReading, type OracleInput, type OracleOutput } from "./oracle";

const SAMPLE_CHART = `{
  "name": "Kai Morgan",
  "query_focus": "Should I move to another city this year?",
  "chart_data": {
    "vedic": {
      "lagna": {"sign": "Scorpio", "degree": 15.3, "nakshatra": "Anuradha", "pada": 3},
      "planets": [
        {"name": "Sun", "sign": "Leo", "degree": 8.2, "nakshatra": "Magha", "pada": 2, "house": 10, "is_retrograde": false, "natural_benefic": true, "functional_benefic": true},
        {"name": "Moon", "sign": "Taurus", "degree": 22.7, "nakshatra": "Rohini", "pada": 1, "house": 7, "is_retrograde": false, "natural_benefic": true, "functional_benefic": true},
        {"name": "Mars", "sign": "Scorpio", "degree": 3.5, "nakshatra": "Vishakha", "pada": 4, "house": 1, "is_retrograde": false, "natural_benefic": false, "functional_benefic": true},
        {"name": "Jupiter", "sign": "Pisces", "degree": 5.9, "nakshatra": "Uttara Bhadrapada", "pada": 1, "house": 5, "is_retrograde": true, "natural_benefic": true, "functional_benefic": true},
        {"name": "Saturn", "sign": "Capricorn", "degree": 25.0, "nakshatra": "Dhanishta", "pada": 1, "house": 3, "is_retrograde": false, "natural_benefic": false, "functional_benefic": true}
      ],
      "houses": [
        {"number": 1, "sign": "Scorpio", "lords": ["Mars"]},
        {"number": 10, "sign": "Leo", "lords": ["Sun"]},
        {"number": 7, "sign": "Taurus", "lords": ["Venus"]}
      ],
      "current_dasha": {
        "mahadasha_lord": "Jupiter", "mahadasha_start": "2023-04-15", "mahadasha_end": "2039-04-15",
        "antardasha_lord": "Venus", "antardasha_start": "2025-08-01", "antardasha_end": "2028-01-15"
      },
      "yogas": ["Gaja Kesari", "Raja", "Viparita Raja"],
      "transits": [{"planet": "Saturn", "transit_sign": "Aquarius", "transit_house": 4, "aspects_natal": "Trine natal Moon in Taurus"}],
      "divisional_charts": {"d9": {"notes": "Venus exalted in D9 — strong relationship signature."}}
    },
    "chinese": {
      "four_pillars": {
        "year": {"stem": "丙", "branch": "寅", "element": "Fire"},
        "month": {"stem": "壬", "branch": "子", "element": "Water"},
        "day": {"stem": "甲", "branch": "午", "element": "Wood"},
        "hour": {"stem": "庚", "branch": "辰", "element": "Metal"}
      },
      "day_master": "甲",
      "favorable_elements": ["Water", "Wood"],
      "unfavorable_elements": ["Metal", "Earth"],
      "current_luck_pillar": {"pillar": "辛酉", "age_range": "32-41", "element_relationship": "Metal (unfavorable) — a contracting period"}
    },
    "numerology": {
      "life_path": 11, "expression": 7, "soul_urge": 3, "personality": 4, "birthday": 15,
      "pinnacle_cycles": [{"age": "0-28", "number": 9}, {"age": "28-37", "number": 11}],
      "challenge_cycles": [{"age": "0-28", "number": 2}],
      "personal_year": 1, "personal_month": 7, "personal_day": 5
    },
    "human_design": {
      "type": "Manifesting Generator", "authority": "Emotional", "profile": "3/5",
      "definition": "Split", "incarnation_cross": "Right Angle Cross of the Sphinx (1/2 | 7/13)",
      "conscious_sun_gate": 1, "conscious_earth_gate": 2,
      "unconscious_sun_gate": 7, "unconscious_earth_gate": 13,
      "active_gates": [1, 2, 7, 13, 15, 20, 34, 35, 36, 41, 57],
      "active_channels": ["20-34", "35-36"],
      "not_self_theme": "Frustration", "signature": "Satisfaction",
      "transit_gates_activated": [41, 30, 55]
    }
  }
}`;

type Tab = "synthesis" | "vedic" | "chinese" | "numerology" | "humandesign";

export default function Home() {
  const [input, setInput] = useState("");
  const [reading, setReading] = useState<OracleOutput | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("synthesis");

  const handleGenerate = useCallback(() => {
    setError("");
    setLoading(true);
    try {
      const data = JSON.parse(input) as OracleInput;
      if (!data.chart_data) throw new Error("Missing chart_data in input JSON");
      const result = generateReading(data);
      setReading(result);
      setActiveTab("synthesis");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
      setReading(null);
    } finally {
      setLoading(false);
    }
  }, [input]);

  const loadSample = () => {
    setInput(SAMPLE_CHART);
    setError("");
    setReading(null);
  };

  const queryFocus = (() => { try { return (JSON.parse(input) as OracleInput).query_focus || ""; } catch { return ""; } })();

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-accent mb-2">Esoteric Oracle</h1>
        <p className="text-dim text-sm">Vedic · Chinese · Numerology · Human Design — Unified</p>
      </header>

      <div className="surface p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-accent2">Chart Data (JSON)</label>
          <button onClick={loadSample} className="text-xs text-dim hover:text-accent transition-colors">Load sample chart</button>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your chart_data JSON here..."
          className="w-full h-48 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg p-4 text-sm font-mono text-[#e0d8f0] resize-y focus:outline-none focus:border-[#a78bfa] transition-colors"
          spellCheck={false}
        />
        {error && <p className="text-rose text-sm mt-2">{error}</p>}
        <button
          onClick={handleGenerate}
          disabled={loading || !input.trim()}
          className="mt-4 w-full py-3 rounded-lg font-medium text-sm transition-all bg-accent text-[#0a0a0f] hover:bg-accent2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : "Generate Reading"}
        </button>
      </div>

      {reading && (
        <div className="surface overflow-hidden">
          <div className="px-6 py-3 border-b border-[#2a2a3a] flex items-center justify-between text-xs text-dim">
            <span>Confidence: <span className={reading.meta.confidence_score === "high" ? "text-green-400" : reading.meta.confidence_score === "medium" ? "text-gold" : "text-rose"}>{reading.meta.confidence_score}</span></span>
            <span>{reading.meta.model_version}</span>
          </div>

          <div className="flex border-b border-[#2a2a3a] overflow-x-auto">
            {(["synthesis", "vedic", "chinese", "numerology", "humandesign"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab ? "text-accent border-b-2 border-accent" : "text-dim hover:text-text"}`}
              >
                {tab === "synthesis" ? "✦ Synthesis" : tab === "humandesign" ? "Human Design" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {activeTab === "synthesis" && <SynthesisView s={reading.sections.unified_synthesis} queryFocus={queryFocus} />}
            {activeTab === "vedic" && <GenericSection data={reading.sections.vedic} />}
            {activeTab === "chinese" && <GenericSection data={reading.sections.chinese} />}
            {activeTab === "numerology" && <GenericSection data={reading.sections.numerology} />}
            {activeTab === "humandesign" && <GenericSection data={reading.sections.human_design} />}
          </div>
        </div>
      )}
    </main>
  );
}

/* ── Synthesis View ── */
function SynthesisView({ s, queryFocus }: { s: OracleOutput["sections"]["unified_synthesis"]; queryFocus: string }) {
  return (
    <div className="space-y-6">
      {queryFocus && (
        <div className="surface2 p-4 border-l-2 border-accent">
          <h3 className="text-xs font-semibold text-accent2 uppercase tracking-wider mb-2">Your Question</h3>
          <p className="text-sm leading-relaxed">{s.query_answer}</p>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">Cross-System Themes</h3>
        <div className="space-y-3">
          {s.cross_system_themes.map((t, i) => (
            <div key={i} className="surface2 p-4 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: mdToHtml(t) }} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">Conflicts & Reconciliation</h3>
        <div className="space-y-3">
          {s.conflicts_and_reconciliation.map((c, i) => (
            <div key={i} className="surface2 p-4 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: mdToHtml(c) }} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-accent2 uppercase tracking-wider mb-3">Practical Guidance</h3>
        <ul className="space-y-2">
          {s.practical_guidance.map((g, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-accent mt-1 shrink-0">◆</span>
              <span>{g}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── Generic Section ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GenericSection({ data }: { data: any }) {
  if (!data || typeof data.overview !== "string") {
    return <p className="text-dim text-sm">No data available for this section.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="surface2 p-4 border-l-2 border-gold">
        <h3 className="text-xs font-semibold text-gold uppercase tracking-wider mb-2">Overview</h3>
        <p className="text-sm leading-relaxed">{data.overview}</p>
      </div>

      {data.summary && (
        <div className="surface2 p-4">
          <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">Summary</h3>
          <p className="text-sm leading-relaxed">{data.summary}</p>
        </div>
      )}

      <DetailTree data={data.detailed} />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DetailTree({ data }: { data: any }) {
  if (!data || Object.keys(data).length === 0) return null;

  return (
    <div className="space-y-4">
      {Object.entries(data).map(([key, val]) => {
        const v = val as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (key === "interpretation" || key === "note" || v === null || v === undefined) return null;

        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return null;

        if (Array.isArray(v)) {
          if (v.length === 0) return null;
          return (
            <div key={key}>
              <h4 className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">{fmtKey(key)}</h4>
              <div className="space-y-2">
                {v.map((item: unknown, i: number) => {
                  if (typeof item === "object" && item !== null) {
                    return (
                      <div key={i} className="surface2 p-3 text-sm">
                        <div className="space-y-1">
                          {Object.entries(item as Record<string, unknown>).map(([ik, iv]) => {
                            if (typeof iv !== "string" && typeof iv !== "number" && typeof iv !== "boolean") return null;
                            return (
                              <div key={ik} className="flex gap-2">
                                <span className="text-dim shrink-0">{fmtKey(ik)}:</span>
                                <span className="break-words">{String(iv)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return <div key={i} className="surface2 p-3 text-sm">{String(item)}</div>;
                })}
              </div>
            </div>
          );
        }

        if (typeof v === "object") {
          const hasContent = Object.keys(v).some((k) => k !== "interpretation");
          if (!hasContent) return null;
          return (
            <div key={key}>
              <h4 className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">{fmtKey(key)}</h4>
              <div className="surface2 p-4 space-y-2">
                {Object.entries(v as Record<string, unknown>).map(([ik, iv]) => {
                  if (typeof iv !== "string" && typeof iv !== "number" && typeof iv !== "boolean") return null;
                  return (
                    <div key={ik} className="text-sm">
                      <span className="text-dim">{fmtKey(ik)}: </span>
                      <span className="break-words">{String(iv)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

function fmtKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function mdToHtml(md: string): string {
  return md.replace(/\*\*(.*?)\*\*/g, '<strong class="text-accent2">$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
}
