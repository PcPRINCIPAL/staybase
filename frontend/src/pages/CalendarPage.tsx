import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DEMO_TODAY, type CalendarDay, type Property } from "@shared/types";
import { useCalendar, useCalendarOverview, useProperties } from "../lib/api";
import { CHANNEL_META, addMonths, eur, monthName, nightsBetween } from "../lib/format";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";

/** Compacte pandkaart in de lijst links — klikken selecteert het pand. */
function CalProp({ p, on, onSelect }: { p: Property; on: boolean; onSelect: () => void }) {
  return (
    <button className={`cal-prop ${on ? "on" : ""}`} onClick={onSelect} aria-pressed={on}>
      <span className="thumb" style={{ background: p.artBg }}>
        {p.photo ? <img src={p.photo} alt="" loading="lazy" /> : p.art}
      </span>
      <span className="cal-prop-txt">
        <b>{p.name}</b>
        <small>{p.location} · {p.bedrooms} slpk</small>
        <small className={p.status === "live" ? "dot-live" : "dot-off"}>
          {p.status === "live" ? "● live" : "◌ onboarding"}
        </small>
      </span>
    </button>
  );
}

/** Gantt-achtige tijdlijn: één rij per pand, boekingsbalken in kanaal-kleuren. */
function GanttView({ month, sort }: { month: string; sort: "name" | "occupancy" }) {
  const { data, isLoading } = useCalendarOverview(month);
  const nav = useNavigate();
  if (isLoading || !data) return <div className="loading">Tijdlijn laden…</div>;

  const rows = data.properties.slice().sort((a, b) =>
    sort === "occupancy"
      ? b.occupancyPct - a.occupancyPct || a.property.name.localeCompare(b.property.name, "nl")
      : a.property.name.localeCompare(b.property.name, "nl")
  );
  const dim = data.daysInMonth;
  const days = Array.from({ length: dim }, (_, i) => i + 1);
  const weekend = (d: number) => {
    const dow = new Date(`${month}-${String(d).padStart(2, "0")}T00:00:00Z`).getUTCDay();
    return dow === 0 || dow === 6;
  };
  const dayCls = (d: number) => `${weekend(d) ? "we" : ""} ${d === data.todayDay ? "today" : ""}`;

  return (
    <div className="card gantt">
      <div className="gantt-scroll">
        <div className="gantt-row head">
          <span className="gantt-name" />
          <div className="gantt-days head" style={{ gridTemplateColumns: `repeat(${dim}, 1fr)` }}>
            {days.map((d) => (
              <span key={d} className={`gantt-day num ${dayCls(d)}`}>{d}</span>
            ))}
          </div>
        </div>
        {rows.map((r) => (
          <div key={r.property.id} className="gantt-row">
            <button className="gantt-name" onClick={() => nav(`/pand/${r.property.id}`)} title={r.property.name}>
              <span className="thumb" style={{ background: r.property.artBg }}>
                {r.property.photo ? <img src={r.property.photo} alt="" loading="lazy" /> : r.property.art}
              </span>
              <span className="gantt-name-txt">
                <b>{r.property.name}</b>
                <small className="num">{r.occupancyPct}% bezet</small>
              </span>
            </button>
            <div className="gantt-days" style={{ gridTemplateColumns: `repeat(${dim}, 1fr)` }}>
              {days.map((d) => (
                <span key={d} className={`gantt-cell ${dayCls(d)}`} />
              ))}
              {r.bookings.map((b) => {
                // Verblijven wisselen halverwege de dag: de balk begint op de
                // middag van de check-in en stopt op de middag van de check-out,
                // geknipt op de maandgrenzen — zo sluiten opeenvolgende
                // boekingen netjes op elkaar aan (à la Guesty).
                const from = b.startDate.startsWith(month) ? Number(b.startDate.slice(8)) - 0.5 : 0;
                const to = b.endDate.startsWith(month) ? Number(b.endDate.slice(8)) - 0.5 : dim;
                if (to <= from) return null;
                return (
                  <span
                    key={b.id}
                    className={`gantt-bar ${b.channel}`}
                    style={{ left: `${(from / dim) * 100}%`, width: `${((to - from) / dim) * 100}%` }}
                    title={`${b.guest} · ${b.startDate} → ${b.endDate} · ${eur(b.payout)} via ${CHANNEL_META[b.channel].name}`}
                  >
                    {b.avatar} {b.guest}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="cal-legend" style={{ padding: "12px 16px" }}>
        <span><span className="dot" style={{ background: "var(--coral)" }} />Airbnb</span>
        <span><span className="dot" style={{ background: "var(--booking)" }} />Booking.com</span>
        <span><span className="dot" style={{ background: "var(--vrbo)" }} />VRBO</span>
      </div>
    </div>
  );
}

export function CalendarPage() {
  const [propertyId, setPropertyId] = useState("");
  const [month, setMonth] = useState(DEMO_TODAY.slice(0, 7));
  const [selected, setSelected] = useState<string>(DEMO_TODAY);
  const [view, setView] = useState<"maand" | "lijst">("maand");
  const [sort, setSort] = useState<"name" | "occupancy">("occupancy");
  const { data: rawProperties } = useProperties();
  const { data, isLoading } = useCalendar(view === "maand" ? propertyId : "", month);
  const toast = useToast();
  const nav = useNavigate();

  // Live panden bovenaan; binnen elke groep alfabetisch.
  const properties = (rawProperties ?? []).slice().sort((a, b) =>
    a.status === b.status ? a.name.localeCompare(b.name, "nl") : a.status === "live" ? -1 : 1
  );

  // Standaard het eerste (live) pand selecteren zodra de lijst binnen is.
  useEffect(() => {
    if (!propertyId && properties.length) setPropertyId(properties[0].id);
  }, [properties, propertyId]);

  const selDay: CalendarDay | null = data?.days.find((d) => d.date === selected) ?? null;
  const selBooking = selDay?.booking ? data?.bookings.find((b) => b.id === selDay.booking!.id) ?? null : null;

  // Geselecteerde periode: van check-in tot en met de uitcheckdag, geknipt op
  // de maand. Open uiteinden (boeking loopt de maand in/uit) krijgen geen
  // afgesloten rand — de rand volgt exact het gekleurde blok.
  let selFrom = 0;
  let selTo = -1;
  let selOpenStart = false;
  let selOpenEnd = false;
  if (selBooking && data) {
    selOpenStart = !selBooking.startDate.startsWith(month);
    selOpenEnd = !selBooking.endDate.startsWith(month);
    selFrom = selOpenStart ? 1 : Number(selBooking.startDate.slice(8));
    selTo = selOpenEnd ? data.days.length : Number(selBooking.endDate.slice(8));
  }

  // Bezetting van het getoonde pand in de getoonde maand (nachten met boeking).
  const bezet = view === "maand" && data
    ? Math.round((data.days.filter((d) => d.booking).length / data.days.length) * 100)
    : null;

  const monthNav = (
    <div className="cal-head">
      <button className="icon-btn" aria-label="Vorige maand" onClick={() => setMonth((m) => addMonths(m, -1))}>
        <Icon name="chevL" />
      </button>
      <span className="cal-month">{monthName(month)[0].toUpperCase() + monthName(month).slice(1)} {month.slice(0, 4)}</span>
      <button className="icon-btn" aria-label="Volgende maand" onClick={() => setMonth((m) => addMonths(m, 1))}>
        <Icon name="chevR" />
      </button>
      {bezet != null && (
        <span className="chip coral num" style={{ marginLeft: "auto" }}>{bezet}% bezet</span>
      )}
    </div>
  );

  return (
    <section className="page cal-page">
      <div className="page-head">
        <div>
          <h1>Kalender</h1>
          <p className="sub">Alle kanalen in één overzicht — Airbnb, Booking.com en VRBO synchroniseren automatisch.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {view === "lijst" && (
            <div className="seg" role="tablist" aria-label="Sorteren">
              {([["occupancy", "Bezetting"], ["name", "Naam"]] as const).map(([v, label]) => (
                <button key={v} role="tab" aria-selected={sort === v} className={sort === v ? "on" : ""} onClick={() => setSort(v)}>
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="seg" role="tablist" aria-label="Weergave">
            {([["maand", "Maand"], ["lijst", "Lijst"]] as const).map(([v, label]) => (
              <button key={v} role="tab" aria-selected={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "lijst" && (
        <div style={{ marginTop: 16 }}>
          {monthNav}
          <GanttView month={month} sort={sort} />
        </div>
      )}

      {view === "maand" && (
      <div className="cal-layout">
        <aside className="cal-props">
          {properties.map((p) => (
            <CalProp key={p.id} p={p} on={p.id === propertyId}
              onSelect={() => { setPropertyId(p.id); setSelected(""); }} />
          ))}
        </aside>

        <div className="cal-main">
          {monthNav}
          <div className="card cal">
          <div className="cal-days">
            {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="cal-cells">
            {Array.from({ length: data?.leadingBlanks ?? 0 }).map((_, i) => (
              <div className="cell blank" key={"b" + i} />
            ))}
            {isLoading && <div className="loading" style={{ gridColumn: "1 / -1" }}>Kalender laden…</div>}
            {data?.days.map((d) => {
              // b = de boeking van deze nácht; ending = de boeking die deze
              // ochtend uitcheckt. Op een wisseldag zijn dat er twee: het oude
              // blok eindigt links in de cel, het nieuwe start rechts.
              const b = d.booking;
              const ending = data.bookings.find((x) => x.endDate === d.date) ?? null;
              // De gastnaam mag doorlopen over de volgende dagen van hetzelfde
              // blok (binnen deze weekrij), zodat hij niet afkapt op dag één.
              let guestSpan = 1;
              if (b?.isStart) {
                const full = data.bookings.find((x) => x.id === b.id);
                const endDay = full && full.endDate.startsWith(month) ? Number(full.endDate.slice(8)) : data.days.length + 1;
                guestSpan = Math.max(1, Math.min(endDay - d.day, 7 - d.weekday));
              }
              const inPeriod = Boolean(selBooking) && d.day >= selFrom && d.day <= selTo;
              const cls = [
                "cell",
                ending || (b && !b.isStart) ? "ink-inv" : "",
                ending ? "has-end" : "",
                b ? "has-cover" : "",
                d.today ? "today" : "",
                d.date === selected && !selBooking ? "sel" : "",
              ].filter(Boolean).join(" ");
              return (
                <button key={d.date} className={cls} onClick={() => setSelected(d.date)} aria-label={`${d.day} ${data.monthLabel}`}>
                  {ending && <span className={`bseg bseg-end ${ending.channel}`} />}
                  {b && <span className={`bseg bseg-cover ${b.channel} ${b.isStart ? "from-mid" : "full"}`} />}
                  {inPeriod && (
                    <span className={`period-ring ${d.day === selFrom && !selOpenStart ? "first" : ""} ${d.day === selTo && !selOpenEnd ? "last" : ""}`} />
                  )}
                  <span className="d num">{d.day}</span>
                  {!b && d.price != null && (
                    <span className={`p num ${d.suggested ? "sug" : ""}`}>
                      € {d.suggested ?? d.price}{d.suggested ? " ✨" : ""}
                    </span>
                  )}
                  {d.cleaning && <span className="clean">🧽</span>}
                  {b?.isStart && (
                    <span
                      className="guest mid"
                      style={{ width: `calc(${guestSpan * 100}% + ${(guestSpan - 1) * 4}px - 50% - 18px)` }}
                    >
                      {b.guest}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="cal-legend">
            <span><span className="dot" style={{ background: "var(--coral)" }} />Airbnb</span>
            <span><span className="dot" style={{ background: "var(--booking)" }} />Booking.com</span>
            <span><span className="dot" style={{ background: "var(--vrbo)" }} />VRBO</span>
            <span><span className="dot" style={{ background: "var(--soft)", border: "1px solid var(--line)" }} />Vrij</span>
            <span>🧽 wisseldag met schoonmaak</span>
          </div>
        </div>
        </div>

        <aside className="card cal-panel">
          {selBooking ? (
            <>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span className="avat">{selBooking.avatar}</span>
                <div>
                  <b style={{ fontSize: 16 }}>{selBooking.guest}</b><br />
                  <span className={`chip ${CHANNEL_META[selBooking.channel].chip}`}>
                    {CHANNEL_META[selBooking.channel].name}
                  </span>
                </div>
              </div>
              <dl>
                <dt>Check-in</dt>
                <dd className="num">
                  {Number(selBooking.startDate.slice(8))} {monthName(selBooking.startDate).slice(0, 3)}{selBooking.checkInTime ? ` · ${selBooking.checkInTime}` : ""}
                </dd>
                <dt>Check-out</dt>
                <dd className="num">
                  {Number(selBooking.endDate.slice(8))} {monthName(selBooking.endDate).slice(0, 3)}{selBooking.checkOutTime ? ` · ${selBooking.checkOutTime}` : ""}
                </dd>
                <dt>Nachten</dt><dd className="num">{nightsBetween(selBooking.startDate, selBooking.endDate)}</dd>
                <dt>Gasten</dt><dd className="num">{selBooking.guests}</dd>
                <dt>Jouw uitbetaling</dt><dd className="num">{eur(selBooking.payout)}</dd>
              </dl>
              {selBooking.note && (
                <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>💡 {selBooking.note}</p>
              )}
              <button
                className="btn ghost sm"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => nav("/inbox")}
              >
                💬 Stuur een bericht
              </button>
            </>
          ) : selDay ? (
            <>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span className="avat">🌤️</span>
                <div>
                  <b style={{ fontSize: 16 }}>{selDay.day} {data?.monthLabel.split(" ")[0].toLowerCase()} — vrij</b><br />
                  <span className="chip gray">Nog boekbaar</span>
                </div>
              </div>
              <dl>
                <dt>Huidige nachtprijs</dt><dd className="num">€ {selDay.price}</dd>
              </dl>
              {selDay.suggested ? (
                <>
                  <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
                    ✨ Staybase stelt <b>€ {selDay.suggested}</b> voor: laatste vrije nachten tussen twee boekingen.
                    Zo verdrievoudigt de kans op een last-minute boeking.
                  </p>
                  <button className="btn coral sm" style={{ width: "100%", justifyContent: "center" }} onClick={() => nav("/prijzen")}>
                    Bekijk het voorstel
                  </button>
                </>
              ) : (
                <p style={{ fontSize: 13, color: "var(--muted)" }}>
                  De prijs volgt automatisch de vraag in Knokke. Wil je een vaste prijs? Pas hem hier gewoon aan.
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: 13.5, color: "var(--muted)" }}>
              Klik op een dag om de boeking of prijs te bekijken. 👈
            </p>
          )}
          {selDay && !selBooking && !selDay.suggested && selDay.price == null && (
            <button className="btn ghost sm" onClick={() => toast("Demo")} style={{ display: "none" }} />
          )}
        </aside>
      </div>
      )}
    </section>
  );
}
