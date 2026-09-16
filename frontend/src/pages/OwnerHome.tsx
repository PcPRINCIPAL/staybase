import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BRAND_LABEL, DEMO_TODAY, type Booking } from "@shared/types";
import { downloadInvoice, useInvoicesOverview, useMyProperty } from "../lib/api";
import { eur, monthName, nightsBetween, shortDate, CHANNEL_META } from "../lib/format";
import { Icon } from "../components/Icon";
import { useAuth } from "../auth";
import { useUI } from "../ui";
import { useBrand, useView } from "../components/OriginGate";
import { useT } from "../i18n";

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Compacte 8-weken-strip: één rij met boekingsbalken in kanaalkleuren. */
function WeeksStrip({ bookings }: { bookings: Booking[] }) {
  const DAYS = 56;
  // Maandsegmenten voor de kopregel.
  const segments: { label: string; span: number }[] = [];
  for (let i = 0; i < DAYS; i++) {
    const iso = addDays(DEMO_TODAY, i);
    const label = `${monthName(iso)[0].toUpperCase()}${monthName(iso).slice(1)} ${iso.slice(0, 4)}`;
    const last = segments[segments.length - 1];
    if (last && last.label === label) last.span++;
    else segments.push({ label, span: 1 });
  }
  return (
    <div className="oh-strip-scroll">
      <div className="oh-strip-months">
        {segments.map((s) => (
          <span key={s.label} style={{ width: `${(s.span / DAYS) * 100}%` }}>{s.label}</span>
        ))}
      </div>
      <div className="oh-strip">
        {Array.from({ length: DAYS }, (_, i) => {
          const iso = addDays(DEMO_TODAY, i);
          const dow = new Date(iso + "T00:00:00Z").getUTCDay();
          return (
            <span key={i} className={`oh-day ${dow === 0 || dow === 6 ? "we" : ""} ${i === 0 ? "today" : ""}`}>
              <small>{Number(iso.slice(8))}</small>
            </span>
          );
        })}
        {bookings.map((b) => {
          const from = Math.max(0, nightsBetween(DEMO_TODAY, b.startDate) + 0.5);
          const to = Math.min(DAYS, nightsBetween(DEMO_TODAY, b.endDate) + 0.5);
          if (to <= from) return null;
          return (
            <span
              key={b.id}
              className={`oh-bar ${b.channel}`}
              style={{ left: `${(from / DAYS) * 100}%`, width: `${((to - from) / DAYS) * 100}%` }}
              title={`${b.guest} · ${b.startDate} → ${b.endDate} · ${b.guests} gasten via ${CHANNEL_META[b.channel].name}`}
            >
              {b.avatar} {b.guest}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function OwnerHome() {
  const { user } = useAuth();
  const platform = useView();
  const brandName = BRAND_LABEL[useBrand()];
  const t = useT();
  const { openWizard } = useUI();
  const nav = useNavigate();
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const { data, isLoading } = useMyProperty(selected);
  const { data: invoices, refetch: refetchInvoices } = useInvoicesOverview();

  if (isLoading || !data) return <div className="loading">Jouw overzicht laden…</div>;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("home.morning") : hour < 18 ? t("home.afternoon") : t("home.evening");
  const p = data.property;

  if (!p) {
    return (
      <section className="page">
        <h1>{greeting} {user?.name} 👋</h1>
        <p className="sub">{t("oh.welcome")}</p>
        <div className="card" style={{ marginTop: 24, padding: "34px 28px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🏡</div>
          <b style={{ fontSize: 17 }}>{t("oh.noProperty")}</b>
          <p style={{ color: "var(--muted)", fontSize: 14.5, maxWidth: 460, margin: "8px auto 18px" }}>
            {t("oh.noPropertyBody", { brand: brandName })}
          </p>
          <button className="btn coral" onClick={openWizard}>{t("oh.addProperty")}</button>
        </div>
      </section>
    );
  }

  const k = data.kpis;
  const nb = data.nextBooking;
  const nbCurrent = nb != null && nb.startDate <= DEMO_TODAY;
  const maand = monthName(DEMO_TODAY);
  const occDelta = k.occupancyPct - k.occupancyPrevPct;
  const revDelta = k.prevMonthRevenue ? Math.round(((k.monthRevenue - k.prevMonthRevenue) / k.prevMonthRevenue) * 100) : null;

  const meldOnderhoud = () =>
    window.dispatchEvent(new CustomEvent("sb:ask", { detail: t("oh.maintenanceAsk", { p: p.name }) }));

  return (
    <section className="page home-page owner-home">
      <div className="home-head">
        <div>
          <h1>{greeting} {user?.name} 👋</h1>
          <p className="sub" style={{ margin: "4px 0 0" }}>
            {data.properties.length > 1 ? t("oh.welcomeProps") : t("oh.welcomeProp")}
          </p>
        </div>
        <span className="date-pill">📅 {shortDate(DEMO_TODAY)} {DEMO_TODAY.slice(0, 4)}</span>
      </div>

      {data.properties.length > 1 && (
        <div className="oh-switch">
          {data.properties.map((pr) => (
            <button key={pr.id} className={`oh-switch-chip ${pr.id === p.id ? "on" : ""}`} onClick={() => setSelected(pr.id)}>
              {pr.name}
            </button>
          ))}
        </div>
      )}

      {/* §9a-nudge: uitgecheckt (of bijna) zonder factuur → aanporren. */}
      {invoices && invoices.pending.length > 0 && (
        <div className="card inv-nudge">
          <div className="inv-nudge-head">
            <span className="inv-nudge-ico"><Icon name="receipt" size={26} /></span>
            <div>
              <b>{invoices.pending.length === 1 ? t("inv.nudge1") : t("inv.nudgeN", { n: invoices.pending.length })}</b>
              <span>{t("inv.nudgeBody")}</span>
            </div>
          </div>
          <div className="inv-nudge-rows">
            {invoices.pending.slice(0, 4).map((b) => (
              <div className="inv-nudge-row" key={b.bookingId}>
                <span className="inv-nudge-who">
                  <b>{b.guest}</b>
                  <small>{b.propertyName} · {shortDate(b.endDate)}</small>
                </span>
                {b.checkedOut ? (
                  <button className="btn primary sm" onClick={() => {
                    downloadInvoice(b.bookingId);
                    setTimeout(() => refetchInvoices(), 1200);
                  }}>
                    {t("inv.download")}
                  </button>
                ) : (
                  <span className="chip warn">{t("inv.nudgeEndsSoon", { d: shortDate(b.endDate) })}</span>
                )}
              </div>
            ))}
            {invoices.pending.length > 4 && (
              <button className="home-link sm" style={{ alignSelf: "flex-start", marginTop: 2 }} onClick={() => nav("/kalender")}>
                {t("inv.nudgeMore", { n: invoices.pending.length - 4 })}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="oh-top">
        <div className="oh-hero" style={{ background: p.artBg }}>
          {p.photo && <img src={p.photo} alt="" />}
          <div className="oh-hero-overlay">
            <span className="oh-hero-chip">{t("oh.yourProperty")}</span>
            <div className="oh-hero-foot">
              <div>
                <h2>{p.name}</h2>
                <span>{t("oh.propMeta", { loc: p.location, g: p.maxGuests, b: p.bedrooms })}</span>
              </div>
              <button className="btn ghost sm oh-hero-btn" onClick={() => nav(`/pand/${p.id}`)}>
                {t("oh.viewProperty")} <Icon name="arrow" size={14} />
              </button>
            </div>
          </div>
        </div>
        <div className="card rail-card oh-assist">
          <h3>{t("oh.assistTitle", { brand: brandName })}</h3>
          <p className="hint">{t("oh.assistHint")}</p>
          <button className="btn coral" style={{ width: "100%", justifyContent: "center" }}
            onClick={() => window.dispatchEvent(new Event("sb:open"))}>
            {t("oh.askQuestion")}
          </button>
        </div>
      </div>

      <div className="hkpis oh-kpis">
        <div className="card hkpi">
          <span className="lbl">{nbCurrent ? t("oh.currentGuest") : t("oh.upcomingBooking")}</span>
          <span className="val">{nb ? (nbCurrent ? t("oh.tem", { d: shortDate(nb.endDate) }) : shortDate(nb.startDate)) : "—"}</span>
          <span className="cmp">
            {!nb
              ? t("oh.noUpcoming")
              : nbCurrent
                ? t("oh.staysNow", { g: nb.guest })
                : nb.daysUntil === 0 ? t("oh.todayBang") : nb.daysUntil === 1 ? t("oh.inDays1") : t("oh.inDaysN", { n: nb.daysUntil })}
          </span>
        </div>
        <div className="card hkpi">
          <span className="lbl">{t("oh.occupancy", { m: maand })}</span>
          <span className="val num">{k.occupancyPct}%</span>
          <span className="cmp">
            <span className={`hkpi-delta ${occDelta >= 0 ? "up" : "down"}`}>{occDelta >= 0 ? "↑" : "↓"} {Math.abs(occDelta)} pp</span> {t("oh.vsPrevMonth")}
          </span>
        </div>
        <div className="card hkpi">
          {/* Een Linnois-eigenaar ziet wat er naar hem gaat, niet de totale
              gastbetaling. De volledige berekening (− OTA-commissie − commissie
              Linnois − schoonmaak) komt met de opbrengsten-rework. */}
          <span className="lbl">{platform.grossRevenue ? t("oh.revenue", { m: maand }) : t("oh.netPayout", { m: maand })}</span>
          <span className="val num">{eur(k.monthRevenue)}</span>
          <span className="cmp">
            {revDelta != null
              ? <><span className={`hkpi-delta ${revDelta >= 0 ? "up" : "down"}`}>{revDelta >= 0 ? "↑" : "↓"} {Math.abs(revDelta)}%</span> {t("oh.vsPrevMonth")}</>
              : platform.grossRevenue ? t("oh.revCmp") : t("oh.netCmp")}
          </span>
        </div>
        <div className="card hkpi">
          {k.rating != null ? (
            <>
              <span className="lbl">{t("oh.rating")}</span>
              <span className="val num">{String(k.rating).replace(".", ",")} / 5</span>
              <span className="cmp">{t("oh.ratingCmp")}</span>
            </>
          ) : (
            <>
              <span className="lbl">{t("oh.next8")}</span>
              <span className="val num">{data.upcoming.length}</span>
              <span className="cmp">{data.upcoming.length === 1 ? t("oh.booked1") : t("oh.bookedN")}</span>
            </>
          )}
        </div>
      </div>

      <div className="oh-grid">
        <div className="oh-main">
          <div className="card oh-next">
            <div className="oh-card-head">
              <h3>{nbCurrent ? t("oh.nowGuest") : t("oh.nextBooking")}</h3>
              <button className="home-link" onClick={() => nav("/kalender")}>{t("home.seeAll")} <Icon name="arrow" size={14} /></button>
            </div>
            {nb ? (
              <>
                <div className="oh-next-guest">
                  <span className="avat">{nb.avatar}</span>
                  <div>
                    <b>{nb.guest}</b><br />
                    <span>{shortDate(nb.startDate)} – {shortDate(nb.endDate)} {nb.endDate.slice(0, 4)} ({nb.nights} {nb.nights === 1 ? t("common.night") : t("common.nights")})</span>
                  </div>
                  <span className="chip good" style={{ marginLeft: "auto" }}>{nbCurrent ? t("oh.checkedIn") : t("oh.confirmed")}</span>
                </div>
                <div className="oh-next-stats">
                  <div><b className="num">{nb.guests}</b><span>{t("common.guests")}</span></div>
                  <div><b>{t("common.checkIn")}</b><span>{nb.checkInTime ? t("common.from", { time: nb.checkInTime }) : "—"}</span></div>
                  <div><b>{t("common.checkOut")}</b><span>{nb.checkOutTime ? t("common.until", { time: nb.checkOutTime }) : "—"}</span></div>
                </div>
                <div className="oh-next-actions">
                  {platform.inbox
                    ? <button className="btn ghost sm" onClick={() => nav("/inbox")}>{t("oh.sendMessage")}</button>
                    : <button className="btn ghost sm" onClick={() => window.dispatchEvent(new Event("sb:open"))}>{t("oh.chatJulie")}</button>}
                  <button className="btn ghost sm" onClick={() => nav("/kalender")}>{t("oh.viewBooking")} <Icon name="arrow" size={13} /></button>
                </div>
              </>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>{t("oh.noBookings")}</p>
            )}
          </div>

          <div className="card oh-cal">
            <div className="oh-card-head">
              <h3>{t("oh.calendar")} <small>{t("oh.calWeeks")}</small></h3>
              <button className="home-link" onClick={() => nav("/kalender")}>{t("oh.viewCalendar")} <Icon name="arrow" size={14} /></button>
            </div>
            <WeeksStrip bookings={data.upcoming} />
          </div>
        </div>

        <aside className="oh-rail">
          <div className="card rail-card">
            <h3>{t("oh.quickActions")}</h3>
            <button className="tmrw-row" onClick={() => nav("/kalender")}>
              <span className="tmrw-ico" style={{ background: "var(--coral-soft)" }}>📅</span>
              <span><b>{t("oh.block")}</b><br /><small>{t("oh.blockSub")}</small></span>
              <span className="tmrw-go"><Icon name="chevR" size={15} /></span>
            </button>
            <button className="tmrw-row" onClick={meldOnderhoud}>
              <span className="tmrw-ico" style={{ background: "var(--booking-soft)" }}>🔧</span>
              <span><b>{t("oh.maintenance")}</b><br /><small>{t("oh.maintenanceSub")}</small></span>
              <span className="tmrw-go"><Icon name="chevR" size={15} /></span>
            </button>
            <button className="tmrw-row" style={{ marginBottom: 0 }} onClick={() => nav("/opbrengsten")}>
              <span className="tmrw-ico" style={{ background: "var(--vrbo-soft)" }}>📄</span>
              <span><b>{t("oh.documents")}</b><br /><small>{t("oh.documentsSub")}</small></span>
              <span className="tmrw-go"><Icon name="chevR" size={15} /></span>
            </button>
          </div>

          <div className="card rail-card oh-contact">
            <h3>{t("oh.contact")}</h3>
            <div className="oh-contact-row">
              <span className="avatar" style={{ width: 44, height: 44, fontSize: 17 }}>{data.contactName.slice(0, 1)}</span>
              <div>
                <b>{t("oh.contactOf", { name: data.contactName, brand: brandName })}</b><br />
                <small>{t("oh.pm")}</small>
              </div>
            </div>
            <div className="oh-contact-quote">{t("oh.contactQuote")}</div>
            <button className="btn ghost sm" style={{ width: "100%", justifyContent: "center" }}
              onClick={() => window.dispatchEvent(new Event("sb:open"))}>
              {t("oh.sendMsg")}
            </button>
            <small className="oh-contact-hours">{t("oh.hours")}</small>
          </div>

          {platform.inbox ? (
          <div className="card rail-card">
            <div className="oh-card-head" style={{ marginBottom: 10 }}>
              <h3>{t("oh.recentMsgs")}</h3>
              <button className="home-link sm" onClick={() => nav("/inbox")}>{t("home.seeAll")} <Icon name="arrow" size={13} /></button>
            </div>
            {data.recent.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>{t("oh.noMsgs")}</p>}
            {data.recent.map((c) => (
              <button key={c.id} className="oh-msg" onClick={() => nav("/inbox")}>
                <span className="avat" style={{ width: 34, height: 34, fontSize: 15 }}>{c.avatar}</span>
                <span className="oh-msg-txt">
                  <b>{c.guest}</b>
                  <small>{c.snippet}</small>
                </span>
                <span className="oh-msg-meta">
                  <time>{c.timeLabel}</time>
                  {c.status !== "done" && <i className="oh-dot" />}
                </span>
              </button>
            ))}
          </div>
          ) : (
            <div className="card rail-card">
              <div className="oh-card-head" style={{ marginBottom: 10 }}>
                <h3>{t("oh.julieCard")}</h3>
              </div>
              <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 12 }}>
                {t("oh.julieCardBody")}
              </p>
              <button className="btn coral sm" style={{ width: "100%", justifyContent: "center" }}
                onClick={() => window.dispatchEvent(new Event("sb:open"))}>
                {t("oh.julieCardCta")}
              </button>
            </div>
          )}
        </aside>
      </div>

      <div className="oh-banner">
        <div>
          <b>{t("oh.footerTitle")}</b>
          <span>{t("oh.footerSub")}</span>
        </div>
        <button className="btn ghost sm oh-banner-btn" onClick={() => nav("/kennis")}>
          {t("oh.footerCta")} <Icon name="arrow" size={14} />
        </button>
      </div>
    </section>
  );
}
