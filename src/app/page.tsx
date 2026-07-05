"use client";

import { useState, FormEvent } from "react";

interface ReadingResponse {
  reading?: Record<string, unknown>;
  chart_data?: Record<string, unknown>;
  location?: { lat: number; lon: number; displayName: string };
  error?: string;
}

type Tab = "synthesis" | "vedic" | "chinese" | "numerology" | "humandesign" | "chart" | "raw";

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
      if (!res.ok) { setError(data.error || `Error ${res.status}`); return; }
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
        <p className="text-text-dim text-sm">
          Enter your birth details for a unified reading across Vedic, Chinese, Numerology & Human Design
        </p>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="surface p-6 mb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase tracking-wider mb-1">Name</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase tracking-wider mb-1">Date of Birth *</label>
            <input
              type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required
              className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase tracking-wider mb-1">Time of Birth *</label>
            <input
              type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} required
              className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase tracking-wider mb-1">Place of Birth *</label>
            <input
              type="text" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)}
              placeholder="City, Country"
              required
              className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors"
            />
            {result?.location && (
              <p className="text-xs text-text-dim mt-1">
                📍 {result.location.displayName} ({result.location.lat.toFixed(2)}, {result.location.lon.toFixed(2)})
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-dim uppercase tracking-wider mb-1">Question / Focus</label>
          <input
            type="text" value={queryFocus} onChange={(e) => setQueryFocus(e.target.value)}
            placeholder="e.g., Should I change careers this year?"
            className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {error && <p className="text-rose text-sm">{error}</p>}

        <button
          type="submit" disabled={loading}
          className="w-full py-3 rounded-lg font-semibold text-sm transition-all bg-accent text-bg hover:bg-accent2 disabled:opacity-40 disabled:cursor-not-allowed border-0"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin inline-block">⟳</span>
              Computing & generating reading...
            </span>
          ) : (
            "Generate Reading"
          )}
        </button>
      </form>

      {/* Reading output */}
      {sections && (
        <div className="surface overflow-hidden">
          {/* Meta bar */}
          <div className="px-6 py-3 border-b border-border flex items-center justify-between text-xs text-text-dim">
            <span>
              Confidence:{" "}
              <span className={
                meta?.confidence_score === "high" ? "text-green-400"
                : meta?.confidence_score === "medium" ? "text-gold" : "text-rose"
              }>
                {String(meta?.confidence_score || "?")}
              </span>
            </span>
            <span>{String(meta?.model_version || "")}</span>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border overflow-x-auto">
            {(["synthesis", "vedic", "chinese", "numerology", "humandesign", "chart", "raw"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "text-accent border-b-2 border-accent"
                    : "text-text-dim hover:text-text"
                }`}
              >
                {tab === "synthesis" ? "✦ Synthesis"
                 : tab === "humandesign" ? "Human Design"
                 : tab === "chart" ? "📊 Chart Data"
                 : tab === "raw" ? "Raw JSON"
                 : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-6 max-h-[75vh] overflow-y-auto">
            {activeTab === "raw" && (
              <pre className="text-xs text-text-dim whitespace-pre-wrap font-mono">{JSON.stringify(reading, null, 2)}</pre>
            )}
            {activeTab === "chart" && result?.chart_data && (
              <ChartDataView data={result.chart_data} location={result.location} />
            )}
            {activeTab === "synthesis" && <SynthesisView s={sections.unified_synthesis} />}
            {activeTab !== "raw" && activeTab !== "chart" && <SectionView s={sections[activeTab]} />}
          </div>
        </div>
      )}
    </main>
  );
}

/* ── Chart Data View: shows raw computed chart data for verification ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartDataView({ data, location }: { data: any; location?: { displayName: string; lat: number; lon: number } }) {
  if (!data) return <p className="text-text-dim text-sm">No chart data available.</p>;

  const sections: { key: string; title: string }[] = [
    { key: "vedic", title: "Vedic Astrology — Planetary Positions" },
    { key: "chinese", title: "Chinese Metaphysics — Four Pillars & Luck" },
    { key: "numerology", title: "Pythagorean Numerology — Numbers" },
    { key: "human_design", title: "Human Design — Type, Gates & Channels" },
  ];

  return (
    <div className="space-y-6">
      {location && (
        <div className="surface2 p-3 text-xs text-text-dim">
          Location: {location.displayName} ({location.lat}, {location.lon})
        </div>
      )}

      {sections.map(({ key, title }) => {
        const section = data[key];
        if (!section) return null;
        return (
          <details key={key} className="surface2" open>
            <summary className="text-sm font-semibold text-accent cursor-pointer px-4 py-3 hover:text-accent2 transition-colors select-none">
              {title}
            </summary>
            <div className="px-4 pb-4 text-xs font-mono text-text space-y-1">
              <DataTree data={section} depth={0} />
            </div>
          </details>
        );
      })}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DataTree({ data, depth }: { data: any; depth: number }) {
  if (data === null || data === undefined) return null;
  if (typeof data === "string") return <span className="text-text-dim">&quot;{data}&quot;</span>;
  if (typeof data === "number" || typeof data === "boolean") return <span className="text-gold">{String(data)}</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-text-dim">[]</span>;
    return (
      <div className={depth > 0 ? "ml-4 border-l border-border pl-3" : ""}>
        {data.map((item, i) => (
          <div key={i} className="py-0.5">
            {typeof item === "object" ? (
              <DataTree data={item} depth={depth + 1} />
            ) : (
              <span className="text-text-dim">{String(item)}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === "object") {
    return (
      <div className={depth > 0 ? "ml-4 border-l border-border pl-3" : ""}>
        {Object.entries(data).map(([k, v]) => {
          if (k === "detailed" || k === "notes") return null;
          if (typeof v === "object" && v !== null) {
            const isSimple = !Array.isArray(v) && typeof v === "object" && Object.values(v as Record<string, unknown>).every((x) => typeof x !== "object" || x === null);
            if (isSimple) {
              return (
                <div key={k} className="py-0.5 flex gap-2">
                  <span className="text-text-dim">{k}:</span>
                  <span>{JSON.stringify(v)}</span>
                </div>
              );
            }
            return (
              <details key={k} className="py-0.5">
                <summary className="text-text-dim cursor-pointer hover:text-accent">{k} ({Array.isArray(v) ? `[${v.length}]` : `{...}`})</summary>
                <DataTree data={v} depth={depth + 1} />
              </details>
            );
          }
          return (
            <div key={k} className="py-0.5 flex gap-2">
              <span className="text-text-dim">{k}:</span>
              <DataTree data={v} depth={depth + 1} />
            </div>
          );
        })}
      </div>
    );
  }

  return <span>{String(data)}</span>;
}

/* ── Views ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SynthesisView({ s }: { s: any }) {
  if (!s) return <p className="text-text-dim text-sm">No synthesis available.</p>;
  return (
    <div className="space-y-6">
      {s.query_answer && s.query_answer !== "No specific query provided for synthesis." && (
        <div className="surface2 p-4 border-l-2 border-accent">
          <h3 className="text-xs font-semibold text-accent2 uppercase tracking-wider mb-2">Your Question</h3>
          <p className="text-sm leading-relaxed">{s.query_answer}</p>
        </div>
      )}
      {s.cross_system_themes?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-3">Cross-System Themes</h3>
          <div className="space-y-3">
            {s.cross_system_themes.map((t: string, i: number) => (
              <div key={i} className="surface2 p-4 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: mdToHtml(t) }} />
            ))}
          </div>
        </div>
      )}
      {s.conflicts_and_reconciliation?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-3">Conflicts & Reconciliation</h3>
          <div className="space-y-3">
            {s.conflicts_and_reconciliation.map((c: string, i: number) => (
              <div key={i} className="surface2 p-4 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: mdToHtml(c) }} />
            ))}
          </div>
        </div>
      )}
      {s.practical_guidance?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-accent2 uppercase tracking-wider mb-3">Practical Guidance</h3>
          <ul className="space-y-2">
            {s.practical_guidance.map((g: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm"><span className="text-accent mt-1 shrink-0">◆</span><span>{g}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectionView({ s }: { s: any }) {
  if (!s || typeof s.overview !== "string") return <p className="text-text-dim text-sm">No data for this section.</p>;
  return (
    <div className="space-y-6">
      <div className="surface2 p-4 border-l-2 border-gold">
        <h3 className="text-xs font-semibold text-gold uppercase tracking-wider mb-2">Overview</h3>
        <p className="text-sm leading-relaxed">{s.overview}</p>
      </div>
      {s.summary && (
        <div className="surface2 p-4"><h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">Summary</h3><p className="text-sm leading-relaxed">{s.summary}</p></div>
      )}
      {s.detailed && <NestedView data={s.detailed} />}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NestedView({ data }: { data: any }) {
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
              <h4 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">{fmtKey(key)}</h4>
              <div className="space-y-2">
                {val.map((item: any, i: number) => (
                  <div key={i} className="surface2 p-3 text-sm">
                    {typeof item === "object" ? (
                      <div className="space-y-1">
                        {Object.entries(item).map(([ik, iv]: [string, any]) => {
                          if (typeof iv !== "string" && typeof iv !== "number" && typeof iv !== "boolean") return null;
                          return <div key={ik} className="flex gap-2"><span className="text-text-dim shrink-0">{fmtKey(ik)}:</span><span className="break-words">{String(iv)}</span></div>;
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
              <h4 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">{fmtKey(key)}</h4>
              <div className="surface2 p-4 space-y-2">
                {Object.entries(val).map(([ik, iv]: [string, any]) => {
                  if (typeof iv !== "string" && typeof iv !== "number" && typeof iv !== "boolean") return null;
                  return <div key={ik} className="text-sm"><span className="text-text-dim">{fmtKey(ik)}: </span><span>{String(iv)}</span></div>;
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
