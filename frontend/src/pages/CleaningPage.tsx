import { useCleanings, useConfirmCleaning, useOverview } from "../lib/api";
import { eur } from "../lib/format";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import type { Cleaning } from "@shared/types";

function statusEnd(c: Cleaning, onConfirm: (id: string) => void, busy: boolean) {
  switch (c.status) {
    case "confirmed":
      return <span className="chip good">✓ Bevestigd</span>;
    case "pending_owner":
      return (
        <>
          <span className="chip warn">Wacht op jou</span>
          <button className="btn primary sm" disabled={busy} onClick={() => onConfirm(c.id)}>
            Bevestig · {eur(c.price)}
          </button>
        </>
      );
    case "awaiting_team":
      return <span className="chip gray">⏱ {c.statusNote}</span>;
    case "done":
      return <span className="chip good">🤖 AI-fotocheck: {c.aiCheck}</span>;
  }
}

export function CleaningPage() {
  const { data: cleanings, isLoading } = useCleanings();
  const { data: overview } = useOverview();
  const confirm = useConfirmCleaning();
  const toast = useToast();

  if (isLoading || !cleanings) return <div className="loading">Schoonmaak laden…</div>;

  const planned = cleanings.filter((c) => c.status !== "done");
  const done = [...cleanings.filter((c) => c.status === "done")].reverse();
  const liveProps = (overview?.properties ?? []).filter((p) => p.status === "live");

  const onConfirm = (id: string) => {
    confirm.mutate([id], { onSuccess: () => toast("Sparkle Coast bevestigd voor za 25 juli ✓") });
  };

  return (
    <section className="page">
      <h1>Schoonmaak</h1>
      <p className="sub">Na elke check-out plant Staybase automatisch een poetsbeurt in. Jij hoeft niets te doen.</p>

      <div className="card waterfall" style={{ marginTop: 24 }}>
        <div className="wf-step">
          <span className="em">👋</span>
          <b>1 · Jouw eigen team eerst</b>
          <span>Rosa krijgt automatisch de vraag na elke check-out</span>
        </div>
        <div className="wf-arrow"><Icon name="arrow" /></div>
        <div className="wf-step">
          <span className="em">⏱️</span>
          <b>2 · Geen antwoord in 4 uur?</b>
          <span>Staybase schakelt vanzelf door</span>
        </div>
        <div className="wf-arrow"><Icon name="arrow" /></div>
        <div className="wf-step">
          <span className="em">🧽</span>
          <b>3 · De marktplaats neemt over</b>
          <span>Gescreende teams, faire prijs op basis van je pand</span>
        </div>
      </div>

      <h2 className="sec-title"><span className="em">📋</span> Geplande beurten</h2>
      <div className="card">
        {planned.map((c) => (
          <div className="clean-row" key={c.id}>
            <span className="date">
              <b className="num">{c.dateLabel}</b>
              <span>{c.dowLabel}</span>
            </span>
            <span className="who">
              <b>{c.propertyName}{c.timeLabel ? ` · ${c.timeLabel}` : ""}</b>
              <span>{c.team}{c.statusNote && c.status !== "awaiting_team" ? ` · ${c.statusNote}` : ""}</span>
            </span>
            <span className="end">{statusEnd(c, onConfirm, confirm.isPending)}</span>
          </div>
        ))}
      </div>

      <h2 className="sec-title"><span className="em">✅</span> Afgerond</h2>
      <div className="card">
        {done.map((c) => (
          <div className="clean-row" key={c.id}>
            <span className="date">
              <b className="num">{c.dateLabel}</b>
              <span>{c.dowLabel}</span>
            </span>
            <span className="who">
              <b>{c.propertyName}</b>
              <span>{c.team} · {c.photos} foto's na afloop</span>
            </span>
            <span className="end">
              {statusEnd(c, onConfirm, confirm.isPending)}
              <button className="btn ghost sm" onClick={() => toast("Foto's openen — in een volgende fase zie je hier alle foto's")}>
                Bekijk foto's
              </button>
            </span>
          </div>
        ))}
      </div>

      <h2 className="sec-title"><span className="em">💶</span> Hoe de prijs bepaald wordt</h2>
      <div className="card" style={{ padding: "18px 20px", fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
        Eén faire, vaste prijs per pand — berekend op oppervlakte en uitrusting, geen verrassingen.<br />
        {liveProps.map((p, i) => (
          <span key={p.id}>
            {i > 0 && <> &nbsp;·&nbsp; </>}
            <b style={{ color: "var(--ink)" }}>{p.name}</b> ({p.areaM2} m²) → <b style={{ color: "var(--ink)" }} className="num">{eur(p.cleaningPrice)}</b> per beurt
          </span>
        ))}
      </div>
    </section>
  );
}
