import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Logo } from "../components/Icon";
import { Calculator } from "./Calculator";
import { KennisEnInspiratie, UitgelichteReview, WatJeKrijgt } from "./LandingSections";
import { useFadeIn } from "../lib/useFadeIn";
import { useT } from "../i18n";
import { LanguagePicker } from "../components/LanguagePicker";
import "./landing.css";

/**
 * Zet hier de URL van de demovideo zodra die er is — bv. "/demo.mp4" wanneer
 * het bestand in frontend/public/ staat, of een volledige URL. Zolang dit leeg
 * is, toont de modal een nette placeholder.
 */
const DEMO_VIDEO_URL = "";

const NAV = [
  { href: "#hoe", key: "lp.nav.how" },
  { href: "#calculator", key: "lp.nav.calc" },
  { href: "#prijzen", key: "lp.nav.prices" },
  { href: "#verhalen", key: "lp.nav.stories" },
];

const USPS = [
  { icon: "tag" as const, h: "lp.usp.pricesH", p: "lp.usp.pricesP" },
  { icon: "chat" as const, h: "lp.usp.guestsH", p: "lp.usp.guestsP" },
  { icon: "chart" as const, h: "lp.usp.overviewH", p: "lp.usp.overviewP" },
];

const PIJN = [
  { em: "⏰", h: "lp.pijn.1h", p: "lp.pijn.1p" },
  { em: "📉", h: "lp.pijn.2h", p: "lp.pijn.2p" },
  { em: "🧩", h: "lp.pijn.3h", p: "lp.pijn.3p" },
  { em: "🏦", h: "lp.pijn.4h", p: "lp.pijn.4p" },
];

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

const VERHALEN = [
  { av: "ND", naam: "Nathalie D.", info: "lp.testi.1info", q: "lp.testi.1q" },
  { av: "PV", naam: "Pieter V.", info: "lp.testi.2info", q: "lp.testi.2q" },
  { av: "EM", naam: "Elise M.", info: "lp.testi.3info", q: "lp.testi.3q" },
];

const FAQ = [
  { v: "lp.faq.1v", a: "lp.faq.1a" },
  { v: "lp.faq.2v", a: "lp.faq.2a" },
  { v: "lp.faq.3v", a: "lp.faq.3a" },
  { v: "lp.faq.4v", a: "lp.faq.4a" },
  { v: "lp.faq.5v", a: "lp.faq.5a" },
];

/**
 * Meet de sticky nav en zet de hoogte als CSS-variabele, zodat hero +
 * vertrouwensbalk samen exact één schermhoogte vullen (ook als de nav wrapt).
 */
function useNavHeight(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () =>
      document.documentElement.style.setProperty("--lp-nav-h", `${el.getBoundingClientRect().height}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => { ro.disconnect(); document.documentElement.style.removeProperty("--lp-nav-h"); };
  }, [ref]);
}

function VideoModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="lp-modal" onMouseDown={(e) => { if (e.target === ref.current) onClose(); }} ref={ref}>
      <div className="lp-modal-box" role="dialog" aria-label={t("lp.video.title")}>
        <div className="lp-modal-head">
          <span style={{ fontSize: 18 }}>🎬</span>
          <b>{t("lp.video.title")}</b>
          <button className="icon-btn" style={{ marginLeft: "auto" }} onClick={onClose} aria-label={t("common.close")}>
            <Icon name="x" />
          </button>
        </div>
        <div className="lp-modal-body">
          {DEMO_VIDEO_URL ? (
            <video src={DEMO_VIDEO_URL} controls autoPlay playsInline />
          ) : (
            <div className="lp-modal-ph">
              <span className="em">🎥</span>
              <b>De demovideo komt hier</b>
              <span>
                Zet het bestand in <code>frontend/public/</code> en vul de URL in bij{" "}
                <code>DEMO_VIDEO_URL</code> in <code>LandingPage.tsx</code> — de speler verschijnt dan automatisch.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const nav = useNavigate();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const navRef = useRef<HTMLElement>(null);
  useNavHeight(navRef);
  useFadeIn();

  const naarLogin = () => nav("/login");
  const naarRegistreer = () => nav("/registreer");

  return (
    <div className="lp">
      {/* NAV */}
      <header className="lp-nav" ref={navRef}>
        <div className="lp-nav-in">
          <a href="#top" className="logo" style={{ fontSize: 21 }}>
            <Logo /> staybase
          </a>
          <nav className="lp-nav-links">
            {NAV.map((n) => <a key={n.href} href={n.href}>{t(n.key)}</a>)}
          </nav>
          <div className="lp-nav-cta">
            <button className="btn ghost sm" onClick={naarLogin}>{t("lp.login")}</button>
            <button className="btn coral sm" onClick={naarRegistreer}>{t("lp.tryFree")}</button>
            <LanguagePicker />
          </div>
          <button className="lp-burger" onClick={() => setMenuOpen((o) => !o)} aria-label={t("lp.menu")}>
            <Icon name={menuOpen ? "x" : "menu"} size={22} />
          </button>
        </div>
        <div className={`lp-mobile ${menuOpen ? "open" : ""}`}>
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)}>{t(n.key)}</a>
          ))}
          <button className="btn ghost" style={{ justifyContent: "center", marginTop: 8 }} onClick={naarLogin}>
            {t("lp.login")}
          </button>
          <button className="btn coral" style={{ justifyContent: "center" }} onClick={naarRegistreer}>
            {t("lp.tryFree")}
          </button>
        </div>
      </header>

      {/* EERSTE SCHERM — hero + vertrouwensbalk vullen samen de viewport */}
      <div className="lp-first">
        <section className="lp-hero" id="top">
          <div className="lp-hero-bg" aria-hidden="true" />
          <div className="lp-container">
            <div className="lp-hero-grid">
              <div>
                <p className="lp-label lp-fade">{t("lp.hero.label")}</p>
                <h1 className="lp-fade">{t("lp.hero.title")} <em>{t("lp.hero.titleEm")}</em></h1>
                <p className="lp-hero-sub lp-fade">{t("lp.hero.sub")}</p>
                <div className="lp-usps lp-fade">
                  {USPS.map((u) => (
                    <div className="lp-usp" key={u.h}>
                      <span className="ico"><Icon name={u.icon} size={19} /></span>
                      <div>
                        <b>{t(u.h)}</b>
                        <span>{t(u.p)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="lp-hero-ctas lp-fade">
                  <button className="btn coral lp-btn-lg" onClick={naarRegistreer}>{t("lp.tryFree")}</button>
                  <button className="btn ghost lp-btn-lg" onClick={() => setVideoOpen(true)}>{t("lp.hero.demo")}</button>
                </div>
                <p className="lp-hero-trust lp-fade">{t("lp.hero.trust")}</p>
              </div>

              <div className="lp-hero-art lp-fade">
                <div className="lp-hero-canvas">
                  <img
                    src="/villasun.png"
                    alt={t("lp.heroAlt")}
                    width={1536}
                    height={1024}
                    decoding="async"
                  />
                </div>

                <div className="lp-card lp-card-income">
                  <span className="lbl">{t("lp.mock.income")}</span>
                  <div className="amt"><b className="num">€ 8.945</b><span>+23%</span></div>
                  <svg viewBox="0 0 160 42" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="lpSpark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--coral)" stopOpacity=".28" />
                        <stop offset="100%" stopColor="var(--coral)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0 36 L20 33 L40 34 L60 26 L80 22 L100 24 L120 14 L140 9 L160 4 L160 42 L0 42 Z" fill="url(#lpSpark)" />
                    <path d="M0 36 L20 33 L40 34 L60 26 L80 22 L100 24 L120 14 L140 9 L160 4"
                      fill="none" stroke="var(--coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="axis"><span>1 jul</span><span>15 jul</span><span>31 jul</span></div>
                </div>

                <div className="lp-card lp-card-book">
                  <div className="hd"><b>{t("lp.mock.bookings")}</b><span>{t("lp.mock.more")}</span></div>
                  {[
                    { av: "🌊", nm: "Sophie & Bram", dt: "3–8 jul", st: "ok", lb: t("lp.mock.confirmed") },
                    { av: "⛱️", nm: "Familie Müller", dt: "10–17 jul", st: "ok", lb: t("lp.mock.confirmed") },
                    { av: "🚲", nm: "Familie Peeters", dt: "17–24 jul", st: "wait", lb: t("lp.mock.today") },
                    { av: "🐚", nm: "Claire Dubois", dt: "26–31 jul", st: "ok", lb: t("lp.mock.confirmed") },
                  ].map((b) => (
                    <div className="lp-book-row" key={b.nm}>
                      <span className="av">{b.av}</span>
                      <span className="nm">{b.nm}</span>
                      <span className="dt">{b.dt}</span>
                      <span className={`st ${b.st}`}>{b.lb}</span>
                    </div>
                  ))}
                </div>

                <div className="lp-card lp-card-review">
                  <div className="who">
                    <span className="av">🐚</span>
                    <div>
                      <b>Claire D.</b>
                      <div className="dt">{t("lp.mock.daysAgo")}</div>
                    </div>
                    <span className="stars">★★★★★</span>
                  </div>
                  <p>{t("lp.mock.review")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* VERTROUWENSBALK — sluit het eerste scherm af */}
        <div className="lp-stats">
          <div className="lp-container">
            <div className="lp-stats-grid">
              <div className="lp-trust-left">
                <b>{t("lp.stats.h")}</b>
                <span>{t("lp.stats.p")}</span>
              </div>
              <div className="lp-stats-nums">
                <div className="lp-stat"><b className="num">+23%</b><span>{t("lp.stats.1")}</span></div>
                <div className="lp-stat"><b className="num">{t("lp.stats.2h")}</b><span>{t("lp.stats.2")}</span></div>
                <div className="lp-stat"><b className="num">4,87</b><span>{t("lp.stats.3")}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PIJN */}
      <section className="lp-sec" id="verhuurders">
        <div className="lp-container">
          <p className="lp-label lp-fade">{t("lp.pijn.label")}</p>
          <h2 className="lp-h2 lp-fade">{t("lp.pijn.title1")}<br />{t("lp.pijn.title2")}</h2>
          <p className="lp-sub lp-fade">{t("lp.pijn.sub")}</p>
          <div className="lp-pain">
            {PIJN.map((p) => (
              <article className="lp-pain-card lp-fade" key={p.h}>
                <span className="em">{p.em}</span>
                <h3>{t(p.h)}</h3>
                <p>{t(p.p)}</p>
              </article>
            ))}
          </div>
          <div className="lp-quote lp-fade">
            <blockquote>{t("lp.pijn.quote")}</blockquote>
            <cite>{t("lp.pijn.cite")}</cite>
          </div>
        </div>
      </section>

      {/* WAT JE KRIJGT */}
      <WatJeKrijgt onCta={naarLogin} />

      {/* HOE */}
      <section className="lp-sec alt" id="hoe">
        <div className="lp-container">
          <p className="lp-label lp-fade">{t("lp.feat.label")}</p>
          <h2 className="lp-h2 lp-fade">{t("lp.feat.title1")}<br />{t("lp.feat.title2")}</h2>
          <p className="lp-sub lp-fade">{t("lp.feat.sub")}</p>
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

      {/* CALCULATOR */}
      <section className="lp-calc-sec" id="calculator">
        <div className="lp-container">
          <div className="lp-calc-head lp-fade">
            <p className="lp-label">{t("lp.calcSec.label")}</p>
            <h2 className="lp-h2">{t("lp.calcSec.title")}</h2>
            <p>{t("lp.calcSec.sub")}</p>
          </div>
          <Calculator onCta={naarLogin} />
        </div>
      </section>

      {/* PRIJZEN */}
      <section className="lp-sec" id="prijzen">
        <div className="lp-container">
          <p className="lp-label lp-fade">{t("lp.plans.label")}</p>
          <h2 className="lp-h2 lp-fade">{t("lp.plans.title")}</h2>
          <p className="lp-sub lp-fade">{t("lp.plans.sub")}</p>

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

      {/* AI */}
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

      {/* VERHALEN */}
      <section className="lp-sec" id="verhalen">
        <div className="lp-container">
          <UitgelichteReview onCta={naarLogin} />
        </div>

        <div className="lp-container" style={{ marginTop: 82 }}>
          <p className="lp-label lp-fade">{t("lp.testi.label")}</p>
          <h2 className="lp-h2 lp-fade">{t("lp.testi.title")}</h2>
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

      {/* FAQ */}
      <section className="lp-sec alt">
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

      {/* KENNIS & INSPIRATIE */}
      <KennisEnInspiratie />

      {/* LAATSTE CTA */}
      <section className="lp-final">
        <div className="lp-container">
          <h2 className="lp-fade">{t("lp.final.title")}</h2>
          <p className="sub lp-fade">{t("lp.final.sub")}</p>
          <div className="lp-final-ctas lp-fade">
            <button className="btn coral lp-btn-lg" onClick={naarRegistreer}>{t("lp.tryFree")}</button>
            <a className="lp-final-link" href="#hoe">{t("lp.final.link")}</a>
          </div>
          <p style={{ fontSize: 13, color: "var(--faint)" }}>{t("lp.final.note")}</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-top">
            <div className="lp-footer-col">
              <div className="logo" style={{ color: "#fff" }}><Logo size={26} /> staybase</div>
              <p className="lp-footer-tag">{t("lp.footer.tag")}</p>
            </div>
            <div className="lp-footer-col">
              <h5>{t("lp.footer.product")}</h5>
              <a href="#hoe">{t("lp.nav.how")}</a>
              <a href="#prijzen">{t("lp.nav.prices")}</a>
              <a href="#calculator">{t("lp.nav.calc")}</a>
            </div>
            <div className="lp-footer-col">
              <h5>{t("lp.footer.company")}</h5>
              <a href="#verhalen">{t("lp.nav.stories")}</a>
              <a href="#top">{t("lp.footer.about")}</a>
            </div>
            <div className="lp-footer-col">
              <h5>{t("lp.footer.start")}</h5>
              <button className="btn coral sm" style={{ justifyContent: "center" }} onClick={naarRegistreer}>{t("lp.tryFree")}</button>
              <a onClick={naarLogin} style={{ marginTop: 12 }}>{t("lp.footer.haveAccount")}</a>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>{t("lp.footer.copy")}</span>
            <span>{t("lp.footer.proposal")}</span>
          </div>
        </div>
      </footer>

      {videoOpen && <VideoModal onClose={() => setVideoOpen(false)} />}
    </div>
  );
}
