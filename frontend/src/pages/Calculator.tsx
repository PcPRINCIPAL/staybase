import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Waarde-calculator uit de klantschets, 1-op-1 geport.
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

const LOCATIES = [
  { id: "belgische-kust", label: "Belgische kust" },
  { id: "ardennen", label: "Ardennen" },
  { id: "stad", label: "Stad (Gent, Brugge, Brussel)" },
  { id: "andere", label: "Andere regio" },
];

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
  const [v, setV] = useState<Invoer>({
    panden: 2, tarief: 130, bezetting: 58, situatie: "zelf", locatie: "belgische-kust",
  });
  const r = useMemo(() => bereken(v), [v]);
  const gap = Math.max(r.gap, 0);
  const getoond = useCountUp(gap);

  const persona = (() => {
    switch (r.persona) {
      case "sophie":
        return <>Het grootste deel van die gap zit in twee dingen: je tarief ligt waarschijnlijk onder de markt op drukke weekends, en sommige nachten die geboekt hadden kunnen zijn, blijven leeg.</>;
      case "elise":
        return <>Op jouw tariefniveau maakt een prijsoptimalisering van 15–20% op piekavonden een groot verschil. De dynamische prijszetting van Craft verdient zijn kost doorgaans terug in het eerste geoptimaliseerde weekend.</>;
      case "thomas":
        return <>Met {v.panden} panden is het consolidatievoordeel even groot als de omzetgap. Eén dashboard, één wekelijkse samenvatting, één AI die alle gastcommunicatie beheert.</>;
      case "agentschap":
        return (
          <>
            Die <b>{eur(r.commissie)}</b> aan jaarlijkse commissie is het grootste deel van jouw gap. Staybase geeft je professioneel beheer voor een vaste maandelijkse kost.
            <small>Commissiebesparing: {eur(r.commissie)} · Staybase-jaarkost: {eur(r.staybaseKost)} · Nettobesparing: {eur(r.commissie - r.staybaseKost)}</small>
          </>
        );
      default:
        return <>Deze schatting is gebaseerd op typische prestatieverbeteringen bij onafhankelijke vakantieverhuurders in België.</>;
    }
  })();

  const fill = (val: number, min: number, max: number) => ({
    "--fill": `${((val - min) / (max - min)) * 100}%`,
  } as React.CSSProperties);

  return (
    <div className="lp-calc lp-fade">
      <div className="lp-calc-inputs">
        <div className="lp-calc-col">
          <div className="lp-field">
            <label>Hoeveel panden beheer je?</label>
            <span className="hint">Elk gekoppeld pand krijgt zijn eigen stemprofiel en prijsintelligentie.</span>
            <div className="lp-stepper">
              <button onClick={() => setV((s) => ({ ...s, panden: Math.max(1, s.panden - 1) }))} aria-label="Minder panden">−</button>
              <output className="num" aria-live="polite">{v.panden}</output>
              <button onClick={() => setV((s) => ({ ...s, panden: Math.min(20, s.panden + 1) }))} aria-label="Meer panden">+</button>
            </div>
            {v.panden >= 8 && (
              <p className="lp-note">💡 Vanaf 8 panden is het consolidatievoordeel vaak groter dan de omzetgap zelf.</p>
            )}
          </div>

          <div className="lp-field">
            <label htmlFor="calc-tarief">Je gemiddelde nachtprijs</label>
            <span className="hint">Je typische tarief over alle kanalen heen, over het hele jaar.</span>
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
            <label htmlFor="calc-bez">Je huidige bezettingsgraad</label>
            <span className="hint">Hoeveel nachten per jaar effectief geboekt zijn.</span>
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
              <p className="lp-note">💡 Op dit bezettingsniveau telt prijsoptimalisering meer dan leegstand wegwerken.</p>
            )}
          </div>
        </div>

        <div className="lp-calc-col">
          <div className="lp-field">
            <label>Hoe beheer je vandaag?</label>
            <div className="lp-choice-cards" role="radiogroup" aria-label="Huidige beheersituatie">
              <button
                className={`lp-choice ${v.situatie === "zelf" ? "on" : ""}`}
                role="radio" aria-checked={v.situatie === "zelf"}
                onClick={() => setV((s) => ({ ...s, situatie: "zelf" }))}
              >
                <span className="em">🧑‍💻</span>
                <b>Zelfbeheer</b>
                <span>Je regelt alles zelf: gasten, prijzen en planning.</span>
              </button>
              <button
                className={`lp-choice ${v.situatie === "agentschap" ? "on" : ""}`}
                role="radio" aria-checked={v.situatie === "agentschap"}
                onClick={() => setV((s) => ({ ...s, situatie: "agentschap" }))}
              >
                <span className="em">🏢</span>
                <b>Agentschap</b>
                <span>Iemand anders beheert voor jou, aan 20–30% commissie.</span>
              </button>
            </div>
          </div>

          <div className="lp-field">
            <label>Je regio</label>
            <span className="hint">Bepaalt met welke markttarieven we vergelijken.</span>
            <div className="lp-pills" role="radiogroup" aria-label="Regio">
              {LOCATIES.map((l) => (
                <button
                  key={l.id}
                  className={v.locatie === l.id ? "on" : ""}
                  role="radio" aria-checked={v.locatie === l.id}
                  onClick={() => setV((s) => ({ ...s, locatie: l.id }))}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="lp-calc-divider"><span>Jouw geschatte resultaat</span></div>

      <div className="lp-results" aria-live="polite">
        <div className="lp-res-main">
          <span className="lp-res-eyebrow">Jouw geschatte omzetgap</span>
          <div className="lp-res-num">{eur(getoond)}</div>
          <p className="lp-res-cap">per jaar, vergeleken met een geoptimaliseerde onafhankelijke werking</p>
          {gap > 0 && (
            <div className="lp-res-pills">
              <span className="lp-res-pill">📈 +{eur(r.omzetStijging)} extra omzet</span>
              {r.commissie > 0 && <span className="lp-res-pill">💰 −{eur(r.commissie)} commissie bespaard</span>}
              <span className="lp-res-pill">⏱️ {Math.round(r.urenPerJaar).toLocaleString("nl-BE")} uur per jaar terug</span>
            </div>
          )}
          <p className="lp-persona">
            {gap > 0 ? persona : "Je pand presteert al dicht bij het marktoptimum. Staybase zou voor jou vooral tijd besparen in plaats van extra omzet opleveren."}
          </p>
        </div>

        <div className="lp-res-side">
          <table className="lp-table">
            <thead>
              <tr><th /><th>Nu</th><th>Met Staybase</th></tr>
            </thead>
            <tbody>
              <tr><td>Nachtprijs</td><td>{eur(v.tarief)}</td><td>{eur(r.optimaalTarief)}</td></tr>
              <tr><td>Bezetting</td><td>{v.bezetting}%</td><td>{r.optimaleBezetting}%</td></tr>
              <tr><td>Jaaromzet</td><td>{eur(r.huidigeOmzet)}</td><td>{eur(r.optimaleOmzet)}</td></tr>
              <tr><td>Kost beheer</td><td>{r.commissie > 0 ? "−" + eur(r.commissie) : "€0"}</td><td>−{eur(r.staybaseKost)}</td></tr>
              <tr className="tot"><td>Netto</td><td>{eur(r.nettoNu)}</td><td className="win">{eur(r.nettoStaybase)}</td></tr>
            </tbody>
          </table>
          <div className="lp-plan-tip">
            <b>Aanbevolen:</b> {r.plan} — {eur(r.perMaand)}/pand/maand
          </div>
        </div>
      </div>

      <div className="lp-calc-cta">
        <button className="btn coral" onClick={onCta}>Gratis proberen — geen kaartgegevens nodig →</button>
        <p>Koppelen duurt 8 minuten. Je eerste AI-bericht staat dezelfde dag klaar.</p>
      </div>
      <p className="lp-disclaimer">
        Schattingen op basis van mediane prestatieverbeteringen bij onafhankelijke vakantieverhuurders in België.
        Werkelijke resultaten verschillen per pand, markt en gebruik. Staybase garandeert geen specifieke omzet.
      </p>
    </div>
  );
}
