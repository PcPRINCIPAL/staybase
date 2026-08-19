import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DEMO_TODAY, type Booking } from "@shared/types";
import { useMyProperty } from "../lib/api";
import { eur, monthName, nightsBetween, CHANNEL_META } from "../lib/format";
import { Icon } from "../components/Icon";
import { useAuth } from "../auth";
import { useUI } from "../ui";

const DOW = ["ma", "di", "wo", "do", "vr", "za", "zo"];

function dayLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const dow = DOW[(d.getUTCDay() + 6) % 7];
  return `${dow[0].toUpperCase()}${dow[1]} ${d.getUTCDate()} ${monthName(iso).slice(0, 3)}`;
}

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
  const { openWizard } = useUI();
  const nav = useNavigate();
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const { data, isLoading } = useMyProperty(selected);

  if (isLoading || !data) return <div className="loading">Jouw overzicht laden…</div>;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  const p = data.property;

  if (!p) {
    return (
      <section className="page">
        <h1>{greeting} {user?.name} 👋</h1>
        <p className="sub">Fijn dat je er bent.</p>
        <div className="card" style={{ marginTop: 24, padding: "34px 28px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🏡</div>
          <b style={{ fontSize: 17 }}>Er is nog geen pand aan je account gekoppeld</b>
          <p style={{ color: "var(--muted)", fontSize: 14.5, maxWidth: 460, margin: "8px auto 18px" }}>
            Voeg je pand toe via de onboarding — het Staybase-team koppelt het daarna aan
            jouw account en dan verschijnt hier je volledige overzicht.
          </p>
          <button className="btn coral" onClick={openWizard}>+ Pand toevoegen</button>
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
    window.dispatchEvent(new CustomEvent("sb:ask", { detail: `Ik wil onderhoud melden voor ${p.name}.` }));

  return (
    <section className="page home-page owner-home">
      <div className="home-head">
        <div>
          <h1>{greeting} {user?.name} 👋</h1>
          <p className="sub" style={{ margin: "4px 0 0" }}>
            Fijn dat je er bent. Hier is het overzicht van jouw {data.properties.length > 1 ? "panden" : "pand"}.
          </p>
        </div>
        <span className="date-pill">📅 {dayLabel(DEMO_TODAY)} {DEMO_TODAY.slice(0, 4)}</span>
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

      <div className="oh-top">
        <div className="oh-hero" style={{ background: p.artBg }}>
          {p.photo && <img src={p.photo} alt="" />}
          <div className="oh-hero-overlay">
            <span className="oh-hero-chip">🏠 Jouw pand</span>
            <div className="oh-hero-foot">
              <div>
                <h2>{p.name}</h2>
                <span>{p.location} · {p.maxGuests} gasten · {p.bedrooms} slaapkamers</span>
              </div>
              <button className="btn ghost sm oh-hero-btn" onClick={() => nav(`/pand/${p.id}`)}>
                Bekijk pand <Icon name="arrow" size={14} />
              </button>
            </div>
          </div>
        </div>
        <div className="card rail-card oh-assist">
          <h3>✨ Staybase Assistent</h3>
          <p className="hint">Vragen over je boekingen, onderhoud of iets anders? Wij helpen je graag.</p>
          <button className="btn coral" style={{ width: "100%", justifyContent: "center" }}
            onClick={() => window.dispatchEvent(new Event("sb:open"))}>
            💬 Stel een vraag
          </button>
        </div>
      </div>

      <div className="hkpis oh-kpis">
        <div className="card hkpi">
          <span className="lbl">{nbCurrent ? "🔑 Huidige gast" : "📅 Aankomende boeking"}</span>
          <span className="val">{nb ? (nbCurrent ? `t.e.m. ${dayLabel(nb.endDate)}` : dayLabel(nb.startDate)) : "—"}</span>
          <span className="cmp">
            {!nb
              ? "Geen aankomende boeking"
              : nbCurrent
                ? `${nb.guest} verblijft er nu`
                : nb.daysUntil === 0 ? "Vandaag!" : `Nog ${nb.daysUntil} ${nb.daysUntil === 1 ? "dag" : "dagen"}`}
          </span>
        </div>
        <div className="card hkpi">
          <span className="lbl">👥 Bezetting ({maand})</span>
          <span className="val num">{k.occupancyPct}%</span>
          <span className="cmp">
            <span className={`hkpi-delta ${occDelta >= 0 ? "up" : "down"}`}>{occDelta >= 0 ? "↑" : "↓"} {Math.abs(occDelta)} pp</span> t.o.v. vorige maand
          </span>
        </div>
        <div className="card hkpi">
          <span className="lbl">💶 Opbrengsten ({maand})</span>
          <span className="val num">{eur(k.monthRevenue)}</span>
          <span className="cmp">
            {revDelta != null
              ? <><span className={`hkpi-delta ${revDelta >= 0 ? "up" : "down"}`}>{revDelta >= 0 ? "↑" : "↓"} {Math.abs(revDelta)}%</span> t.o.v. vorige maand</>
              : "Boekingen met check-in deze maand"}
          </span>
        </div>
        <div className="card hkpi">
          {k.rating != null ? (
            <>
              <span className="lbl">⭐ Gemiddelde beoordeling</span>
              <span className="val num">{String(k.rating).replace(".", ",")} / 5</span>
              <span className="cmp">Score op je verhuurkanalen</span>
            </>
          ) : (
            <>
              <span className="lbl">🗓️ Komende 8 weken</span>
              <span className="val num">{data.upcoming.length}</span>
              <span className="cmp">{data.upcoming.length === 1 ? "boeking gepland" : "boekingen gepland"}</span>
            </>
          )}
        </div>
      </div>

      <div className="oh-grid">
        <div className="oh-main">
          <div className="card oh-next">
            <div className="oh-card-head">
              <h3>{nbCurrent ? "Nu te gast" : "Eerstvolgende boeking"}</h3>
              <button className="home-link" onClick={() => nav("/kalender")}>Bekijk alle <Icon name="arrow" size={14} /></button>
            </div>
            {nb ? (
              <>
                <div className="oh-next-guest">
                  <span className="avat">{nb.avatar}</span>
                  <div>
                    <b>{nb.guest}</b><br />
                    <span>{dayLabel(nb.startDate)} – {dayLabel(nb.endDate)} {nb.endDate.slice(0, 4)} ({nb.nights} {nb.nights === 1 ? "nacht" : "nachten"})</span>
                  </div>
                  <span className="chip good" style={{ marginLeft: "auto" }}>{nbCurrent ? "Ingecheckt" : "Bevestigd"}</span>
                </div>
                <div className="oh-next-stats">
                  <div><b className="num">{nb.guests}</b><span>gasten</span></div>
                  <div><b>Check-in</b><span>{nb.checkInTime ? `vanaf ${nb.checkInTime}` : "—"}</span></div>
                  <div><b>Check-out</b><span>{nb.checkOutTime ? `tot ${nb.checkOutTime}` : "—"}</span></div>
                </div>
                <div className="oh-next-actions">
                  <button className="btn ghost sm" onClick={() => nav("/inbox")}>💬 Bericht sturen</button>
                  <button className="btn ghost sm" onClick={() => nav("/kalender")}>Boeking bekijken <Icon name="arrow" size={13} /></button>
                </div>
              </>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>Geen aankomende boekingen — de kalender is vrij.</p>
            )}
          </div>

          <div className="card oh-cal">
            <div className="oh-card-head">
              <h3>Kalender <small>(komende 8 weken)</small></h3>
              <button className="home-link" onClick={() => nav("/kalender")}>Bekijk kalender <Icon name="arrow" size={14} /></button>
            </div>
            <WeeksStrip bookings={data.upcoming} />
          </div>
        </div>

        <aside className="oh-rail">
          <div className="card rail-card">
            <h3>Snelle acties</h3>
            <button className="tmrw-row" onClick={() => nav("/kalender")}>
              <span className="tmrw-ico" style={{ background: "var(--coral-soft)" }}>📅</span>
              <span><b>Blokkade instellen</b><br /><small>Houd data vrij in je kalender</small></span>
              <span className="tmrw-go"><Icon name="chevR" size={15} /></span>
            </button>
            <button className="tmrw-row" onClick={meldOnderhoud}>
              <span className="tmrw-ico" style={{ background: "var(--booking-soft)" }}>🔧</span>
              <span><b>Onderhoud melden</b><br /><small>Laat het ons weten</small></span>
              <span className="tmrw-go"><Icon name="chevR" size={15} /></span>
            </button>
            <button className="tmrw-row" style={{ marginBottom: 0 }} onClick={() => nav("/opbrengsten")}>
              <span className="tmrw-ico" style={{ background: "var(--vrbo-soft)" }}>📄</span>
              <span><b>Documenten bekijken</b><br /><small>Opbrengsten en rapporten</small></span>
              <span className="tmrw-go"><Icon name="chevR" size={15} /></span>
            </button>
          </div>

          <div className="card rail-card oh-contact">
            <h3>Jouw contactpersoon</h3>
            <div className="oh-contact-row">
              <span className="avatar" style={{ width: 44, height: 44, fontSize: 17 }}>{data.contactName.slice(0, 1)}</span>
              <div>
                <b>{data.contactName} van Staybase</b><br />
                <small>Property manager</small>
              </div>
            </div>
            <div className="oh-contact-quote">Heb je een vraag? Ik denk graag met je mee!</div>
            <button className="btn ghost sm" style={{ width: "100%", justifyContent: "center" }}
              onClick={() => window.dispatchEvent(new Event("sb:open"))}>
              ✈️ Stuur een bericht
            </button>
            <small className="oh-contact-hours">Bereikbaar ma – za, 9:00 – 18:00</small>
          </div>

          <div className="card rail-card">
            <div className="oh-card-head" style={{ marginBottom: 10 }}>
              <h3>Recente berichten</h3>
              <button className="home-link sm" onClick={() => nav("/inbox")}>Bekijk alle <Icon name="arrow" size={13} /></button>
            </div>
            {data.recent.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Nog geen berichten voor dit pand.</p>}
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
        </aside>
      </div>

      <div className="oh-banner">
        <div>
          <b>Zorgeloos verhuren, meer genieten.</b>
          <span>Wij regelen de rest, zodat jij zorgeloos kunt genieten van jouw pand.</span>
        </div>
        <button className="btn ghost sm oh-banner-btn" onClick={() => nav("/kennis")}>
          Meer over onze service <Icon name="arrow" size={14} />
        </button>
      </div>
    </section>
  );
}
