import { useState } from "react";
import type { PriceStripDay } from "@shared/types";
import {
  useDecideSuggestion, usePriceStrip, usePriceSuggestions, usePricingSettings, useSetAutoPricing,
} from "../lib/api";
import { useToast } from "../components/Toast";

function PriceStripChart({ days }: { days: PriceStripDay[] }) {
  const [tip, setTip] = useState<{ x: number; y: number; label: string; value: string } | null>(null);
  const W = 560, H = 150, max = 340, bw = W / days.length;
  const ticks = [0, 7, 14, 21, days.length - 1];

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H + 22}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Nachtprijzen komende 30 dagen">
        {days.map((d, i) => {
          const val = d.suggested ?? d.price;
          const h = Math.round((val / max) * (H - 24));
          return (
            <rect
              key={d.date}
              x={(i * bw + 2).toFixed(1)}
              y={H - h}
              width={(bw - 4).toFixed(1)}
              height={h}
              rx={4}
              fill={d.suggested ? "var(--coral)" : "#E7E4DF"}
              onMouseEnter={(e) => {
                const r = (e.target as SVGRectElement).getBoundingClientRect();
                setTip({ x: r.left + r.width / 2, y: r.top, label: d.label, value: `€ ${val}${d.suggested ? " · voorstel" : ""}` });
              }}
              onMouseLeave={() => setTip(null)}
            />
          );
        })}
        {ticks.map((i) => (
          <text
            key={i}
            x={i === 0 ? 2 : i === days.length - 1 ? W - 2 : i * bw + bw / 2}
            y={H + 16}
            fontSize={10.5}
            fill="#9C9A94"
            textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"}
            fontFamily="inherit"
          >
            {days[i].label}
          </text>
        ))}
      </svg>
      {tip && (
        <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
          <small>{tip.label}</small>{tip.value}
        </div>
      )}
    </div>
  );
}

export function PricesPage() {
  const { data: sugs, isLoading } = usePriceSuggestions();
  const { data: strip } = usePriceStrip("villa-zeewind");
  const { data: settings } = usePricingSettings();
  const decide = useDecideSuggestion();
  const setAuto = useSetAutoPricing();
  const toast = useToast();

  if (isLoading || !sugs) return <div className="loading">Prijzen laden…</div>;

  const reviewLeft = Math.max(0, (settings?.reviewTarget ?? 10) - (settings?.decided ?? 0) - 6);
  const auto = settings?.auto ?? false;

  const onDecide = (id: string, decision: "accepted" | "rejected") => {
    decide.mutate([id, decision], {
      onSuccess: () =>
        toast(decision === "accepted" ? "Prijs aangepast op Airbnb & Booking.com ✓" : "Voorstel afgewezen — Staybase onthoudt dit"),
    });
  };

  return (
    <section className="page">
      <h1>Slimme prijzen</h1>
      <p className="sub">
        Staybase vergelijkt 536 gelijkaardige verblijven in Knokke, het weer, events en jouw boekingshistoriek. Jij beslist.
      </p>

      <div className="price-head">
        <div className="card" style={{ flex: 1, minWidth: 280, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <button
            className={`switch ${auto ? "on" : ""}`}
            role="switch"
            aria-checked={auto}
            aria-label="Voorstellen automatisch toepassen"
            onClick={() =>
              setAuto.mutate([!auto], {
                onSuccess: () => toast(!auto ? "Staybase past voorstellen voortaan zelf toe" : "Jij keurt elk voorstel eerst goed"),
              })
            }
          />
          <div>
            <b style={{ fontSize: 14.5 }}>Voorstellen automatisch toepassen</b><br />
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {reviewLeft > 0
                ? `Aanbevolen zodra je 10 voorstellen beoordeeld hebt — nog ${reviewLeft} te gaan.`
                : "Je beoordeelde 10 voorstellen — automatisch toepassen staat voor je klaar! 🎉"}
            </span>
          </div>
        </div>
        <div className="card chart-card" style={{ flex: 1.4, minWidth: 320 }}>
          <h3>Nachtprijs — komende 30 dagen · Villa Zeewind</h3>
          <p className="hint">Koraal = dagen met een openstaand voorstel</p>
          {strip && <PriceStripChart days={strip} />}
        </div>
      </div>

      <h2 className="sec-title"><span className="em">✨</span> Voorstellen voor jou</h2>
      <div>
        {sugs.map((s) => {
          if (s.status === "accepted") {
            return (
              <div className="card sug decided" key={s.id}>
                <span style={{ fontSize: 22 }}>✅</span>
                <div>
                  <b style={{ fontSize: 14.5 }}>{s.rangeLabel} · € {s.priceTo}</b><br />
                  <span className="why">Toegepast op Airbnb & Booking.com</span>
                </div>
              </div>
            );
          }
          if (s.status === "rejected") {
            return (
              <div className="card sug decided" key={s.id}>
                <span style={{ fontSize: 22 }}>🙅</span>
                <div>
                  <b style={{ fontSize: 14.5 }}>{s.rangeLabel}</b><br />
                  <span className="why">Afgewezen — Staybase leert hieruit voor volgende voorstellen</span>
                </div>
              </div>
            );
          }
          const up = s.priceTo > s.priceFrom;
          return (
            <div className="card sug" key={s.id}>
              <span className="cal-ico">
                <b className="num">{s.rangeLabel.split("–")[0].trim()}</b>
                <span>– {s.rangeLabel.split("–")[1]?.trim()}</span>
              </span>
              <div style={{ minWidth: 200, flex: 1 }}>
                <b style={{ fontSize: 14.5 }}>{s.propertyName} · {s.dowLabel}</b><br />
                <span className="why">{s.reason}</span>
              </div>
              <div className="delta">
                <span className="from num">€ {s.priceFrom}</span><br />
                <span className={`to num ${up ? "up" : "down"}`}>€ {s.priceTo} {up ? "▲" : "▼"}</span>
              </div>
              <div className="sug-actions">
                <button className="btn primary sm" disabled={decide.isPending} onClick={() => onDecide(s.id, "accepted")}>
                  Toepassen
                </button>
                <button className="btn ghost sm" disabled={decide.isPending} onClick={() => onDecide(s.id, "rejected")}>
                  Afwijzen
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
