import { useNavigate } from "react-router-dom";
import { useOverview } from "../lib/api";
import { eur } from "../lib/format";
import { Icon } from "../components/Icon";
import { useUI } from "../ui";

export function Dashboard() {
  const { data, isLoading } = useOverview();
  const nav = useNavigate();
  const { openWizard } = useUI();

  if (isLoading || !data) return <div className="loading">Dashboard laden…</div>;

  const att = data.attention;
  const attCards = [
    att.inboxDrafts > 0 && {
      icon: "💬", bg: "var(--coral-soft)", to: "/inbox",
      title: `${att.inboxDrafts} ${att.inboxDrafts === 1 ? "bericht wacht" : "berichten wachten"} op jou`,
      sub: "Gastenvragen — jij keurt goed, Staybase verstuurt",
    },
    att.priceOpen > 0 && {
      icon: "🏷️", bg: "var(--good-soft)", to: "/prijzen",
      title: `${att.priceOpen} ${att.priceOpen === 1 ? "prijsvoorstel" : "prijsvoorstellen"}`,
      sub: "Villa Zeewind — o.a. de zeilwedstrijd in augustus",
    },
    att.cleaningPending > 0 && {
      icon: "🧽", bg: "var(--booking-soft)", to: "/schoonmaak",
      title: `${att.cleaningPending} poetsbeurt te bevestigen`,
      sub: "Za 25 juli — Sparkle Coast staat klaar (€ 95)",
    },
  ].filter(Boolean) as { icon: string; bg: string; to: string; title: string; sub: string }[];

  return (
    <section className="page">
      <h1>Dag {data.greetingName} 👋</h1>
      <p className="sub">
        {data.dateLabel} · {attCards.length > 0
          ? `Alles draait — ${attCards.length === 1 ? "1 ding wacht" : attCards.length + " dingen wachten"} even op jou.`
          : "Alles draait — niets wacht op jou. 🎉"}
      </p>

      {attCards.length > 0 && (
        <div className="attn">
          {attCards.map((c) => (
            <button key={c.to} className="attn-card" onClick={() => nav(c.to)}>
              <span className="attn-ico" style={{ background: c.bg }}>{c.icon}</span>
              <span>
                <b>{c.title}</b>
                <span>{c.sub}</span>
              </span>
              <span className="go"><Icon name="arrow" /></span>
            </button>
          ))}
        </div>
      )}

      <h2 className="sec-title"><span className="em">📈</span> Deze maand</h2>
      <div className="kpis">
        <div className="card kpi">
          <span className="lbl">Bezetting juli</span>
          <span className="val num">{data.kpis.occupancyPct}%</span>
          <span className="cmp"><b>+9%</b> t.o.v. juli 2025</span>
        </div>
        <div className="card kpi">
          <span className="lbl">Opbrengsten juli</span>
          <span className="val num">{eur(data.kpis.monthRevenue)}</span>
          <span className="cmp"><b>+18%</b> t.o.v. vorig jaar</span>
        </div>
        <div className="card kpi">
          <span className="lbl">Gemiddelde nachtprijs</span>
          <span className="val num">{eur(data.kpis.avgNight)}</span>
          <span className="cmp">536 gelijkaardige verblijven in Knokke: € 259</span>
        </div>
        <div className="card kpi">
          <span className="lbl">Reactietijd op gasten</span>
          <span className="val num">{data.kpis.responseMinutes} min</span>
          <span className="cmp">Sneller dan 95% van de hosts aan de kust 🏆</span>
        </div>
      </div>

      <h2 className="sec-title"><span className="em">🗓️</span> Vandaag op de planning</h2>
      <div className="today-grid">
        <div className="card tl">
          {data.timeline.map((t, i) => (
            <div className="tl-row" key={i}>
              <span className="tl-time num">{t.time}</span>
              <span className="tl-ico" style={{ background: t.iconBg }}>{t.icon}</span>
              <span>
                <b>{t.title}</b>
                <span>{t.subtitle}</span>
              </span>
              <span className={`chip ${t.chip.tone}`}>{t.chip.label}</span>
            </div>
          ))}
        </div>
        <div className="card resp-card">
          <span className="kpi lbl" style={{ padding: 0, fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)" }}>
            Staybase nam deze week over
          </span>
          <span className="big num">{data.tasksThisWeek.total} taken</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: "82%" }} /></div>
          <span style={{ fontSize: 13.5, color: "var(--muted)" }}>{data.tasksThisWeek.detail}</span>
        </div>
      </div>

      <h2 className="sec-title"><span className="em">🏡</span> Jouw panden</h2>
      <div className="props">
        {data.properties.map((p) => (
          <article className="prop" key={p.id}>
            <div className="prop-art" style={{ background: p.artBg }}>{p.art}</div>
            <div className="prop-body">
              <div className="name">
                {p.name}
                {p.rating != null && <span className="rate">★ {p.rating.toFixed(2).replace(".", ",")}</span>}
              </div>
              <div className="loc">
                {p.location} · {p.bedrooms} slpk · {p.type === "Villa" ? "zwembad" : p.bathrooms + " badk."}
              </div>
              <span className={`chip ${p.status === "live" ? "coral" : "warn"}`}>{p.statusLabel}</span>
            </div>
          </article>
        ))}
        <button className="prop-add" onClick={openWizard}>
          <span className="plus"><Icon name="plus" /></span>
          Pand toevoegen
          <small>Binnen 7 dagen online</small>
        </button>
      </div>
    </section>
  );
}
