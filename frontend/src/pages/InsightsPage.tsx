import { useState } from "react";
import { Navigate } from "react-router-dom";
import type { InsightBucket } from "@shared/types";
import { useInsights } from "../lib/api";
import { eur } from "../lib/format";
import { useAuth } from "../auth";

const CORAL = "var(--coral)";

interface Tip { x: number; y: number; label: string; value: string }

/**
 * Kolomgrafiek in huisstijl: dunne kolommen (max 24px) met een afgeronde
 * datakant en vlakke basis, haarlijn-gridlijnen en waarden op de kap.
 */
function ColumnChart({ data, unit, highlight, ariaLabel }: {
  data: { label: string; value: number; hint?: string }[];
  unit: string;
  highlight?: number; // index die het label "nu" krijgt
  ariaLabel: string;
}) {
  const [tip, setTip] = useState<Tip | null>(null);
  const W = 560, H = 180, PAD_TOP = 26, LBL = 22;
  const max = Math.max(1, ...data.map((d) => d.value)) * 1.06;
  const bw = W / data.length;
  const colw = Math.min(24, Math.max(10, bw - 14));

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H + LBL}`} style={{ width: "100%", height: "auto" }} role="img" aria-label={ariaLabel}>
        {[0.5, 1].map((f) => {
          const y = H - f * (H - PAD_TOP);
          return <line key={f} x1={0} x2={W} y1={y} y2={y} stroke="#EFEDE9" strokeWidth={1} />;
        })}
        {data.map((d, i) => {
          const h = (d.value / max) * (H - PAD_TOP);
          const x = i * bw + (bw - colw) / 2;
          const y = H - h;
          return (
            <g key={d.label}
              onMouseEnter={(e) => {
                const r = (e.currentTarget as SVGGElement).getBoundingClientRect();
                setTip({ x: r.left + r.width / 2, y: r.top, label: d.hint ?? d.label, value: `${d.value}${unit}` });
              }}
              onMouseLeave={() => setTip(null)}
            >
              {/* onzichtbaar maar ruim hover-doelwit over de hele kolomband */}
              <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
              {h > 0 && <rect x={x} y={y} width={colw} height={h} rx={4} fill={CORAL} />}
              {/* vlakke basis: rond alleen de datakant af */}
              {h > 4 && <rect x={x} y={H - 4} width={colw} height={4} fill={CORAL} />}
              <text x={x + colw / 2} y={y - 6} fontSize={10.5} fontWeight={700} fill="#71706C" textAnchor="middle" fontFamily="inherit">
                {d.value}{unit === "%" ? "" : ""}
              </text>
              <text x={x + colw / 2} y={H + 15} fontSize={10.5} fill={i === highlight ? "var(--coral-deep)" : "#9C9A94"}
                fontWeight={i === highlight ? 700 : 400} textAnchor="middle" fontFamily="inherit">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {tip && (
        <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
          <small>{tip.label}</small>{tip.value}
        </div>
      )}
    </div>
  );
}

function BucketChart({ buckets, unitLabel, ariaLabel }: { buckets: InsightBucket[]; unitLabel: string; ariaLabel: string }) {
  return (
    <ColumnChart
      data={buckets.map((b) => ({ label: b.label, value: b.count, hint: `${b.label} · ${unitLabel}` }))}
      unit=""
      ariaLabel={ariaLabel}
    />
  );
}

function fmtResponse(min: number | null): string {
  if (min == null) return "—";
  if (min < 60) return `${min} min`;
  return `${(min / 60).toFixed(1).replace(".", ",")} u`;
}

export function InsightsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useInsights();

  if (user?.role !== "admin") return <Navigate to="/" replace />;
  if (isLoading || !data) return <div className="loading">Insights laden…</div>;

  const k = data.kpis;
  const mixTotal = data.channelMix.reduce((a, c) => a + c.revenue, 0) || 1;
  const channelColor: Record<string, string> = { airbnb: "var(--coral)", booking: "var(--booking)", vrbo: "var(--vrbo)" };

  return (
    <section className="page insights-page">
      <h1>Insights</h1>
      <p className="sub">Hoe presteert de portefeuille — berekend uit de echte boekingen en gesprekken.</p>

      <div className="kpis five">
        <div className="card kpi">
          <span className="lbl">Bezetting komende 30 dagen</span>
          <span className="val num">{k.occupancyNext30}%</span>
          <span className="cmp">Over alle live panden</span>
        </div>
        <div className="card kpi">
          <span className="lbl">Mediane reactietijd</span>
          <span className="val num">{fmtResponse(k.medianResponseMin)}</span>
          <span className="cmp">Gastbericht → eerste antwoord</span>
        </div>
        <div className="card kpi">
          <span className="lbl">Gem. verblijfsduur</span>
          <span className="val num">{k.avgStayNights != null ? String(k.avgStayNights).replace(".", ",") : "—"}</span>
          <span className="cmp">Nachten per boeking</span>
        </div>
        <div className="card kpi">
          <span className="lbl">Boekingsvenster</span>
          <span className="val num">{k.avgLeadDays != null ? `${k.avgLeadDays} d` : "—"}</span>
          <span className="cmp">Gem. van boeking tot check-in</span>
        </div>
        <div className="card kpi">
          <span className="lbl">Gem. nachtprijs</span>
          <span className="val num">{k.adr != null ? eur(k.adr) : "—"}</span>
          <span className="cmp">Uitbetaling per geboekte nacht</span>
        </div>
      </div>

      <div className="insights-grid">
        <div className="card chart-card">
          <h3>Bezettingsgraad per maand</h3>
          <p className="hint">Drie maanden terug en acht vooruit — zo zie je hoe goed de komende periode al gevuld is</p>
          <ColumnChart
            unit="%"
            highlight={data.occupancyByMonth.findIndex((m) => m.current)}
            ariaLabel="Bezettingsgraad per maand"
            data={data.occupancyByMonth.map((m) => ({
              label: m.label, value: m.pct,
              hint: `${m.label} ${m.month.slice(0, 4)}${m.current ? " · huidige maand" : ""}`,
            }))}
          />
        </div>

        <div className="card chart-card">
          <h3>Reactietijd op gastberichten</h3>
          <p className="hint">Hoe snel volgt het eerste antwoord — mediaan {fmtResponse(k.medianResponseMin)}</p>
          <BucketChart buckets={data.responseBuckets} unitLabel="antwoorden" ariaLabel="Verdeling van reactietijden" />
        </div>

        <div className="card chart-card">
          <h3>Bezetting per pand</h3>
          <p className="hint">Komende 90 dagen — waar is nog ruimte?</p>
          <div className="meter-list">
            {data.occupancyByProperty.map((p) => (
              <div key={p.propertyId} className="meter-row" title={`${p.name}: ${p.pct}% bezet in de komende 90 dagen`}>
                <span className="meter-name">{p.name}</span>
                <span className="meter-track"><span className="meter-fill" style={{ width: `${p.pct}%` }} /></span>
                <span className="meter-val num">{p.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card chart-card">
          <h3>Kanaalmix</h3>
          <p className="hint">Aandeel in de omzet per kanaal, over alle boekingen</p>
          <div className="mix-bar" role="img" aria-label="Omzetaandeel per kanaal">
            {data.channelMix.map((c) => (
              <span key={c.channel} className="mix-seg" title={`${c.label}: ${eur(c.revenue)} · ${c.bookings} boekingen`}
                style={{ width: `${(c.revenue / mixTotal) * 100}%`, background: channelColor[c.channel] }} />
            ))}
          </div>
          <div className="mix-legend">
            {data.channelMix.map((c) => (
              <div key={c.channel} className="mix-item">
                <span className="dot" style={{ background: channelColor[c.channel] }} />
                <b>{c.label}</b>
                <span className="num">{Math.round((c.revenue / mixTotal) * 100)}%</span>
                <small>{c.bookings} boekingen · {eur(c.revenue)}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="card chart-card">
          <h3>Verblijfsduur</h3>
          <p className="hint">Aantal boekingen per verblijfslengte (nachten)</p>
          <BucketChart buckets={data.stayLengthBuckets} unitLabel="boekingen" ariaLabel="Verdeling van verblijfsduur" />
        </div>

        <div className="card chart-card">
          <h3>Boekingsvenster</h3>
          <p className="hint">Hoe ver op voorhand boeken gasten?</p>
          <BucketChart buckets={data.leadTimeBuckets} unitLabel="boekingen" ariaLabel="Verdeling van boekingsvenster" />
        </div>
      </div>
    </section>
  );
}
