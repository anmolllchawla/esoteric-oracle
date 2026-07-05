"use client";

import { useState, FormEvent } from "react";

interface ReadingResponse {
  reading?: Record<string, unknown>;
  chart_data?: Record<string, unknown>;
  location?: { lat: number; lon: number; displayName: string };
  error?: string;
}

type Tab = "synthesis" | "vedic" | "chinese" | "numerology" | "humandesign" | "raw";

export default function Home() {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [queryFocus, setQueryFocus] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReadingResponse | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("synthesis");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!birthDate || !birthTime || !birthPlace) {
      setError("Date, time, and place are required.");
      return;
    }

    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, birthDate, birthTime, birthPlace, queryFocus }),
      });

      const data: ReadingResponse = await res.json();
      if (!res.ok) {
        setError(data.error || `Error ${res.status}`);
        return;
      }
      setResult(data);
      setActiveTab("synthesis");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reading = result?.reading as Record<string, Record<string, unknown>> | undefined;
  const sections = reading?.sections as Record<string, Record<string, unknown>> | undefined;
  const meta = reading?.meta as Record<string, unknown> | undefined;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-accent mb-2">Esoteric Oracle</h1>
        <p className="text-dim text-sm">Enter your birth details for a unified reading across Vedic, Chinese, Numerology & Human Design</p>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="surface p-6 mb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-dim uppercase tracking-wider mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg px-4 py-2.5 text-sm text-[#e0d8f0] focus:outline-none focus:border-[#a78bfa] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-dim uppercase tracking-wider mb-1">Phone (optional)</label>
            <input
              type="tel"
              placeholder="+1 234 567 8900"
              className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg px-4 py-2.5 text-sm text-[#e0d8f0] focus:outline-none focus:border-[#a78bfa] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-dim uppercase tracking-wider mb-1">Date of Birth *</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg px-4 py-2.5 text-sm text-[#e0d8f0] focus:outline-none focus:border-[#a78bfa] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-dim uppercase tracking-wider mb-1">Time of Birth *</label>
            <input
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              required
              className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg px-4 py-2.5 text-sm text-[#e0d8f0] focus:outline-none focus:border-[#a78bfa] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-dim uppercase tracking-wider mb-1">Place of Birth *</label>
          <input
            type="text"
            value={birthPlace}
            onChange={(e) => setBirthPlace(e.target.value)}
            placeholder="City, Country (e.g., Vancouver, Canada)"
            required
            className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg px-4 py-2.5 text-sm text-[#e0d8f0] focus:outline-none focus:border-[#a78bfa] transition-colors"
          />
          {result?.location && (
            <p className="text-xs text-dim mt-1">📍 {result.location.displayName} ({result.location.lat.toFixed(2)}, {result.location.lon.toFixed(2)})</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-dim uppercase tracking-wider mb-1">Question / Focus</label>
          <input
            type="text"
            value={queryFocus}
            onChange={(e) => setQueryFocus(e.target.value)}
            placeholder="e.g., Should I change careers this year?"
            className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg px-4 py-2.5 text-sm text-[#e0d8f0] focus:outline-none focus:border-[#a78bfa] transition-colors"
          />
        </div>

        {error && <p className="text-rose text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg font-medium text-sm transition-all bg-accent text-[#0a0a0f] hover:bg-accent2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> Computing chart & generating reading...
            </span>
          ) : (
            "Generate Reading"
          )}
        </button>
      </form>

      {/* Reading */}
      {sections && (
        <div className="surface overflow-hidden">
          <div className="px-6 py-3 border-b border-[#2a2a3a] flex items-center justify-between text-xs text-dim">
            <span>
              Confidence:{" "}
              <span className={meta?.confidence_score === "high" ? "text-green-400" : meta?.confidence_score === "medium" ? "text-gold" : "text-rose"}>
                {String(meta?.confidence_score || "?")}
              </span>
            </span>
            <span>{String(meta?.model_version || "")}</span>
          </div>

          <div className="flex border-b border-[#2a2a3a] overflow-x-auto">
            {(["synthesis", "vedic", "chinese", "numerology", "humandesign", "raw"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors ${activeTab === tab ? "text-accent border-b-2 border-accent" : "text-dim hover:text-text"}`}
              >
                {tab === "synthesis" ? "✦ Synthesis" : tab === "humandesign" ? "Human Design" : tab === "raw" ? "Raw JSON" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {activeTab === "raw" ? (
              <pre className="text-xs text-dim whitespace-pre-wrap font-mono">{JSON.stringify(reading, null, 2)}</pre>
            ) : activeTab === "synthesis" ? (
              <SynthesisView s={sections.unified_synthesis} />
            ) : (
              <SectionView s={sections[activeTab]} />
            )}
          </div>
        </div>
      )}
    </main>
  );
}

/* ── Section Views ── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SynthesisView({ s }: { s: any }) {
  if (!s) return <p className="text-dim text-sm">No synthesis available.</p>;

  return (
    <div className="space-y-6">
      {s.query_answer && s.query_answer !== "No specific query provided for synthesis." && (
        <div className="surface2 p-4 border-l-2 border-accent">
          <h3 className="text-xs font-semibold text-accent2 uppercase tracking-wider mb-2">Your Question</h3>
          <p className="text-sm leading-relaxed">{s.query_answer}</p>
        </div>
      )}

      {s.cross_system_themes && s.cross_system_themes.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">Cross-System Themes</h3>
          <div className="space-y-3">
            {s.cross_system_themes.map((t: string, i: number) => (
              <div key={i} className="surface2 p-4 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: mdToHtml(t) }} />
            ))}
          </div>
        </div>
      )}

      {s.conflicts_and_reconciliation && (
        <div>
          <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">Conflicts & Reconciliation</h3>
          <div className="space-y-3">
            {s.conflicts_and_reconciliation.map((c: string, i: number) => (
              <div key={i} className="surface2 p-4 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: mdToHtml(c) }} />
            ))}
          </div>
        </div>
      )}

      {s.practical_guidance && (
        <div>
          <h3 className="text-xs font-semibold text-accent2 uppercase tracking-wider mb-3">Practical Guidance</h3>
          <ul className="space-y-2">
            {s.practical_guidance.map((g: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-accent mt-1 shrink-0">◆</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectionView({ s }: { s: any }) {
  if (!s || typeof s.overview !== "string") {
    return <p className="text-dim text-sm">No data for this section.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="surface2 p-4 border-l-2 border-gold">
        <h3 className="text-xs font-semibold text-gold uppercase tracking-wider mb-2">Overview</h3>
        <p className="text-sm leading-relaxed">{s.overview}</p>
      </div>

      {s.summary && (
        <div className="surface2 p-4">
          <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">Summary</h3>
          <p className="text-sm leading-relaxed">{s.summary}</p>
        </div>
      )}

      {s.detailed && <NestedView data={s.detailed} />}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NestedView({ data, depth = 0 }: { data: any; depth?: number }) {
  if (!data || typeof data !== "object" || Object.keys(data).length === 0) return null;

  return (
    <div className="space-y-4">
      {Object.entries(data).map(([key, val]: [string, any]) => {
        if (key === "interpretation" || key === "note" || val === null) return null;
        if (typeof val === "string") return null;

        if (Array.isArray(val)) {
          if (val.length === 0) return null;
          return (
            <div key={key}>
              <h4 className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">{fmtKey(key)}</h4>
              <div className="space-y-2">
                {val.map((item: any, i: number) => (
                  <div key={i} className="surface2 p-3 text-sm">
                    {typeof item === "object" ? (
                      <div className="space-y-1">
                        {Object.entries(item).map(([ik, iv]: [string, any]) => {
                          if (typeof iv !== "string" && typeof iv !== "number" && typeof iv !== "boolean") return null;
                          return <div key={ik} className="flex gap-2"><span className="text-dim shrink-0">{fmtKey(ik)}:</span><span className="break-words">{String(iv)}</span></div>;
                        })}
                      </div>
                    ) : <span>{String(item)}</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (typeof val === "object") {
          return (
            <div key={key}>
              <h4 className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">{fmtKey(key)}</h4>
              <div className="surface2 p-4 space-y-2">
                {Object.entries(val).map(([ik, iv]: [string, any]) => {
                  if (typeof iv !== "string" && typeof iv !== "number" && typeof iv !== "boolean") return null;
                  return <div key={ik} className="text-sm"><span className="text-dim">{fmtKey(ik)}: </span><span>{String(iv)}</span></div>;
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

function fmtKey(k: string) { return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
function mdToHtml(md: string) { return md.replace(/\*\*(.*?)\*\*/g, '<strong class="text-accent2">$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>'); }
