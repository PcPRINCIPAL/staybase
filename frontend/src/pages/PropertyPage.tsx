import { Link, useNavigate, useParams } from "react-router-dom";
import { usePropertyDetail } from "../lib/api";
import { CHANNEL_META, eur, monthName, nightsBetween, shortDate } from "../lib/format";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { useT } from "../i18n";

function datum(iso: string) {
  return shortDate(iso);
}

export function PropertyPage() {
  const t = useT();
  const { id } = useParams();
  const { data, isLoading, isError } = usePropertyDetail(id);
  const nav = useNavigate();
  const toast = useToast();

  if (isLoading) return <div className="loading">{t("prop.loading")}</div>;
  if (isError || !data) {
    return (
      <div className="loading">
        {t("prop.notFound")} <Link to="/" style={{ color: "var(--coral-deep)", fontWeight: 700 }}>{t("prop.backOverview")}</Link>
      </div>
    );
  }

  const { property: p, kpis, upcomingBookings, cleanings, suggestions, revenueByChannel } = data;
  const geplandeSchoonmaak = cleanings.filter((c) => c.status !== "done");
  const afgerond = cleanings.filter((c) => c.status === "done");

  return (
    <section className="page">
      <Link to="/" className="pand-terug">{t("prop.back")}</Link>

      <div className="pand-hero">
        {p.photo ? (
          <img src={p.photo} alt={p.name} decoding="async" />
        ) : (
          <div className="pand-hero-leeg" style={{ background: p.artBg }}>{p.art}</div>
        )}
        <div className="pand-hero-ov">
          <span className={`chip ${p.status === "live" ? "coral" : "warn"}`}>{p.statusLabel}</span>
          <h1>{p.name}</h1>
          <p>{t("prop.meta", { loc: p.location, type: p.type, s: p.bedrooms, b: p.bathrooms, g: p.maxGuests, m: p.areaM2 })}</p>
        </div>
        {p.rating != null && (
          <span className="pand-rating">★ {p.rating.toFixed(2).replace(".", ",")}</span>
        )}
      </div>

      <div className="pand-grid">
        <div>
          {p.description && (
            <div className="card pand-blok">
              <h2>{t("prop.about")}</h2>
              <p className="pand-tekst">{p.description}</p>
              <div className="pand-kanalen">
                {p.channels.map((c) => (
                  <span className={`chip ${CHANNEL_META[c].chip}`} key={c}>{CHANNEL_META[c].name}</span>
                ))}
                <span className="chip gray">{t("prop.cleaningChip", { p: eur(p.cleaningPrice) })}</span>
              </div>
            </div>
          )}

          <h2 className="sec-title"><span className="em">🗓️</span> {t("prop.upcoming")}</h2>
          <div className="card">
            {upcomingBookings.length === 0 && (
              <p className="pand-leeg">Nog geen boekingen ingepland voor dit pand.</p>
            )}
            {upcomingBookings.map((b) => (
              <div className="clean-row" key={b.id}>
                <span className="date">
                  <b className="num">{Number(b.startDate.slice(8))}</b>
                  <span>{monthName(b.startDate).slice(0, 3)}</span>
                </span>
                <span className="who">
                  <b>{b.avatar} {b.guest}</b>
                  <span>
                    {datum(b.startDate)} → {datum(b.endDate)} · {nightsBetween(b.startDate, b.endDate)} nachten · {b.guests} gasten
                  </span>
                </span>
                <span className="end">
                  <span className={`chip ${CHANNEL_META[b.channel].chip}`}>{CHANNEL_META[b.channel].name}</span>
                  <b className="num">{eur(b.payout)}</b>
                </span>
              </div>
            ))}
          </div>

          <h2 className="sec-title"><span className="em">🧽</span> {t("prop.cleaning")}</h2>
          <div className="card">
            {cleanings.length === 0 && <p className="pand-leeg">Nog geen poetsbeurten gepland.</p>}
            {[...geplandeSchoonmaak, ...afgerond].map((c) => (
              <div className="clean-row" key={c.id}>
                <span className="date">
                  <b className="num">{c.dateLabel}</b>
                  <span>{c.dowLabel}</span>
                </span>
                <span className="who">
                  <b>{c.team}</b>
                  <span>{c.timeLabel ?? c.statusNote ?? (c.photos ? `${c.photos} foto's na afloop` : "—")}</span>
                </span>
                <span className="end">
                  {c.status === "done"
                    ? <span className="chip good">🤖 {c.aiCheck}</span>
                    : c.status === "confirmed"
                      ? <span className="chip good">{t("clean.chipConfirmed")}</span>
                      : c.status === "pending_owner"
                        ? <span className="chip warn">{t("clean.chipWaitYou")}</span>
                        : <span className="chip gray">{t("prop.requested")}</span>}
                  <b className="num">{eur(c.price)}</b>
                </span>
              </div>
            ))}
          </div>
        </div>

        <aside className="pand-zij">
          <div className="card pand-kpis">
            <div>
              <span className="lbl">{t("prop.kpi.revenueYear")}</span>
              <b className="num">{eur(kpis.revenueYear)}</b>
            </div>
            <div>
              <span className="lbl">{t("prop.kpi.occupancy")}</span>
              <b className="num">{kpis.occupancyPct}%</b>
            </div>
            <div>
              <span className="lbl">{t("prop.kpi.adr")}</span>
              <b className="num">{kpis.avgNight ? eur(kpis.avgNight) : "—"}</b>
            </div>
            <div>
              <span className="lbl">{t("prop.kpi.bookings")}</span>
              <b className="num">{t("prop.kpi.nights", { b: kpis.bookingsYear, n: kpis.nightsBooked })}</b>
            </div>
          </div>

          {revenueByChannel.length > 0 && (
            <div className="card pand-blok">
              <h2>{t("prop.perChannel")}</h2>
              {revenueByChannel.map((c) => (
                <div className="split-row" key={c.channel}>
                  <span className="dot" style={{ background: CHANNEL_META[c.channel].color }} />
                  {c.label}
                  <b className="num">{eur(c.amount)} · {c.pct}%</b>
                </div>
              ))}
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="card pand-blok">
              <h2>{t("prop.openSuggestions")}</h2>
              {suggestions.map((s) => (
                <div className="pand-sug" key={s.id}>
                  <div>
                    <b>{s.rangeLabel}</b>
                    <span>{s.dowLabel}</span>
                  </div>
                  <span className={`num ${s.priceTo > s.priceFrom ? "op" : "neer"}`}>
                    € {s.priceTo} {s.priceTo > s.priceFrom ? "▲" : "▼"}
                  </span>
                </div>
              ))}
              <button className="btn primary sm" style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
                onClick={() => nav("/prijzen")}>
                {t("prop.viewSuggestions")}
              </button>
            </div>
          )}

          <div className="card pand-blok">
            <h2>{t("prop.quick")}</h2>
            <div className="pand-acties">
              <button className="btn ghost sm" onClick={() => nav("/kalender")}><Icon name="calendar" /> {t("prop.quickCal")}</button>
              <button className="btn ghost sm" onClick={() => nav("/inbox")}><Icon name="chat" /> {t("prop.quickInbox")}</button>
              <button className="btn ghost sm" onClick={() => toast(t("prop.editDemo"))}>
                {t("prop.quickEdit")}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
