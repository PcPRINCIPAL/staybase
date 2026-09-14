import { useCleanings, useConfirmCleaning, useOverview } from "../lib/api";
import { eur } from "../lib/format";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { useBrand, useView } from "../components/OriginGate";
import { useT, type TFn } from "../i18n";
import { BRAND_LABEL } from "@shared/types";
import type { Cleaning } from "@shared/types";

function statusEnd(c: Cleaning, onConfirm: (id: string) => void, busy: boolean, t: TFn) {
  switch (c.status) {
    case "confirmed":
      return <span className="chip good">{t("clean.chipConfirmed")}</span>;
    case "pending_owner":
      return (
        <>
          <span className="chip warn">{t("clean.chipWaitYou")}</span>
          <button className="btn primary sm" disabled={busy} onClick={() => onConfirm(c.id)}>
            {t("clean.confirm", { p: eur(c.price) })}
          </button>
        </>
      );
    case "awaiting_team":
      return <span className="chip gray">⏱ {c.statusNote}</span>;
    case "done":
      return <span className="chip good">{t("clean.aiCheck", { v: c.aiCheck ?? "" })}</span>;
  }
}

export function CleaningPage() {
  const platform = useView();
  const t = useT();
  const brand = BRAND_LABEL[useBrand()];
  const { data: cleanings, isLoading } = useCleanings();
  const { data: overview } = useOverview();
  const confirm = useConfirmCleaning();
  const toast = useToast();

  if (isLoading || !cleanings) return <div className="loading">{t("clean.loading")}</div>;

  const planned = cleanings.filter((c) => c.status !== "done");
  const done = [...cleanings.filter((c) => c.status === "done")].reverse();
  const liveProps = (overview?.properties ?? []).filter((p) => p.status === "live");

  const onConfirm = (id: string) => {
    confirm.mutate([id], { onSuccess: () => toast(t("clean.confirmToast")) });
  };

  return (
    <section className="page">
      <h1>{t("clean.title")}</h1>
      <p className="sub">
        {platform.cleaningDetails
          ? t("clean.sub", { brand })
          : t("clean.subLinnois")}
      </p>

      {platform.cleaningDetails && (
      <div className="card waterfall" style={{ marginTop: 24 }}>
        <div className="wf-step">
          <span className="em">👋</span>
          <b>{t("clean.wf1")}</b>
          <span>{t("clean.wf1p")}</span>
        </div>
        <div className="wf-arrow"><Icon name="arrow" /></div>
        <div className="wf-step">
          <span className="em">⏱️</span>
          <b>{t("clean.wf2")}</b>
          <span>{t("clean.wf2p", { brand })}</span>
        </div>
        <div className="wf-arrow"><Icon name="arrow" /></div>
        <div className="wf-step">
          <span className="em">🧽</span>
          <b>{t("clean.wf3")}</b>
          <span>{t("clean.wf3p")}</span>
        </div>
      </div>
      )}

      <h2 className="sec-title"><span className="em">📋</span> {t("clean.planned")}</h2>
      <div className="card">
        {planned.map((c) => (
          <div className="clean-row" key={c.id}>
            <span className="date">
              <b className="num">{c.dateLabel}</b>
              <span>{c.dowLabel}</span>
            </span>
            <span className="who">
              <b>{c.propertyName}{c.timeLabel ? ` · ${c.timeLabel}` : ""}</b>
              <span>{platform.cleaningDetails
                ? `${c.team}${c.statusNote && c.status !== "awaiting_team" ? ` · ${c.statusNote}` : ""}`
                : t("clean.scheduled")}</span>
            </span>
            <span className="end">
              {platform.cleaningDetails
                ? statusEnd(c, onConfirm, confirm.isPending, t)
                : <span className="chip good">{t("clean.chipScheduled")}</span>}
            </span>
          </div>
        ))}
      </div>

      <h2 className="sec-title"><span className="em">✅</span> {t("clean.done")}</h2>
      <div className="card">
        {done.map((c) => (
          <div className="clean-row" key={c.id}>
            <span className="date">
              <b className="num">{c.dateLabel}</b>
              <span>{c.dowLabel}</span>
            </span>
            <span className="who">
              <b>{c.propertyName}</b>
              <span>{platform.cleaningDetails ? t("clean.photos", { team: c.team, n: c.photos ?? 0 }) : t("clean.executed")}</span>
            </span>
            <span className="end">
              {platform.cleaningDetails ? (
                <>
                  {statusEnd(c, onConfirm, confirm.isPending, t)}
                  <button className="btn ghost sm" onClick={() => toast(t("clean.photosDemo"))}>
                    {t("clean.viewPhotos")}
                  </button>
                </>
              ) : <span className="chip good">{t("clean.chipDone")}</span>}
            </span>
          </div>
        ))}
      </div>

      {platform.cleaningDetails && (<>
      <h2 className="sec-title"><span className="em">💶</span> {t("clean.priceTitle")}</h2>
      <div className="card" style={{ padding: "18px 20px", fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
        {t("clean.priceBody")}<br />
        {liveProps.map((p, i) => (
          <span key={p.id}>
            {i > 0 && <> &nbsp;·&nbsp; </>}
            <b style={{ color: "var(--ink)" }}>{p.name}</b> ({p.areaM2} m²) → <b style={{ color: "var(--ink)" }} className="num">{eur(p.cleaningPrice)}</b> {t("clean.perClean")}
          </span>
        ))}
      </div>
      </>)}
    </section>
  );
}
