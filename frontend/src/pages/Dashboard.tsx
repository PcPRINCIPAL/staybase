import { useNavigate } from "react-router-dom";
import { DEMO_TODAY } from "@shared/types";
import { useOverview } from "../lib/api";
import { eur, monthName } from "../lib/format";
import { Icon } from "../components/Icon";
import { PropertyCard } from "../components/PropertyCard";
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
          <span className="lbl">Bezetting {monthName(DEMO_TODAY)}</span>
          <span className="val num">{data.kpis.occupancyPct}%</span>
          <span className="cmp">Over alle live panden</span>
        </div>
        <div className="card kpi">
          <span className="lbl">Opbrengsten {monthName(DEMO_TODAY)}</span>
          <span className="val num">{eur(data.kpis.monthRevenue)}</span>
          <span className="cmp">Boekingen met check-in deze maand</span>
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
          {data.timeline.length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: 14, padding: "16px 18px", margin: 0 }}>
              Geen check-ins, check-outs of poetsbeurten vandaag — een rustige dag. 🌤️
            </p>
          )}
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
          <PropertyCard key={p.id} p={p} />
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
