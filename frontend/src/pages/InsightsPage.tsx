import { useState } from "react";
import type { InsightBucket } from "@shared/types";
import { useInsights } from "../lib/api";
import { useT, type TFn } from "../i18n";
import { eur } from "../lib/format";

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
  const t = useT();
  const { data, isLoading } = useInsights();

  if (isLoading || !data) return <div className="loading">{t("ins.loading")}</div>;

  const k = data.kpis;
  const mixTotal = data.channelMix.reduce((a, c) => a + c.revenue, 0) || 1;
  const channelColor: Record<string, string> = { airbnb: "var(--airbnb)", booking: "var(--booking)", vrbo: "var(--vrbo)" };

  return (
    <section className="page insights-page">
      <h1>{t("ins.title")}</h1>
      <p className="sub">{t("ins.sub")}</p>

      <div className="kpis five">
        <div className="card kpi">
          <span className="lbl">{t("ins.occ30")}</span>
          <span className="val num">{k.occupancyNext30}%</span>
          <span className="cmp">{t("ins.occ30Cmp")}</span>
        </div>
        <div className="card kpi">
          <span className="lbl">{t("ins.response")}</span>
          <span className="val num">{fmtResponse(k.medianResponseMin)}</span>
          <span className="cmp">{t("ins.responseCmp")}</span>
        </div>
        <div className="card kpi">
          <span className="lbl">{t("ins.stay")}</span>
          <span className="val num">{k.avgStayNights != null ? String(k.avgStayNights).replace(".", ",") : "—"}</span>
          <span className="cmp">{t("ins.stayCmp")}</span>
        </div>
        <div className="card kpi">
          <span className="lbl">{t("ins.lead")}</span>
          <span className="val num">{k.avgLeadDays != null ? `${k.avgLeadDays} d` : "—"}</span>
          <span className="cmp">{t("ins.leadCmp")}</span>
        </div>
        <div className="card kpi">
          <span className="lbl">{t("home.kpi.adr")}</span>
          <span className="val num">{k.adr != null ? eur(k.adr) : "—"}</span>
          <span className="cmp">{t("ins.adrCmp")}</span>
        </div>
      </div>

      <div className="insights-grid">
        <div className="card chart-card">
          <h3>{t("ins.occMonth")}</h3>
          <p className="hint">{t("ins.occMonthHint")}</p>
          <ColumnChart
            unit="%"
            highlight={data.occupancyByMonth.findIndex((m) => m.current)}
            ariaLabel={t("ins.ariaOccMonth")}
            data={data.occupancyByMonth.map((m) => ({
              label: m.label, value: m.pct,
              hint: `${m.label} ${m.month.slice(0, 4)}${m.current ? ` · ${t("ins.currentMonth")}` : ""}`,
            }))}
          />
        </div>

        <div className="card chart-card">
          <h3>{t("ins.responseTitle")}</h3>
          <p className="hint">{t("ins.responseHint", { v: fmtResponse(k.medianResponseMin) })}</p>
          <BucketChart buckets={data.responseBuckets} unitLabel={t("ins.answers")} ariaLabel={t("ins.ariaResponse")} />
        </div>

        <div className="card chart-card">
          <h3>{t("ins.occProp")}</h3>
          <p className="hint">{t("ins.occPropHint")}</p>
          <div className="meter-list">
            {data.occupancyByProperty.map((p) => (
              <div key={p.propertyId} className="meter-row" title={t("ins.occPropTitle", { name: p.name, pct: p.pct })}>
                <span className="meter-name">{p.name}</span>
                <span className="meter-track"><span className="meter-fill" style={{ width: `${p.pct}%` }} /></span>
                <span className="meter-val num">{p.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card chart-card">
          <h3>{t("ins.mix")}</h3>
          <p className="hint">{t("ins.mixHint")}</p>
          <div className="mix-bar" role="img" aria-label={t("ins.mixAria")}>
            {data.channelMix.map((c) => (
              <span key={c.channel} className="mix-seg" title={`${c.label}: ${eur(c.revenue)} · ${t("ins.bookingsCount", { n: c.bookings })}`}
                style={{ width: `${(c.revenue / mixTotal) * 100}%`, background: channelColor[c.channel] }} />
            ))}
          </div>
          <div className="mix-legend">
            {data.channelMix.map((c) => (
              <div key={c.channel} className="mix-item">
                <span className="dot" style={{ background: channelColor[c.channel] }} />
                <b>{c.label}</b>
                <span className="num">{Math.round((c.revenue / mixTotal) * 100)}%</span>
                <small>{t("ins.bookingsCount", { n: c.bookings })} · {eur(c.revenue)}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="card chart-card">
          <h3>{t("ins.stayTitle")}</h3>
          <p className="hint">{t("ins.stayHint")}</p>
          <BucketChart buckets={data.stayLengthBuckets} unitLabel={t("ins.bookings")} ariaLabel={t("ins.ariaStay")} />
        </div>

        <div className="card chart-card">
          <h3>{t("ins.leadTitle")}</h3>
          <p className="hint">{t("ins.leadHint")}</p>
          <BucketChart buckets={data.leadTimeBuckets} unitLabel={t("ins.bookings")} ariaLabel={t("ins.ariaLead")} />
        </div>
      </div>
    </section>
  );
}
