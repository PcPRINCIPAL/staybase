import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DEMO_TODAY } from "@shared/types";
import { useOverview } from "../lib/api";
import { eur, monthName } from "../lib/format";
import { Icon } from "../components/Icon";

/** Mini-sparkline: 2px koraallijn met een eindmarker (witte ring). */
function Spark({ points }: { points: number[] }) {
  const W = 92, H = 30, P = 4;
  const max = Math.max(1, ...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const xy = points.map((v, i) => [
    P + (i / (points.length - 1)) * (W - 2 * P),
    H - P - ((v - min) / span) * (H - 2 * P),
  ]);
  const last = xy[xy.length - 1];
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline points={xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}
        fill="none" stroke="var(--coral)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={4} fill="var(--coral)" stroke="var(--card)" strokeWidth={2} />
    </svg>
  );
}

function Delta({ now, prev, unit }: { now: number; prev: number; unit: string }) {
  if (!prev) return null;
  const up = now >= prev;
  const diff = unit === "%" ? now - prev : Math.round(((now - prev) / prev) * 100);
  return (
    <span className={`hkpi-delta ${up ? "up" : "down"}`}>
      {up ? "↑" : "↓"} {Math.abs(diff)}{unit === "%" ? " pp" : "%"}
    </span>
  );
}

function fmtResponse(min: number | null): string {
  if (min == null) return "—";
  if (min < 60) return `${min} min`;
  if (min < 48 * 60) return `${(min / 60).toFixed(1).replace(".", ",")} u`;
  return `${Math.round(min / 1440)} dagen`;
}

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  return h > 0 ? `${h}u ${min % 60}m` : `${min}m`;
}

export function Dashboard() {
  const { data, isLoading } = useOverview();
  const nav = useNavigate();
  const [q, setQ] = useState("");

  if (isLoading || !data) return <div className="loading">Dashboard laden…</div>;

  const h = data.home;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  const actions = data.attention.inboxDrafts + data.attention.priceOpen + data.attention.cleaningPending;
  const inbox = data.attention.inboxDrafts;
  const maand = monthName(DEMO_TODAY);
  const syncLabel = h.guestySyncAt
    ? (h.guestySyncAt.slice(0, 10) === DEMO_TODAY ? "vandaag" : `${Number(h.guestySyncAt.slice(8, 10))} ${monthName(h.guestySyncAt).slice(0, 3)}`)
    : null;

  const askHome = () => {
    const question = q.trim();
    if (!question) return;
    window.dispatchEvent(new CustomEvent("sb:ask", { detail: question }));
    setQ("");
  };

  const tomorrowRows = [
    { icon: "🔑", tint: "var(--coral-soft)", n: h.tomorrow.checkIns, label: "Check-ins" },
    { icon: "🧳", tint: "var(--booking-soft)", n: h.tomorrow.checkOuts, label: "Check-outs" },
    { icon: "🧽", tint: "var(--vrbo-soft)", n: h.tomorrow.cleanings, label: "Poetsbeurten" },
  ];
  const insightTints = ["var(--warn-soft)", "var(--booking-soft)", "var(--vrbo-soft)"];
  const weekTasks = h.weekWork.messages + h.weekWork.newBookings + h.weekWork.checkIns;

  return (
    <section className="page home-page">
      <div className="home-grid">
        <div className="home-main">
          <div className="home-head">
            <div>
              <h1>{greeting} {data.greetingName} 👋</h1>
              <p className="sub" style={{ margin: "4px 0 0" }}>
                {actions > 0
                  ? `Alles loopt — ${actions === 1 ? "1 ding wacht" : `${actions} dingen wachten`} op jou.`
                  : "Alles loopt. Er wacht vandaag niets op jou. 🎉"}
              </p>
            </div>
            <span className="date-pill">📅 {data.dateLabel}</span>
          </div>

          {inbox > 0 && (
            <div className="home-alert">
              <span className="home-alert-ico">💬</span>
              <div>
                <b>{inbox} {inbox === 1 ? "bericht wacht" : "berichten wachten"} op antwoord</b>
                {h.oldestInboxMinutes != null && (
                  <span>Oudste bericht: {fmtResponse(h.oldestInboxMinutes)} geleden</span>
                )}
              </div>
              <button className="btn coral" onClick={() => nav("/inbox")}>
                Berichten beantwoorden <Icon name="arrow" />
              </button>
            </div>
          )}

          <div className="hkpis">
            <div className="card hkpi">
              <span className="lbl">Bezetting ({maand})</span>
              <div className="hkpi-row">
                <span className="val num">{data.kpis.occupancyPct}%</span>
                <Spark points={h.sparkOccupancy} />
              </div>
              <span className="cmp">
                <Delta now={data.kpis.occupancyPct} prev={h.occupancyPrevPct} unit="%" /> vs. {h.occupancyPrevPct}% vorige maand
              </span>
            </div>
            <div className="card hkpi">
              <span className="lbl">Omzet ({maand})</span>
              <div className="hkpi-row">
                <span className="val num">{eur(data.kpis.monthRevenue)}</span>
                <Spark points={h.sparkRevenue} />
              </div>
              <span className="cmp">
                <Delta now={data.kpis.monthRevenue} prev={h.prevMonthRevenue} unit="€" /> vs. {eur(h.prevMonthRevenue)} vorige maand
              </span>
            </div>
            <div className="card hkpi">
              <span className="lbl">Gem. nachtprijs</span>
              <div className="hkpi-row">
                <span className="val num">{eur(data.kpis.avgNight)}</span>
                <Spark points={h.sparkAdr} />
              </div>
              <span className="cmp">
                {h.adrPrev ? <><Delta now={data.kpis.avgNight} prev={h.adrPrev} unit="€" /> vs. {eur(h.adrPrev)} vorige maand</> : "Uitbetaling per geboekte nacht"}
              </span>
            </div>
            {h.rating != null ? (
              <div className="card hkpi">
                <span className="lbl">Gastenscore</span>
                <div className="hkpi-row">
                  <span className="val num">{String(h.rating).replace(".", ",")} / 5</span>
                  <span className="hkpi-star">★</span>
                </div>
                <span className="cmp">Gemiddelde score van je live panden</span>
              </div>
            ) : (
              <div className="card hkpi">
                <span className="lbl">Nieuwe boekingen ({maand})</span>
                <div className="hkpi-row">
                  <span className="val num">{h.sparkBookings[h.sparkBookings.length - 1] ?? 0}</span>
                  <Spark points={h.sparkBookings} />
                </div>
                <span className="cmp">Verblijven met check-in deze maand</span>
              </div>
            )}
          </div>

          <div className="card home-day">
            <div className="home-today">
              <h3>🗓️ Vandaag</h3>
              {data.timeline.length === 0 ? (
                <div className="home-quiet">
                  <span className="home-quiet-ico">☀️</span>
                  <b>Rustige dag vandaag</b>
                  <span>Geen check-ins, check-outs of poetsbeurten gepland.</span>
                </div>
              ) : (
                <div className="tl" style={{ boxShadow: "none", padding: 0 }}>
                  {data.timeline.map((t, i) => (
                    <div className="tl-row" key={i}>
                      <span className="tl-time num">{t.time}</span>
                      <span className="tl-ico" style={{ background: t.iconBg }}>{t.icon}</span>
                      <span><b>{t.title}</b><span>{t.subtitle}</span></span>
                      <span className={`chip ${t.chip.tone}`}>{t.chip.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="home-tomorrow">
              <h3>Morgen</h3>
              {tomorrowRows.map((r) => (
                <button key={r.label} className="tmrw-row" onClick={() => nav("/kalender")}>
                  <span className="tmrw-ico" style={{ background: r.tint }}>{r.icon}</span>
                  <b className="num">{r.n}</b>
                  <span>{r.label}</span>
                  <span className="tmrw-go"><Icon name="chevR" size={15} /></span>
                </button>
              ))}
            </div>
          </div>

          <div className="home-trust">
            <span className="home-trust-ico">🛡️</span>
            <div>
              <b>Snel, veilig en betrouwbaar</b>
              <span>Je gasten zijn tevreden en alles is gesynchroniseerd.</span>
            </div>
            <div className="home-trust-chips">
              {h.rating != null && <span className="chip gray">● Reviews <b className="num">{String(h.rating).replace(".", ",")} ★</b></span>}
              <span className="chip gray">● <b className="num">{data.properties.filter((p) => p.status === "live").length}</b> panden live</span>
              <span className="chip gray">● Reactietijd <b>{fmtResponse(h.medianResponseMin)}</b></span>
              {syncLabel && <span className="chip gray">● Guesty-sync <b>{syncLabel}</b></span>}
            </div>
          </div>

          <div className="home-props-head">
            <h2 className="sec-title" style={{ margin: 0 }}><span className="em">🏡</span> Jouw panden</h2>
            <Link to="/panden" className="home-link">Bekijk alle <Icon name="arrow" size={14} /></Link>
          </div>
          <div className="home-props">
            {h.properties.map((p) => (
              <button key={p.id} className="hprop" onClick={() => nav(`/pand/${p.id}`)}>
                <span className="hprop-art" style={{ background: p.artBg }}>
                  {p.photo ? <img src={p.photo} alt="" loading="lazy" /> : p.art}
                  <span className="hprop-badge num">{p.occupancyPct}% bezet</span>
                </span>
                <span className="hprop-body">
                  <b>{p.name}</b>
                  <small>{p.location}</small>
                  <span className="hprop-line">
                    <span className="num">{eur(p.monthRevenue)}</span> <small>omzet deze maand</small>
                    {p.rating != null && <span className="hprop-rate num">★ {p.rating.toFixed(2).replace(".", ",")}</span>}
                  </span>
                </span>
                <span className="hprop-foot">🕐 {p.todayLabel}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="home-rail">
          <div className="card rail-card">
            <h3>✨ Staybase Assistant</h3>
            <p className="hint">Wat wil je weten of doen?</p>
            <div className="rail-ask">
              <input
                type="text"
                value={q}
                placeholder="Stel een vraag aan Staybase…"
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askHome()}
              />
              <button className="btn coral sm" onClick={askHome} disabled={!q.trim()} aria-label="Vraag versturen">
                <Icon name="arrow" size={15} />
              </button>
            </div>
            {h.insights.length > 0 && (
              <>
                <b className="rail-sub">{h.insights.length} {h.insights.length === 1 ? "inzicht" : "inzichten"} voor jou</b>
                {h.insights.map((ins, i) => (
                  <div key={ins.title} className="rail-insight" style={{ background: insightTints[i % insightTints.length] }}>
                    <span className="rail-insight-ico">{ins.icon}</span>
                    <div>
                      <b>{ins.title}</b>
                      <p>{ins.body}</p>
                      <Link to={ins.to} className="home-link sm">{ins.cta} <Icon name="arrow" size={13} /></Link>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="card rail-card week-card">
            <b>Staybase werkte deze week<br />±{fmtDuration(h.weekWork.minutes)} voor jou ✨</b>
            <div className="week-big"><span className="num">{weekTasks} taken</span> afgehandeld</div>
            <div className="week-split">
              <div><b className="num">{h.weekWork.messages}</b><span>Gastberichten</span></div>
              <div><b className="num">{h.weekWork.newBookings}</b><span>Nieuwe boekingen</span></div>
              <div><b className="num">{h.weekWork.checkIns}</b><span>Check-ins</span></div>
            </div>
            <small className="week-note">Tijdswinst is een schatting op basis van de afgehandelde taken.</small>
          </div>
        </aside>
      </div>
    </section>
  );
}
