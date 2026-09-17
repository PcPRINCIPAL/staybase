import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Calculator } from "./Calculator";
import { KennisEnInspiratie, UitgelichteReview } from "./LandingSections";
import { LpFinalCta, LpFooter, LpNav, LpPageHead } from "./LandingShell";
import { useFadeIn } from "../lib/useFadeIn";
import { useT } from "../i18n";
import "./landing.css";

/**
 * Doorklikpagina's van de website (fase 6). De landingspagina blijft kort;
 * de inhoud die er stond leeft hier verder — elke pagina met een eigen kop,
 * URL en CTA ("doorklikken is diepgaander", en het telt mee voor SEO).
 */

const FEATURES = [
  { em: "🔄", h: "lp.feat.1h", p: "lp.feat.1p" },
  { em: "💬", h: "lp.feat.2h", p: "lp.feat.2p" },
  { em: "🧽", h: "lp.feat.3h", p: "lp.feat.3p" },
  { em: "📈", h: "lp.feat.4h", badge: "Craft", p: "lp.feat.4p" },
];

const AI_KAARTEN = [
  { em: "📋", n: "01", h: "lp.ai.1h", p: "lp.ai.1p" },
  { em: "✏️", n: "02", h: "lp.ai.2h", p: "lp.ai.2p" },
  { em: "🛡️", n: "03", h: "lp.ai.3h", p: "lp.ai.3p" },
];

const FAQ = [
  { v: "lp.faq.1v", a: "lp.faq.1a" },
  { v: "lp.faq.2v", a: "lp.faq.2a" },
  { v: "lp.faq.3v", a: "lp.faq.3a" },
  { v: "lp.faq.4v", a: "lp.faq.4a" },
  { v: "lp.faq.5v", a: "lp.faq.5a" },
];

const VERHALEN = [
  { av: "ND", naam: "Nathalie D.", info: "lp.testi.1info", q: "lp.testi.1q" },
  { av: "PV", naam: "Pieter V.", info: "lp.testi.2info", q: "lp.testi.2q" },
  { av: "EM", naam: "Elise M.", info: "lp.testi.3info", q: "lp.testi.3q" },
];

/** /hoe-het-werkt — de features, de AI-laag en de veelgestelde vragen. */
export function HoeHetWerktPage() {
  const t = useT();
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  useFadeIn();

  return (
    <div className="lp">
      <LpNav />
      <section className="lp-sec">
        <LpPageHead label={t("lp.feat.label")} title={<>{t("lp.feat.title1")}<br />{t("lp.feat.title2")}</>} sub={t("lp.feat.sub")} />
        <div className="lp-container">
          <div className="lp-features">
            {FEATURES.map((f) => (
              <article className="lp-feature lp-fade" key={f.h}>
                <span className="em">{f.em}</span>
                <div>
                  <h3>{t(f.h)}{f.badge && <span className="lp-badge">{f.badge}</span>}</h3>
                  <p>{t(f.p)}</p>
                  {f.badge && (
                    <div className="lp-price-demo">
                      {t("lp.feat.demo1")} <b>{t("lp.feat.demo1b")}</b><br />
                      {t("lp.feat.demo2")} <b>{t("lp.feat.demo2b")}</b><br />
                      {t("lp.feat.demo3")} <b className="voorstel">{t("lp.feat.demo3b")}</b>
                      <small>{t("lp.feat.demo4")}</small>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-sec alt">
        <div className="lp-container">
          <p className="lp-label lp-fade">{t("lp.ai.label")}</p>
          <h2 className="lp-h2 lp-fade">{t("lp.ai.title1")}<br />{t("lp.ai.title2")}</h2>
          <p className="lp-sub lp-fade">{t("lp.ai.sub")}</p>
          <div className="lp-ai">
            {AI_KAARTEN.map((k) => (
              <article className="lp-ai-card lp-fade" key={k.n}>
                <span className="em">{k.em}</span>
                <div className="num">{k.n}</div>
                <h3>{t(k.h)}</h3>
                <p>{t(k.p)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-sec">
        <div className="lp-container">
          <p className="lp-label lp-fade">{t("lp.faq.label")}</p>
          <h2 className="lp-h2 lp-fade">{t("lp.faq.title")}</h2>
          <div className="lp-faq lp-fade">
            {FAQ.map((f, i) => (
              <div className={`lp-faq-item ${faqOpen === i ? "open" : ""}`} key={f.v}>
                <button className="lp-faq-q" aria-expanded={faqOpen === i} onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                  <b>{t(f.v)}</b>
                  <span className="chev"><Icon name="chevD" /></span>
                </button>
                <div className="lp-faq-a"><p>{t(f.a)}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LpFinalCta />
      <LpFooter />
    </div>
  );
}

/** /bereken-je-waarde — de opbrengstcalculator als eigen pagina. */
export function BerekenPage() {
  const t = useT();
  const nav = useNavigate();
  useFadeIn();

  return (
    <div className="lp">
      <LpNav />
      <section className="lp-calc-sec">
        <LpPageHead label={t("lp.calcSec.label")} title={t("lp.calcSec.title")} sub={t("lp.calcSec.sub")} />
        <div className="lp-container">
          <Calculator onCta={() => nav("/registreer")} />
        </div>
      </section>
      <LpFinalCta />
      <LpFooter />
    </div>
  );
}

/** /prijzen — de twee formules, volumekorting en de garantie. */
export function SitePrijzenPage() {
  const t = useT();
  const nav = useNavigate();
  useFadeIn();
  const naarRegistreer = () => nav("/registreer");

  return (
    <div className="lp">
      <LpNav />
      <section className="lp-sec">
        <LpPageHead label={t("lp.plans.label")} title={t("lp.plans.title")} sub={t("lp.plans.sub")} />
        <div className="lp-container">
          <div className="lp-plans">
            <div className="lp-plan lp-fade">
              <p className="lp-plan-label">{t("lp.plans.host.label")}</p>
              <div className="lp-plan-name">Host</div>
              <div className="lp-plan-price"><b className="num">€59</b><span>{t("lp.plans.perMonth")}</span></div>
              <p className="lp-plan-disc">−10% vanaf 5 panden · −15% vanaf 10</p>
              <ul>
                <li><span className="tick">✓</span>{t("lp.plans.host.f1")}</li>
                <li><span className="tick">✓</span>{t("lp.plans.host.f2")}</li>
                <li><span className="tick">✓</span>{t("lp.plans.host.f3")}</li>
                <li><span className="tick">✓</span>{t("lp.plans.host.f4")}</li>
                <li><span className="tick">✓</span>{t("lp.plans.host.f5")}</li>
                <li className="locked"><span>🔒</span>{t("lp.plans.host.l1")}</li>
                <li className="locked"><span>🔒</span>{t("lp.plans.host.l2")}</li>
                <li className="locked"><span>🔒</span>{t("lp.plans.host.l3")}</li>
              </ul>
              <div className="lp-plan-note">{t("lp.plans.host.note")}</div>
              <button className="btn ghost" onClick={naarRegistreer}>{t("lp.tryFree")}</button>
            </div>

            <div className="lp-plan top lp-fade">
              <span className="lp-plan-badge">{t("lp.plans.craft.badge")}</span>
              <p className="lp-plan-label">{t("lp.plans.craft.label")}</p>
              <div className="lp-plan-name">Craft</div>
              <div className="lp-plan-price"><b className="num">€99</b><span>{t("lp.plans.perMonth")}</span></div>
              <p className="lp-plan-disc">−10% vanaf 5 panden · −15% vanaf 10</p>
              <ul>
                <li><span className="tick">✓</span>{t("lp.plans.craft.f1")}</li>
                <li className="hi">{t("lp.plans.craft.hi")}</li>
                <li><span className="tick">✓</span>{t("lp.plans.craft.f2")}</li>
                <li><span className="tick">✓</span>{t("lp.plans.craft.f3")}</li>
                <li><span className="tick">✓</span>{t("lp.plans.craft.f4")}</li>
                <li><span className="tick">✓</span>{t("lp.plans.craft.f5")}</li>
                <li><span className="tick">✓</span>{t("lp.plans.craft.f6")}</li>
              </ul>
              <button className="btn coral" onClick={naarRegistreer}>{t("lp.tryFree")}</button>
            </div>
          </div>

          <table className="lp-vol lp-fade">
            <thead><tr><th>{t("lp.plans.vol.props")}</th><th>Host</th><th>Craft</th></tr></thead>
            <tbody>
              <tr><td>1–4</td><td><b>€59</b> {t("lp.plans.vol.perPand")}</td><td><b>€99</b> {t("lp.plans.vol.perPand")}</td></tr>
              <tr><td>5–9</td><td><b>€53,10</b> <span className="off">−10%</span></td><td><b>€89,10</b> <span className="off">−10%</span></td></tr>
              <tr><td>10+</td><td><b>€50,15</b> <span className="off">−15%</span></td><td><b>€84,15</b> <span className="off">−15%</span></td></tr>
            </tbody>
          </table>
          <p style={{ fontSize: 12.5, color: "var(--faint)" }}>{t("lp.plans.vol.note")}</p>

          <div className="lp-guarantee lp-fade">
            <span className="em">🛡️</span>
            <div>
              <h4>{t("lp.plans.guarantee.h")}</h4>
              <p>{t("lp.plans.guarantee.p")}</p>
            </div>
          </div>
        </div>
      </section>
      <LpFinalCta />
      <LpFooter />
    </div>
  );
}

/** /verhalen — de uitgelichte review, testimonials en het oprichtersverhaal. */
export function VerhalenPage() {
  const t = useT();
  const nav = useNavigate();
  useFadeIn();

  return (
    <div className="lp">
      <LpNav />
      <section className="lp-sec">
        <LpPageHead label={t("lp.testi.label")} title={t("lp.testi.title")} sub={t("lp.testi.pageSub")} />
        <div className="lp-container">
          <UitgelichteReview onCta={() => nav("/registreer")} />
        </div>
        <div className="lp-container" style={{ marginTop: 82 }}>
          <div className="lp-testi">
            {VERHALEN.map((v) => (
              <article className="lp-testi-card lp-fade" key={v.naam}>
                <div className="lp-stars">★★★★★</div>
                <p>“{t(v.q)}”</p>
                <div className="lp-testi-who">
                  <span className="av">{v.av}</span>
                  <div><b>{v.naam}</b><span>{t(v.info)}</span></div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* OPRICHTERS */}
      <section className="lp-founders">
        <div className="lp-container">
          <div className="lp-founders-grid">
            <div>
              <p className="lp-label lp-fade">{t("lp.found.label")}</p>
              <h2 className="lp-h2 lp-fade">{t("lp.found.title1")}<br /><em>{t("lp.found.title2")}</em></h2>
              <p className="lp-founders-text lp-fade">
                {t("lp.found.p1")}
                <br /><br />
                {t("lp.found.p2")}
                <br /><br />
                <em>{t("lp.found.p3")}</em><br />
                {t("lp.found.p4")}
              </p>
              <div className="lp-founder-cards">
                <div className="lp-founder lp-fade">
                  <span className="av">BD</span>
                  <div>
                    <h4>Benoit Desintebin</h4>
                    <div className="rol">{t("lp.found.ceo")}</div>
                    <p>{t("lp.found.benoit")}</p>
                  </div>
                </div>
                <div className="lp-founder lp-fade">
                  <span className="av">JC</span>
                  <div>
                    <h4>Julie Cousin</h4>
                    <div className="rol">{t("lp.found.cpo")}</div>
                    <p>{t("lp.found.julie")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lp-fade">
              <div className="lp-founders-photo">
                <img
                  src="/linnois.webp"
                  alt={t("lp.found.photoAlt")}
                  width={750}
                  height={1000}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <p className="lp-founders-cap">{t("lp.found.cap")}</p>
            </div>
          </div>
        </div>
      </section>

      <KennisEnInspiratie />
      <LpFinalCta />
      <LpFooter />
    </div>
  );
}
