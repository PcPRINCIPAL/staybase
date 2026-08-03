import { useState } from "react";
import type { RevenueMonth } from "@shared/types";
import { useRevenue } from "../lib/api";
import { eur } from "../lib/format";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";

const SERIES = [
  { key: "airbnb", name: "Airbnb", color: "var(--coral)" },
  { key: "booking", name: "Booking.com", color: "var(--booking)" },
  { key: "vrbo", name: "VRBO", color: "var(--vrbo)" },
] as const;

function RevenueChart({ months }: { months: RevenueMonth[] }) {
  const [tip, setTip] = useState<{ x: number; y: number; label: string; value: string } | null>(null);
  const W = 560, H = 210;
  const max = Math.max(18000, ...months.map((m) => m.airbnb + m.booking + m.vrbo)) * 1.02;
  const bw = W / months.length;
  const colw = Math.min(46, bw - 18);

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H + 24}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Opbrengsten per maand per kanaal">
        {[6000, 12000, 18000].map((g) => {
          const y = H - (g / max) * (H - 30);
          return (
            <g key={g}>
              <line x1={0} x2={W} y1={y} y2={y} stroke="#EFEDE9" strokeWidth={1} />
              <text x={0} y={y - 5} fontSize={10.5} fill="#9C9A94" fontFamily="inherit">{g / 1000}k</text>
            </g>
          );
        })}
        {months.map((m, i) => {
          const x = i * bw + (bw - colw) / 2;
          const total = m.airbnb + m.booking + m.vrbo;
          let y = H;
          const segs = SERIES.map((s) => {
            const h = (m[s.key] / max) * (H - 30);
            y -= h;
            return { ...s, y: y + 1, h: Math.max(0, h - 2), amount: m[s.key] };
          });
          return (
            <g key={m.month}>
              {segs.map((s) => (
                <rect
                  key={s.key}
                  x={x.toFixed(1)}
                  y={s.y.toFixed(1)}
                  width={colw}
                  height={s.h.toFixed(1)}
                  rx={4}
                  fill={s.color}
                  onMouseEnter={(e) => {
                    const r = (e.target as SVGRectElement).getBoundingClientRect();
                    setTip({
                      x: r.left + r.width / 2, y: r.top,
                      label: `${s.name} · ${m.label}${m.running ? " (loopt nog)" : ""}`,
                      value: `${eur(s.amount)} van ${eur(total)}`,
                    });
                  }}
                  onMouseLeave={() => setTip(null)}
                />
              ))}
              <text x={x + colw / 2} y={y - 7} fontSize={11} fontWeight={700} fill="#71706C" textAnchor="middle" fontFamily="inherit">
                {(total / 1000).toFixed(1).replace(".", ",")}k
              </text>
              <text x={x + colw / 2} y={H + 16} fontSize={11} fill="#9C9A94" textAnchor="middle" fontFamily="inherit">
                {m.label}
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

export function RevenuePage() {
  const { data, isLoading } = useRevenue();
  const toast = useToast();

  if (isLoading || !data) return <div className="loading">Opbrengsten laden…</div>;

  return (
    <section className="page">
      <h1>Opbrengsten</h1>
      <p className="sub">Precies weten waar je staat — per kanaal, per pand, met alle documenten voor je boekhouder.</p>

      <div className="rev-hero">
        <div>
          <span className="lbl">Dit jaar tot vandaag</span>
          <div className="big num">{eur(data.totalYear)}</div>
        </div>
        <span className="chip good" style={{ marginBottom: 6 }}>▲ {data.deltaLabel}</span>
        <button
          className="btn primary"
          style={{ marginLeft: "auto" }}
          onClick={() => toast("Kwartaalrapport Q2 gegenereerd — verstuurd naar je mailbox (demo)")}
        >
          <Icon name="doc" /> Rapport voor je boekhouder
        </button>
      </div>

      <div className="rev-grid">
        <div className="card chart-card">
          <h3>Per maand, per kanaal</h3>
          <p className="hint">Juli loopt nog — stand van vandaag, live uit je boekingen</p>
          <RevenueChart months={data.months} />
          <div className="legend">
            {SERIES.map((s) => (
              <span key={s.key}><span className="dot" style={{ background: s.color }} />{s.name}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card" style={{ padding: "18px 20px" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Verdeling per kanaal</h3>
            {data.channels.map((c) => (
              <div className="split-row" key={c.channel}>
                <span className="dot" style={{ background: SERIES.find((s) => s.key === c.channel)?.color }} />
                {c.label}
                <b className="num">{eur(c.amount)} · {c.pct}%</b>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 800, padding: "16px 20px 6px" }}>Per pand</h3>
            <table className="mini">
              <tbody>
                {data.perProperty.map((p) => (
                  <tr key={p.propertyId}>
                    <td>
                      {p.art} {p.name}
                      {p.badge && <span className="chip warn" style={{ marginLeft: 6 }}>{p.badge}</span>}
                    </td>
                    <td className="num">{p.amount != null ? eur(p.amount) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <h2 className="sec-title"><span className="em">🗂️</span> Facturen & documenten</h2>
      <div className="card">
        {data.documents.map((d) => (
          <div className="doc-row" key={d.id}>
            <span className="ico">{d.icon}</span>
            <span>
              <b>{d.title}</b>
              <span>{d.subtitle}</span>
            </span>
            <span className="end">
              {d.badge && <span className="chip good">{d.badge}</span>}
              <button className="btn ghost sm" onClick={() => toast("Download gestart (demo)")}>
                <Icon name="down" /> Download
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
