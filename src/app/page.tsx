"use client";

import { useState, FormEvent, useCallback } from "react";

interface ReadingResponse {
  reading?: Record<string, unknown>;
  chart_data?: Record<string, unknown>;
  location?: { displayName: string; lat: number; lon: number; tz_offset: number };
  error?: string;
}

type Model = "vedic" | "chinese" | "numerology" | "humandesign" | "synthesis";

const MODELS: { key: Model; label: string; icon: string; desc: string }[] = [
  { key: "vedic", label: "Vedic Astrology", icon: "☉", desc: "Sidereal planets, houses, dasha, yogas" },
  { key: "chinese", label: "Chinese Metaphysics", icon: "☰", desc: "Four Pillars, Day Master, Luck Cycles" },
  { key: "numerology", label: "Numerology", icon: "♯", desc: "Life Path, Expression, Pinnacle Cycles" },
  { key: "humandesign", label: "Human Design", icon: "△", desc: "Type, Authority, Gates, Channels" },
  { key: "synthesis", label: "Unified Synthesis", icon: "✦", desc: "Cross-system themes & guidance" },
];

export default function Home() {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [queryFocus, setQueryFocus] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReadingResponse | null>(null);
  const [error, setError] = useState("");
  const [activeModel, setActiveModel] = useState<Model>("synthesis");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    planets: true, houses: false, dasha: true, yogas: false,
    pillars: true, luck: true,
    core: true, pinnacles: false, timing: true,
    overview: true, gates: false,
  });

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!birthDate || !birthTime || !birthPlace) { setError("Date, time, and place are required."); return; }
    setError(""); setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, birthDate, birthTime, birthPlace, queryFocus }),
      });
      const data: ReadingResponse = await res.json();
      if (!res.ok) { setError(data.error || `Error ${res.status}`); return; }
      setResult(data);
      setActiveModel("synthesis");
    } catch { setError("Network error — please try again."); }
    finally { setLoading(false); }
  }, [name, birthDate, birthTime, birthPlace, queryFocus]);

  const reading = result?.reading as Record<string, Record<string, unknown>> | undefined;
  const sections = reading?.sections as Record<string, Record<string, unknown>> | undefined;
  const meta = reading?.meta as Record<string, unknown> | undefined;
  const cd = result?.chart_data as Record<string, unknown> | undefined;

  const toggle = (key: string) => setExpandedSections(s => ({ ...s, [key]: !s[key] }));

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold text-accent tracking-tight">Esoteric Oracle</h1>
        <p className="text-text-dim text-sm mt-1">Vedic · Chinese · Numerology · Human Design</p>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="surface p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase tracking-wider mb-1">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase tracking-wider mb-1">Date *</label>
            <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} required
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase tracking-wider mb-1">Time *</label>
            <input type="time" value={birthTime} onChange={e => setBirthTime(e.target.value)} required
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase tracking-wider mb-1">Place *</label>
            <input type="text" value={birthPlace} onChange={e => setBirthPlace(e.target.value)} placeholder="City, Country" required
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-text-dim uppercase tracking-wider mb-1">Question (optional)</label>
            <input type="text" value={queryFocus} onChange={e => setQueryFocus(e.target.value)}
              placeholder="e.g., Should I change careers?"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" />
          </div>
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 rounded-lg font-semibold text-sm transition-all bg-accent text-bg hover:bg-accent2 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
            {loading ? <span className="flex items-center gap-2"><span className="animate-spin">⟳</span>Computing...</span> : "Generate Reading"}
          </button>
        </div>

        {error && <p className="text-rose text-sm mt-2">{error}</p>}
        {result?.location && (
          <p className="text-xs text-text-dim mt-1">📍 {result.location.displayName} (UTC{result.location.tz_offset >= 0 ? '+' : ''}{result.location.tz_offset})</p>
        )}
      </form>

      {/* Results */}
      {sections && (
        <>
          {/* Model Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {MODELS.map(m => {
              const count = m.key === "synthesis"
                ? (sections.unified_synthesis ? 1 : 0)
                : sections[m.key] ? 1 : 0;
              return (
                <button key={m.key} onClick={() => setActiveModel(m.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    activeModel === m.key
                      ? "bg-accent text-bg shadow-lg shadow-accent/20"
                      : "surface2 text-text-dim hover:text-text hover:border-accent/30"
                  }`}>
                  <span className="text-sm">{m.icon}</span>
                  <div className="text-left">
                    <div>{m.label}</div>
                    {count > 0 && <div className="text-[10px] opacity-70">{m.desc}</div>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="surface overflow-hidden">
            <ContentArea
              activeModel={activeModel}
              sections={sections}
              cd={cd}
              meta={meta}
              expandedSections={expandedSections}
              toggle={toggle}
              reading={reading}
            />
          </div>
        </>
      )}
    </main>
  );
}

/* ─── Content Area ─── */
function ContentArea({ activeModel, sections, cd, meta, expandedSections, toggle, reading }: {
  activeModel: Model; sections: Record<string, Record<string, unknown>>;
  cd?: Record<string, unknown>; meta?: Record<string, unknown>;
  expandedSections: Record<string, boolean>; toggle: (k: string) => void;
  reading?: Record<string, Record<string, unknown>>;
}) {
  if (activeModel === "vedic") return <VedicView data={sections.vedic} cd={cd} expanded={expandedSections} toggle={toggle} />;
  if (activeModel === "chinese") return <ChineseView data={sections.chinese} cd={cd} expanded={expandedSections} toggle={toggle} />;
  if (activeModel === "numerology") return <NumerologyView data={sections.numerology} cd={cd} expanded={expandedSections} toggle={toggle} />;
  if (activeModel === "humandesign") return <HumanDesignView data={sections.human_design} cd={cd} expanded={expandedSections} toggle={toggle} />;
  if (activeModel === "synthesis") return <SynthesisView data={sections.unified_synthesis} meta={meta} />;
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   VEDIC VIEW
   ═══════════════════════════════════════════════════════════════ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VedicView({ data, cd, expanded, toggle }: { data: any; cd?: any; expanded: any; toggle: any }) {
  const vd = cd?.vedic;
  if (!vd) return <EmptySection />;
  const lagna = vd.lagna;
  const planets = vd.planets || [];
  const houses = vd.houses || [];
  const dasha = vd.current_dasha || {};
  const yogas = vd.yogas || [];
  const transits = vd.transits || [];
  const sun = planets.find((p: any) => p.name === "Sun");
  const moon = planets.find((p: any) => p.name === "Moon");

  return (
    <div className="divide-y divide-border">
      {/* Lagna Header */}
      <div className="p-5 bg-surface2/50">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-text-dim uppercase tracking-wider">Ascendant</span>
            <div className="text-2xl font-bold text-accent mt-1">{lagna.sign} {lagna.degree}°</div>
            <div className="text-sm text-text-dim mt-0.5">
              {lagna.nakshatra} · Pada {lagna.pada}
              {sun && moon && (
                <span className="ml-3 text-accent2">
                  🌙 {moon.nakshatra} · ☀ {sun.nakshatra}
                </span>
              )}
            </div>
          </div>
          <div className="text-right text-xs text-text-dim">
            <div>Dasha: <span className="text-gold font-semibold">{dasha.mahadasha_lord}</span></div>
            <div>Antar: <span className="text-accent">{dasha.antardasha_lord}</span></div>
          </div>
        </div>
      </div>

      {/* Planets */}
      <CollapsibleSection title={`Planets (${planets.length})`} expanded={expanded.planets} toggle={() => toggle("planets")}>
        <div className="space-y-1.5">
          {planets.map((p: any, i: number) => (
            <div key={i} className="surface2 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-text">{symbolFor(p.name)}</span>
                  <span className="font-semibold text-sm">{p.name}</span>
                  {p.is_retrograde && <span className="text-xs text-orange">℞</span>}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${p.natural_benefic ? 'text-green-400' : 'text-rose-400'} bg-opacity-20`}>
                    {p.natural_benefic ? 'B' : 'M'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-text">{p.sign}</span>
                  <span className="text-sm text-text-dim ml-1">{p.degree}°</span>
                  <span className="text-xs text-text-dimmer ml-2">H{p.house}</span>
                </div>
              </div>
              <div className="flex gap-4 mt-1 text-xs text-text-dim">
                <span>{p.nakshatra} pada {p.pada}</span>
                <span className={p.functional_benefic ? 'text-green-400' : 'text-rose-400'}>
                  {p.functional_benefic ? 'Functional Benefic' : 'Functional Malefic'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Houses */}
      <CollapsibleSection title={`Houses (${houses.length})`} expanded={expanded.houses} toggle={() => toggle("houses")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          {houses.map((h: any) => (
            <div key={h.number} className="surface3 px-3 py-2 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-accent">H{h.number}</span>
                <span className="text-xs text-text ml-2">{h.sign}</span>
              </div>
              <div className="text-xs text-text-dim">{h.lords?.join(", ") || "-"}</div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Dasha */}
      <CollapsibleSection title="Current Dasha" expanded={expanded.dasha} toggle={() => toggle("dasha")}>
        <div className="surface2 p-4">
          <div className="flex flex-wrap gap-6">
            <div>
              <div className="text-xs text-text-dim">Mahadasha</div>
              <div className="text-lg font-bold text-gold">{dasha.mahadasha_lord}</div>
              <div className="text-xs text-text-dim">{dasha.mahadasha_start} → {dasha.mahadasha_end}</div>
            </div>
            <div>
              <div className="text-xs text-text-dim">Antardasha</div>
              <div className="text-lg font-bold text-accent">{dasha.antardasha_lord}</div>
              <div className="text-xs text-text-dim">{dasha.antardasha_start} → {dasha.antardasha_end}</div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Yogas */}
      {yogas.length > 0 && (
        <CollapsibleSection title={`Yogas (${yogas.length})`} expanded={expanded.yogas} toggle={() => toggle("yogas")}>
          <div className="flex flex-wrap gap-2">
            {yogas.map((y: string) => (
              <span key={y} className="surface3 px-3 py-1.5 text-xs font-medium text-gold">{y}</span>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Transits */}
      <CollapsibleSection title="Current Transits" expanded={false} toggle={() => {}}>
        <div className="space-y-1.5">
          {transits.length > 0 ? transits.map((t: any, i: number) => (
            <div key={i} className="surface2 p-2 text-xs">
              <span className="font-medium text-text">{t.planet}</span>
              <span className="text-text-dim"> in {t.transit_sign} (H{t.transit_house})</span>
            </div>
          )) : <div className="text-xs text-text-dim">No transit data available</div>}
        </div>
      </CollapsibleSection>

      {/* Divisional Charts */}
      <div className="p-4">
        <h4 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">Divisional Charts</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="surface3 p-3">
            <span className="text-xs font-bold text-accent">D9 — Navamsha</span>
            <p className="text-xs text-text-dim mt-1">{vd.divisional_charts?.d9?.notes || "Not provided"}</p>
          </div>
          <div className="surface3 p-3">
            <span className="text-xs font-bold text-accent">D10 — Dashamsha</span>
            <p className="text-xs text-text-dim mt-1">{vd.divisional_charts?.d10?.notes || "Not provided"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CHINESE VIEW
   ═══════════════════════════════════════════════════════════════ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChineseView({ data, cd, expanded, toggle }: { data: any; cd?: any; expanded: any; toggle: any }) {
  const bd = cd?.chinese;
  if (!bd) return <EmptySection />;
  const p = bd.four_pillars;
  const dm = bd.day_master;
  const lp = bd.current_luck_pillar;

  const ELEM_COLORS: Record<string, string> = { Wood: "#4ade80", Fire: "#fb923c", Earth: "#d6d3d1", Metal: "#fbbf24", Water: "#38bdf8" };

  return (
    <div className="divide-y divide-border">
      {/* Day Master Header */}
      <div className="p-5 bg-surface2/50">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-dim uppercase tracking-wider">Day Master</span>
            <div className="text-2xl font-bold text-accent mt-1">{dm}</div>
          </div>
          <div className="flex gap-3">
            {bd.favorable_elements?.map((e: string) => (
              <span key={e} className="surface3 px-2.5 py-1 text-xs font-medium" style={{ color: ELEM_COLORS[e] || "#fff" }}>↑ {e}</span>
            ))}
            {bd.unfavorable_elements?.map((e: string) => (
              <span key={e} className="surface3 px-2.5 py-1 text-xs font-medium text-text-dim">↓ {e}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Four Pillars */}
      <CollapsibleSection title="Four Pillars" expanded={expanded.pillars} toggle={() => toggle("pillars")}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(["year", "month", "day", "hour"] as const).map(k => (
            <div key={k} className="surface2 p-3 text-center">
              <div className="text-xs text-text-dim uppercase">{k}</div>
              <div className="text-xl font-bold mt-1" style={{ color: ELEM_COLORS[p[k]?.element] || "#fff" }}>{p[k]?.stem}{p[k]?.branch}</div>
              <div className="text-xs text-text-dim mt-0.5">{p[k]?.element}</div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Luck Pillar */}
      <CollapsibleSection title="Current Luck Pillar" expanded={expanded.luck} toggle={() => toggle("luck")}>
        <div className="surface2 p-4">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-gold">{lp.pillar}</div>
            <div className="text-sm text-text-dim">{lp.age_range}</div>
            <div className="text-xs text-text-dim flex-1">{lp.element_relationship}</div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NUMEROLOGY VIEW
   ═══════════════════════════════════════════════════════════════ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NumerologyView({ data, cd, expanded, toggle }: { data: any; cd?: any; expanded: any; toggle: any }) {
  const nd = cd?.numerology;
  if (!nd) return <EmptySection />;

  const isMaster = (n: number) => n === 11 || n === 22 || n === 33;
  const fmt = (n: number) => isMaster(n) ? `${n} (Master)` : String(n);

  const coreNumbers = [
    { label: "Life Path", value: nd.life_path, desc: "Your life's core curriculum and purpose" },
    { label: "Expression", value: nd.expression, desc: "How you manifest your purpose" },
    { label: "Soul Urge", value: nd.soul_urge, desc: "Your deepest inner drive" },
    { label: "Personality", value: nd.personality, desc: "How others perceive you" },
    { label: "Birthday", value: nd.birthday, desc: "A hidden talent or gift" },
  ];

  return (
    <div className="divide-y divide-border">
      {/* Core Numbers */}
      <CollapsibleSection title="Core Numbers" expanded={expanded.core} toggle={() => toggle("core")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {coreNumbers.map((c: any) => (
            <div key={c.label} className={`surface2 p-3 ${isMaster(c.value) ? 'border-l-2 border-gold' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-dim">{c.label}</span>
                <span className={`text-lg font-bold ${isMaster(c.value) ? 'text-gold' : 'text-accent'}`}>{fmt(c.value)}</span>
              </div>
              <p className="text-xs text-text-dim mt-0.5">{c.desc}</p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Pinnacle Cycles */}
      <CollapsibleSection title="Pinnacle Cycles" expanded={expanded.pinnacles} toggle={() => toggle("pinnacles")}>
        <div className="space-y-1.5">
          {nd.pinnacle_cycles?.map((pc: any, i: number) => (
            <div key={i} className="surface2 p-3 flex items-center justify-between">
              <div>
                <span className="text-xs text-text-dim">{pc.age}</span>
                <span className={`text-sm font-bold ml-2 ${isMaster(pc.number) ? 'text-gold' : 'text-accent'}`}>{fmt(pc.number)}</span>
              </div>
              <span className="text-xs text-text-dim text-right max-w-[60%]">{pc.meaning || ""}</span>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Challenge Cycles */}
      <CollapsibleSection title="Challenge Cycles" expanded={false} toggle={() => {}}>
        <div className="space-y-1.5">
          {nd.challenge_cycles?.map((cc: any, i: number) => (
            <div key={i} className="surface2 p-2 flex items-center justify-between">
              <span className="text-xs text-text-dim">{cc.age}</span>
              <span className="text-sm font-medium text-rose">{fmt(cc.number)}</span>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Current Timing */}
      <CollapsibleSection title="Current Timing" expanded={expanded.timing} toggle={() => toggle("timing")}>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Personal Year", value: nd.personal_year },
            { label: "Personal Month", value: nd.personal_month },
            { label: "Personal Day", value: nd.personal_day },
          ].map((t: any) => (
            <div key={t.label} className="surface2 p-3 text-center min-w-[120px]">
              <div className="text-xs text-text-dim">{t.label}</div>
              <div className="text-xl font-bold text-accent mt-1">{t.value}</div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HUMAN DESIGN VIEW
   ═══════════════════════════════════════════════════════════════ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HumanDesignView({ data, cd, expanded, toggle }: { data: any; cd?: any; expanded: any; toggle: any }) {
  const hd = cd?.human_design;
  if (!hd) return <EmptySection />;

  return (
    <div className="divide-y divide-border">
      {/* Type & Authority Header */}
      <div className="p-5 bg-surface2/50">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-text-dim uppercase tracking-wider">Type</span>
            <div className="text-2xl font-bold text-accent mt-1">{hd.type}</div>
            <div className="text-sm text-text-dim mt-0.5">
              Authority: <span className="font-semibold text-accent2">{hd.authority}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-text-dim">Profile</div>
            <div className="text-lg font-bold text-gold">{hd.profile}</div>
            <div className="text-xs text-text-dim mt-1">{hd.definition}</div>
          </div>
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <span className="text-green-400">Signature: {hd.signature}</span>
          <span className="text-rose-400">Not-Self: {hd.not_self_theme}</span>
        </div>
      </div>

      {/* Incarnation Cross */}
      <div className="p-4">
        <div className="text-xs text-text-dim uppercase tracking-wider mb-1">Incarnation Cross</div>
        <div className="text-sm font-medium text-accent2">{hd.incarnation_cross}</div>
      </div>

      {/* Sun/Earth Gates */}
      <div className="p-4">
        <h4 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">Sun & Earth Gates</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { label: "Conscious Sun", gate: hd.conscious_sun_gate },
            { label: "Conscious Earth", gate: hd.conscious_earth_gate },
            { label: "Unconscious Sun", gate: hd.unconscious_sun_gate },
            { label: "Unconscious Earth", gate: hd.unconscious_earth_gate },
          ].map((g: any) => (
            <div key={g.label} className="surface3 px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-text-dim">{g.label}</span>
              <span className="text-xs font-bold text-accent">Gate {g.gate}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Gates */}
      <CollapsibleSection title={`Active Gates (${hd.active_gates?.length || 0})`} expanded={expanded.gates} toggle={() => toggle("gates")}>
        <div className="flex flex-wrap gap-1.5">
          {(hd.active_gates || []).map((g: number) => (
            <span key={g} className="surface3 px-2.5 py-1 text-xs font-medium text-text hover:text-accent cursor-default">
              {g}
            </span>
          ))}
        </div>
      </CollapsibleSection>

      {/* Channels */}
      {hd.active_channels?.length > 0 && (
        <div className="p-4">
          <h4 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">Active Channels</h4>
          <div className="space-y-1">
            {hd.active_channels.map((ch: string) => (
              <div key={ch} className="surface2 p-2 text-xs">
                <span className="font-bold text-cyan">{ch}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transit Gates */}
      {hd.transit_gates_activated?.length > 0 && (
        <div className="p-4">
          <h4 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">Transit Activations</h4>
          <div className="flex flex-wrap gap-1.5">
            {hd.transit_gates_activated.map((tg: number) => (
              <span key={tg} className="surface3 px-2 py-1 text-xs text-orange">Gate {tg}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SYNTHESIS VIEW
   ═══════════════════════════════════════════════════════════════ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SynthesisView({ data, meta }: { data: any; meta?: any }) {
  if (!data) return <EmptySection />;
  return (
    <div className="p-5 space-y-5">
      {data.query_answer && data.query_answer !== "No specific query provided for synthesis." && (
        <div className="surface2 p-4 border-l-2 border-accent">
          <h3 className="text-xs font-semibold text-accent2 uppercase tracking-wider mb-2">Your Question</h3>
          <p className="text-sm leading-relaxed">{data.query_answer}</p>
        </div>
      )}

      {data.cross_system_themes?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-3">Cross-System Themes</h3>
          <div className="space-y-2">
            {data.cross_system_themes.map((t: string, i: number) => (
              <div key={i} className="surface2 p-4 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: mdLink(t) }} />
            ))}
          </div>
        </div>
      )}

      {data.conflicts_and_reconciliation?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-3">Conflicts & Reconciliation</h3>
          <div className="space-y-2">
            {data.conflicts_and_reconciliation.map((c: string, i: number) => (
              <div key={i} className="surface2 p-4 text-sm leading-relaxed border-l-2 border-rose/30" dangerouslySetInnerHTML={{ __html: mdLink(c) }} />
            ))}
          </div>
        </div>
      )}

      {data.practical_guidance?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-accent2 uppercase tracking-wider mb-3">Practical Guidance</h3>
          <ul className="space-y-2">
            {data.practical_guidance.map((g: string, i: number) => (
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

/* ─── Shared Components ─── */
function CollapsibleSection({ title, expanded, toggle, children }: {
  title: string; expanded: boolean; toggle: () => void; children: React.ReactNode;
}) {
  return (
    <div>
      <button onClick={toggle} className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-text-dim uppercase tracking-wider hover:text-text transition-colors">
        <span>{title}</span>
        <span className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function EmptySection() {
  return <div className="p-8 text-center text-text-dim text-sm">No data available for this section. Fill in birth details and generate a reading.</div>;
}

function symbolFor(planet: string): string {
  const symbols: Record<string, string> = {
    Sun: "☉", Moon: "☽", Mars: "♂", Mercury: "☿", Jupiter: "♃",
    Venus: "♀", Saturn: "♄", Rahu: "☊", Ketu: "☋",
  };
  return symbols[planet] || "●";
}

function mdLink(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-accent2">$1</strong>');
}
