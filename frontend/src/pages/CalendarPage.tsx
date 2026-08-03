import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DEMO_TODAY, type CalendarDay } from "@shared/types";
import { useCalendar, useOverview } from "../lib/api";
import { CHANNEL_META, addMonths, eur, nightsBetween } from "../lib/format";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";

export function CalendarPage() {
  const [propertyId, setPropertyId] = useState("villa-zeewind");
  const [month, setMonth] = useState(DEMO_TODAY.slice(0, 7));
  const [selected, setSelected] = useState<string>(DEMO_TODAY);
  const { data: overview } = useOverview();
  const { data, isLoading } = useCalendar(propertyId, month);
  const toast = useToast();
  const nav = useNavigate();

  const liveProps = useMemo(
    () => (overview?.properties ?? []).filter((p) => p.status === "live"),
    [overview]
  );

  const selDay: CalendarDay | null = data?.days.find((d) => d.date === selected) ?? null;
  const selBooking = selDay?.booking ? data?.bookings.find((b) => b.id === selDay.booking!.id) ?? null : null;

  return (
    <section className="page">
      <h1>Kalender</h1>
      <p className="sub">Alle kanalen in één overzicht — Airbnb, Booking.com en VRBO synchroniseren automatisch.</p>

      <div className="cal-head">
        <button className="icon-btn" aria-label="Vorige maand" onClick={() => setMonth((m) => addMonths(m, -1))}>
          <Icon name="chevL" />
        </button>
        <span className="cal-month">{data?.monthLabel ?? "…"}</span>
        <button className="icon-btn" aria-label="Volgende maand" onClick={() => setMonth((m) => addMonths(m, 1))}>
          <Icon name="chevR" />
        </button>
        <div className="prop-tabs">
          {liveProps.map((p) => (
            <button
              key={p.id}
              className={`prop-tab ${p.id === propertyId ? "on" : ""}`}
              onClick={() => { setPropertyId(p.id); setSelected(""); }}
            >
              {p.art} {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="cal-grid-wrap">
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
              const b = d.booking;
              const cls = [
                "cell",
                b ? `bk ${CHANNEL_META[data.bookings.find((x) => x.id === b.id)!.channel].cellClass}` : "",
                b?.isStart ? "r-start" : "",
                b?.isEnd ? "r-end" : "",
                d.today ? "today" : "",
                d.date === selected ? "sel" : "",
              ].filter(Boolean).join(" ");
              return (
                <button key={d.date} className={cls} onClick={() => setSelected(d.date)} aria-label={`${d.day} ${data.monthLabel}`}>
                  <span className="d num">{d.day}</span>
                  {!b && d.price != null && (
                    <span className={`p num ${d.suggested ? "sug" : ""}`}>
                      € {d.suggested ?? d.price}{d.suggested ? " ✨" : ""}
                    </span>
                  )}
                  {d.cleaning && <span className="clean">🧽</span>}
                  {b?.isStart && <span className="guest">{b.guest}</span>}
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
                <dt>Verblijf</dt>
                <dd className="num">{Number(selBooking.startDate.slice(8))} – {Number(selBooking.endDate.slice(8))} {data?.monthLabel.split(" ")[0].toLowerCase()}</dd>
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
    </section>
  );
}
