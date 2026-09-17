import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { WatJeKrijgt } from "./LandingSections";
import { LpFinalCta, LpFooter, LpNav } from "./LandingShell";
import { useFadeIn } from "../lib/useFadeIn";
import { useT } from "../i18n";
import "./landing.css";

/**
 * Landingspagina 2.0 (fase 6): kort — hero, pijn, wat je krijgt, en
 * doorklikkaarten naar de diepere pagina's (/hoe-het-werkt,
 * /bereken-je-waarde, /prijzen, /verhalen). "Nooit meer dan drie volledige
 * schermen scrollen; de coole dingen blijven, maar achter doorklikpagina's."
 */

/**
 * Zet hier de URL van de demovideo zodra die er is — bv. "/demo.mp4" wanneer
 * het bestand in frontend/public/ staat, of een volledige URL. Zolang dit leeg
 * is, toont de modal een nette placeholder.
 */
const DEMO_VIDEO_URL = "";

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

/** De doorklikkaarten onderaan — de rest van de website in vier stappen. */
const MORE = [
  { to: "/hoe-het-werkt", em: "⚙️", h: "lp.nav.how", p: "lp.more.how" },
  { to: "/bereken-je-waarde", em: "🧮", h: "lp.nav.calc", p: "lp.more.calc" },
  { to: "/prijzen", em: "🏷️", h: "lp.nav.prices", p: "lp.more.prices" },
  { to: "/verhalen", em: "💬", h: "lp.nav.stories", p: "lp.more.stories" },
];

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
  const [videoOpen, setVideoOpen] = useState(false);
  useFadeIn();

  const naarRegistreer = () => nav("/registreer");

  return (
    <div className="lp">
      <LpNav />

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

      {/* WAT JE KRIJGT — de "lees meer"-links klikken door naar de detailpagina */}
      <WatJeKrijgt onCta={() => nav("/hoe-het-werkt")} />

      {/* DOORKLIKKAARTEN — de rest van de website, elk op een eigen pagina */}
      <section className="lp-sec alt">
        <div className="lp-container">
          <p className="lp-label lp-fade">{t("lp.more.label")}</p>
          <h2 className="lp-h2 lp-fade">{t("lp.more.title")}</h2>
          <div className="lp-more lp-fade">
            {MORE.map((m) => (
              <Link key={m.to} to={m.to} className="lp-more-card">
                <span className="em">{m.em}</span>
                <b>{t(m.h)}</b>
                <span className="p">{t(m.p)}</span>
                <span className="go">{t("lp.more.go")} <Icon name="arrow" size={15} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <LpFinalCta />
      <LpFooter />

      {videoOpen && <VideoModal onClose={() => setVideoOpen(false)} />}
    </div>
  );
}
