import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "../i18n";

/**
 * Waarde-calculator uit de klantschets — bewust uitgedund (feedback 17/09):
 * drie invoervelden (nachtprijs, bezetting, hoe je vandaag beheert) en een
 * compact resultaat. Aantal panden en regio rekenen mee met stille
 * standaardwaarden (1 pand, Belgische kust); de pills, persona-tekst en
 * formule-tip zijn geschrapt.
 *
 * Eén afwijking t.o.v. de schets: daar rekende de JS met €49/pand voor Host,
 * terwijl de prijssectie €59 toont. Beide prijzen staan hier nu in PLANNEN,
 * afgestemd op de gepubliceerde prijzen — één bron voor de hele pagina.
 */

const PLANNEN = {
  host: { basis: 59, naam: "Host" },
  craft: { basis: 99, naam: "Craft" },
} as const;

/** Volumekorting: −10% vanaf 5 panden, −15% vanaf 10. */
function maandprijs(panden: number, craft: boolean): number {
  const basis = craft ? PLANNEN.craft.basis : PLANNEN.host.basis;
  const factor = panden >= 10 ? 0.85 : panden >= 5 ? 0.9 : 1;
  return Math.round(basis * factor * 100) / 100;
}

const LOCATIE_FACTOR: Record<string, number> = {
  "belgische-kust": 1.18,
  ardennen: 1.21,
  stad: 1.15,
  andere: 1.17,
};

interface Invoer {
  panden: number;
  tarief: number;
  bezetting: number;
  situatie: "zelf" | "agentschap";
  locatie: string;
}

function bereken(v: Invoer) {
  const huidigeOmzet = v.panden * (v.tarief * 365 * (v.bezetting / 100));
  const factor = LOCATIE_FACTOR[v.locatie] ?? 1.17;
  const optimaalTarief = v.tarief * factor;
  const bezettingsWinst = v.bezetting < 50 ? 14 : v.bezetting <= 65 ? 10 : v.bezetting <= 80 ? 6 : 3;
  const optimaleBezetting = Math.min(v.bezetting + bezettingsWinst, 92);
  const optimaleOmzet = v.panden * (optimaalTarief * 365 * (optimaleBezetting / 100));
  const commissie = v.situatie === "agentschap" ? huidigeOmzet * 0.25 : 0;
  const omzetStijging = optimaleOmzet - huidigeOmzet;
  const craftNodig = v.situatie === "agentschap" || omzetStijging > 3000;
  const perMaand = maandprijs(v.panden, craftNodig);
  const staybaseKost = v.panden * perMaand * 12;
  const gap = omzetStijging + commissie - staybaseKost;
  const urenPerWeek = v.situatie === "agentschap" ? 2 : 6;
  const urenPerJaar = v.panden * urenPerWeek * 52;

  let persona: "standaard" | "sophie" | "elise" | "thomas" | "agentschap" = "standaard";
  if (v.situatie === "agentschap") persona = "agentschap";
  else if (v.panden >= 4) persona = "thomas";
  else if (v.panden <= 2 && v.bezetting < 65) persona = "sophie";
  else if (v.panden <= 4 && v.tarief >= 110) persona = "elise";

  return {
    huidigeOmzet, optimaleOmzet, optimaalTarief, optimaleBezetting,
    commissie, staybaseKost, gap, urenPerJaar, omzetStijging, perMaand, persona,
    plan: craftNodig ? PLANNEN.craft.naam : PLANNEN.host.naam,
    nettoNu: huidigeOmzet - commissie,
    nettoStaybase: optimaleOmzet - staybaseKost,
  };
}

const eur = (n: number) => "€" + Math.round(n).toLocaleString("nl-BE");

/** Telt het bedrag omhoog wanneer het significant verandert. */
function useCountUp(target: number) {
  const [shown, setShown] = useState(target);
  const prev = useRef(target);
  const raf = useRef<number>();
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    const significant = Math.abs(target - from) > Math.abs(from) * 0.1 + 100;
    if (!significant || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(target);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - t0) / 800, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (target - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target]);
  return shown;
}

export function Calculator({ onCta }: { onCta: () => void }) {
  const t = useT();
  const [v, setV] = useState<Invoer>({
    panden: 1, tarief: 130, bezetting: 58, situatie: "zelf", locatie: "belgische-kust",
  });
  const r = useMemo(() => bereken(v), [v]);
  const gap = Math.max(r.gap, 0);
  const getoond = useCountUp(gap);

  const fill = (val: number, min: number, max: number) => ({
    "--fill": `${((val - min) / (max - min)) * 100}%`,
  } as React.CSSProperties);

  return (
    <div className="lp-calc lp-fade">
      <div className="lp-calc-inputs">
        <div className="lp-calc-col">
          <div className="lp-field">
            <label htmlFor="calc-tarief">{t("calc.rate")}</label>
            <span className="hint">{t("calc.rateHint")}</span>
            <div className="lp-slider-row">
              <input
                id="calc-tarief" type="range" min={40} max={500} step={5} value={v.tarief}
                style={fill(v.tarief, 40, 500)}
                onChange={(e) => setV((s) => ({ ...s, tarief: +e.target.value }))}
              />
              <span className="lp-slider-val">
                <span>€</span>
                <input
                  type="number" min={40} max={500} step={5} value={v.tarief}
                  onChange={(e) => setV((s) => ({ ...s, tarief: Math.min(500, Math.max(40, +e.target.value || 40)) }))}
                />
              </span>
            </div>
          </div>

          <div className="lp-field">
            <label htmlFor="calc-bez">{t("calc.occ")}</label>
            <span className="hint">{t("calc.occHint")}</span>
            <div className="lp-slider-row">
              <input
                id="calc-bez" type="range" min={20} max={95} step={1} value={v.bezetting}
                style={fill(v.bezetting, 20, 95)}
                onChange={(e) => setV((s) => ({ ...s, bezetting: +e.target.value }))}
              />
              <span className="lp-slider-val">
                <input
                  type="number" min={20} max={95} value={v.bezetting}
                  onChange={(e) => setV((s) => ({ ...s, bezetting: Math.min(95, Math.max(20, +e.target.value || 20)) }))}
                />
                <span>%</span>
              </span>
            </div>
            {v.bezetting > 85 && (
              <p className="lp-note">{t("calc.occNote")}</p>
            )}
          </div>
        </div>

        <div className="lp-calc-col">
          <div className="lp-field">
            <label>{t("calc.manage")}</label>
            <div className="lp-choice-cards" role="radiogroup" aria-label={t("calc.manageAria")}>
              <button
                className={`lp-choice ${v.situatie === "zelf" ? "on" : ""}`}
                role="radio" aria-checked={v.situatie === "zelf"}
                onClick={() => setV((s) => ({ ...s, situatie: "zelf" }))}
              >
                <span className="em">🧑‍💻</span>
                <b>{t("calc.self")}</b>
                <span>{t("calc.selfP")}</span>
              </button>
              <button
                className={`lp-choice ${v.situatie === "agentschap" ? "on" : ""}`}
                role="radio" aria-checked={v.situatie === "agentschap"}
                onClick={() => setV((s) => ({ ...s, situatie: "agentschap" }))}
              >
                <span className="em">🏢</span>
                <b>{t("calc.agency")}</b>
                <span>{t("calc.agencyP")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="lp-calc-divider"><span>{t("calc.divider")}</span></div>

      <div className="lp-results" aria-live="polite">
        <div className="lp-res-main">
          <span className="lp-res-eyebrow">{t("calc.gapLabel")}</span>
          <div className="lp-res-num">{eur(getoond)}</div>
          <p className="lp-res-cap">{t("calc.gapCap")}</p>
        </div>

        <div className="lp-res-side">
          <table className="lp-table">
            <thead>
              <tr><th /><th>{t("calc.tbl.now")}</th><th>{t("calc.tbl.with")}</th></tr>
            </thead>
            <tbody>
              <tr><td>{t("calc.tbl.rate")}</td><td>{eur(v.tarief)}</td><td>{eur(r.optimaalTarief)}</td></tr>
              <tr><td>{t("calc.tbl.occ")}</td><td>{v.bezetting}%</td><td>{r.optimaleBezetting}%</td></tr>
              <tr><td>{t("calc.tbl.revenue")}</td><td>{eur(r.huidigeOmzet)}</td><td>{eur(r.optimaleOmzet)}</td></tr>
              <tr className="tot"><td>{t("calc.tbl.net")}</td><td>{eur(r.nettoNu)}</td><td className="win">{eur(r.nettoStaybase)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="lp-calc-cta">
        <button className="btn coral" onClick={onCta}>{t("calc.cta")}</button>
      </div>
      <p className="lp-disclaimer">{t("calc.disclaimer")}</p>
    </div>
  );
}
