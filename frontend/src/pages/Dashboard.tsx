import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DEMO_TODAY } from "@shared/types";
import { useOverview } from "../lib/api";
import { eur, longDate, monthName } from "../lib/format";
import { Icon } from "../components/Icon";
import { OwnerHome } from "./OwnerHome";
import { useAuth } from "../auth";
import { useT, type TFn } from "../i18n";
import { useBrand } from "../components/OriginGate";
import { BRAND_LABEL } from "@shared/types";

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

function fmtResponse(min: number | null, t: TFn): string {
  if (min == null) return "—";
  if (min < 60) return `${min} min`;
  if (min < 48 * 60) return `${(min / 60).toFixed(1).replace(".", ",")} u`;
  return t("home.responseDays", { n: Math.round(min / 1440) });
}

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  return h > 0 ? `${h}u ${min % 60}m` : `${min}m`;
}

export function Dashboard() {
  const { user } = useAuth();
  // Eigenaars krijgen het pand-gerichte dashboard; het team ziet het portfolio-overzicht.
  if (user?.role === "owner") return <OwnerHome />;
  return <TeamHome />;
}

function TeamHome() {
  const { data, isLoading } = useOverview();
  const nav = useNavigate();
  const t = useT();
  const brand = BRAND_LABEL[useBrand()];
  const [q, setQ] = useState("");

  if (isLoading || !data) return <div className="loading">Dashboard laden…</div>;

  const h = data.home;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("home.morning") : hour < 18 ? t("home.afternoon") : t("home.evening");
  const actions = data.attention.inboxDrafts + data.attention.priceOpen + data.attention.cleaningPending;
  const inbox = data.attention.inboxDrafts;
  const maand = monthName(DEMO_TODAY);
  const syncLabel = h.guestySyncAt
    ? (h.guestySyncAt.slice(0, 10) === DEMO_TODAY ? t("home.chipToday") : `${Number(h.guestySyncAt.slice(8, 10))} ${monthName(h.guestySyncAt).slice(0, 3)}`)
    : null;

  const askHome = () => {
    const question = q.trim();
    if (!question) return;
    window.dispatchEvent(new CustomEvent("sb:ask", { detail: question }));
    setQ("");
  };

  const tomorrowRows = [
    { icon: "🔑", tint: "var(--coral-soft)", n: h.tomorrow.checkIns, label: t("home.checkIns") },
    { icon: "🧳", tint: "var(--booking-soft)", n: h.tomorrow.checkOuts, label: t("home.checkOuts") },
    { icon: "🧽", tint: "var(--vrbo-soft)", n: h.tomorrow.cleanings, label: t("home.cleanings") },
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
                  ? (actions === 1 ? t("home.waiting1") : t("home.waitingN", { n: actions }))
                  : t("home.allRunning")}
              </p>
            </div>
            <span className="date-pill">📅 {longDate(DEMO_TODAY)}</span>
          </div>

          {inbox > 0 && (
            <div className="home-alert">
              <span className="home-alert-ico">💬</span>
              <div>
                <b>{inbox === 1 ? t("home.msgWaiting1") : t("home.msgWaitingN", { n: inbox })}</b>
                {h.oldestInboxMinutes != null && (
                  <span>{t("home.oldest", { t: fmtResponse(h.oldestInboxMinutes, t) })}</span>
                )}
              </div>
              <button className="btn coral" onClick={() => nav("/inbox")}>
                {t("home.answerBtn")} <Icon name="arrow" />
              </button>
            </div>
          )}

          <div className="hkpis">
            <div className="card hkpi">
              <span className="lbl">{t("home.kpi.occupancy", { m: maand })}</span>
              <div className="hkpi-row">
                <span className="val num">{data.kpis.occupancyPct}%</span>
                <Spark points={h.sparkOccupancy} />
              </div>
              <span className="cmp">
                <Delta now={data.kpis.occupancyPct} prev={h.occupancyPrevPct} unit="%" /> {t("home.kpi.vsPrev", { v: `${h.occupancyPrevPct}%` })}
              </span>
            </div>
            <div className="card hkpi">
              <span className="lbl">{t("home.kpi.revenue", { m: maand })}</span>
              <div className="hkpi-row">
                <span className="val num">{eur(data.kpis.monthRevenue)}</span>
                <Spark points={h.sparkRevenue} />
              </div>
              <span className="cmp">
                <Delta now={data.kpis.monthRevenue} prev={h.prevMonthRevenue} unit="€" /> {t("home.kpi.vsPrev", { v: eur(h.prevMonthRevenue) })}
              </span>
            </div>
            <div className="card hkpi">
              <span className="lbl">{t("home.kpi.adr")}</span>
              <div className="hkpi-row">
                <span className="val num">{eur(data.kpis.avgNight)}</span>
                <Spark points={h.sparkAdr} />
              </div>
              <span className="cmp">
                {h.adrPrev ? <><Delta now={data.kpis.avgNight} prev={h.adrPrev} unit="€" /> {t("home.kpi.vsPrev", { v: eur(h.adrPrev) })}</> : t("home.kpi.perNight")}
              </span>
            </div>
            {h.rating != null ? (
              <div className="card hkpi">
                <span className="lbl">{t("home.kpi.score")}</span>
                <div className="hkpi-row">
                  <span className="val num">{String(h.rating).replace(".", ",")} / 5</span>
                  <span className="hkpi-star">★</span>
                </div>
                <span className="cmp">{t("home.kpi.scoreCmp")}</span>
              </div>
            ) : (
              <div className="card hkpi">
                <span className="lbl">{t("home.kpi.newBookings", { m: maand })}</span>
                <div className="hkpi-row">
                  <span className="val num">{h.sparkBookings[h.sparkBookings.length - 1] ?? 0}</span>
                  <Spark points={h.sparkBookings} />
                </div>
                <span className="cmp">{t("home.kpi.newBookingsCmp")}</span>
              </div>
            )}
          </div>

          <div className="card home-day">
            <div className="home-today">
              <h3>{t("home.today")}</h3>
              {data.timeline.length === 0 ? (
                <div className="home-quiet">
                  <span className="home-quiet-ico">☀️</span>
                  <b>{t("home.quiet")}</b>
                  <span>{t("home.quietSub")}</span>
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
              <h3>{t("home.tomorrow")}</h3>
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
              <b>{t("home.trust")}</b>
              <span>{t("home.trustSub")}</span>
            </div>
            <div className="home-trust-chips">
              {h.rating != null && <span className="chip gray">● {t("home.chipReviews")} <b className="num">{String(h.rating).replace(".", ",")} ★</b></span>}
              <span className="chip gray">● <b className="num">{data.properties.filter((p) => p.status === "live").length}</b> {t("home.chipLive")}</span>
              <span className="chip gray">● {t("home.chipResponse")} <b>{fmtResponse(h.medianResponseMin, t)}</b></span>
              {syncLabel && <span className="chip gray">● {t("home.chipSync")} <b>{syncLabel}</b></span>}
            </div>
          </div>

          <div className="home-props-head">
            <h2 className="sec-title" style={{ margin: 0 }}><span className="em">🏡</span> {t("home.yourProps")}</h2>
            <Link to="/panden" className="home-link">{t("home.seeAll")} <Icon name="arrow" size={14} /></Link>
          </div>
          <div className="home-props">
            {h.properties.map((p) => (
              <button key={p.id} className="hprop" onClick={() => nav(`/pand/${p.id}`)}>
                <span className="hprop-art" style={{ background: p.artBg }}>
                  {p.photo ? <img src={p.photo} alt="" loading="lazy" /> : p.art}
                  <span className="hprop-badge num">{t("home.occupied", { n: p.occupancyPct })}</span>
                </span>
                <span className="hprop-body">
                  <b>{p.name}</b>
                  <small>{p.location}</small>
                  <span className="hprop-line">
                    <span className="num">{eur(p.monthRevenue)}</span> <small>{t("home.revThisMonth")}</small>
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
            <h3>{t("home.assistant", { brand })}</h3>
            <p className="hint">{t("home.assistantHint")}</p>
            <div className="rail-ask">
              <input
                type="text"
                value={q}
                placeholder={t("home.askPlaceholder", { brand })}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askHome()}
              />
              <button className="btn coral sm" onClick={askHome} disabled={!q.trim()} aria-label={t("home.askSend")}>
                <Icon name="arrow" size={15} />
              </button>
            </div>
            {h.insights.length > 0 && (
              <>
                <b className="rail-sub">{h.insights.length === 1 ? t("home.insight1") : t("home.insightN", { n: h.insights.length })}</b>
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
            <b>{t("home.weekTitle1", { brand })}<br />{t("home.weekTitle2", { d: fmtDuration(h.weekWork.minutes) })}</b>
            <div className="week-big"><span className="num">{t("home.weekTasks", { n: weekTasks })}</span> {t("home.weekDone")}</div>
            <div className="week-split">
              <div><b className="num">{h.weekWork.messages}</b><span>{t("home.weekMessages")}</span></div>
              <div><b className="num">{h.weekWork.newBookings}</b><span>{t("home.weekBookings")}</span></div>
              <div><b className="num">{h.weekWork.checkIns}</b><span>{t("home.checkIns")}</span></div>
            </div>
            <small className="week-note">{t("home.weekNote")}</small>
          </div>
        </aside>
      </div>
    </section>
  );
}
