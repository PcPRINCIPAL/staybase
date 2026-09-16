import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon, type IconName } from "../components/Icon";
import { ARTIKELEN, type Artikel } from "../content/artikelen";
import { useT } from "../i18n";

/* ============================================================
   "Wat je krijgt met Staybase" — tekst vrij op de achtergrond,
   alleen de visual zit in een kaartje.
   ============================================================ */

const KANALEN = [
  { ic: "🅰", nm: "Airbnb" },
  { ic: "🅱", nm: "Booking.com" },
  { ic: "✌️", nm: "Vrbo" },
  { ic: "🇪", nm: "Expedia" },
  { ic: "🇬", nm: "Google" },
  { ic: "🏨", nm: "Hotels.com" },
  { ic: "🦉", nm: "Trivago" },
];

const RUIMTES = ["lp.get.mock.room1", "lp.get.mock.room2", "lp.get.mock.room3", "lp.get.mock.room4"];

function MockChannels() {
  return (
    <div className="lp-mock">
      <div className="mock-hd">Channels</div>
      {KANALEN.map((k) => (
        <div className="lp-mock-row" key={k.nm}>
          <span className="ic">{k.ic}</span>
          <span className="nm">{k.nm}</span>
          <span className="lp-chip-ok">Connected</span>
        </div>
      ))}
    </div>
  );
}

function MockPricing() {
  const t = useT();
  return (
    <div className="lp-mock">
      <span className="lbl">{t("lp.get.mock.recommended")}</span>
      <div className="big"><b className="num">€ 196</b><span>+12%</span></div>
      <svg viewBox="0 0 160 56" preserveAspectRatio="none" style={{ height: 56 }}>
        <defs>
          <linearGradient id="mockPrice" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--coral)" stopOpacity=".26" />
            <stop offset="100%" stopColor="var(--coral)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 48 L18 45 L34 47 L50 38 L66 40 L82 30 L98 32 L114 20 L132 14 L146 12 L160 6 L160 56 L0 56 Z" fill="url(#mockPrice)" />
        <path d="M0 48 L18 45 L34 47 L50 38 L66 40 L82 30 L98 32 L114 20 L132 14 L146 12 L160 6"
          fill="none" stroke="var(--coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="axis"><span>1 mei</span><span>15 mei</span><span>31 mei</span></div>
    </div>
  );
}

function MockMessages() {
  const t = useT();
  return (
    <div className="lp-mock-stack">
      <div className="lp-mock-float">
        <span className="av">👩</span>
        <div>
          <b>{t("lp.get.mock.newBooking")}</b>
          <span>{t("lp.get.mock.justNow")}</span>
        </div>
      </div>
      <div className="lp-mock">
        <div className="lp-mock-row" style={{ padding: 0, borderTop: "none" }}>
          <span className="nm" style={{ fontWeight: 800 }}>{t("lp.get.mock.checkinInfo")}</span>
          <span style={{ color: "var(--good)", fontWeight: 700 }}>{t("lp.get.mock.now")}</span>
        </div>
        <p style={{ marginTop: 8, lineHeight: 1.55, color: "var(--muted)" }}>
          {t("lp.get.mock.msg")}<br />
          {t("lp.get.mock.msg2")}
        </p>
        <span className="lp-msg-btn">{t("lp.get.mock.guide")}</span>
      </div>
    </div>
  );
}

function MockCleaning() {
  const t = useT();
  return (
    <div className="lp-mock">
      <div className="mock-hd">{t("lp.get.mock.cleanTitle")}</div>
      <p className="lp-mock-sub">{t("lp.get.mock.cleanTime")}</p>
      {RUIMTES.map((r) => (
        <div className="lp-mock-check" key={r}>
          <span className="tick">✓</span>
          <span>{t(r)}</span>
          <span className="done">✓</span>
        </div>
      ))}
    </div>
  );
}

function MockInsights() {
  const t = useT();
  const bars = [26, 38, 30, 62, 44, 52, 40, 78, 34];
  return (
    <div className="lp-mock">
      <span className="lbl">{t("lp.get.mock.occupancy")}</span>
      <div className="big"><b className="num">78%</b><span>+18%</span></div>
      <svg viewBox="0 0 160 60" preserveAspectRatio="none" style={{ height: 60, marginTop: 8 }}>
        {bars.map((h, i) => (
          <rect key={i} x={i * 18 + 2} y={60 - (h / 80) * 60} width={11} height={(h / 80) * 60} rx={3} fill="var(--coral)"
            opacity={i === 7 ? 1 : 0.78} />
        ))}
      </svg>
    </div>
  );
}

function MockSite() {
  const t = useT();
  return (
    <div className="lp-mock lp-mock-site">
      <div className="lp-site-bar"><i /><i /><i /><span style={{ marginLeft: 4 }}>jouwverhuur.nl</span></div>
      <div className="lp-site-hero">
        <img src="/terras.png" alt="" loading="lazy" decoding="async" />
        <div className="ov">
          <b>{t("lp.get.mock.siteTitle")}<br />{t("lp.get.mock.siteTitle2")}</b>
          <span className="tag">{t("lp.get.mock.siteTag")}</span>
          <span className="cta">{t("lp.get.mock.siteCta")}</span>
        </div>
      </div>
    </div>
  );
}

const GET: { icon: IconName; h: string; p: string; visual: () => JSX.Element }[] = [
  { icon: "calendar", h: "lp.get.1h", p: "lp.get.1p", visual: MockChannels },
  { icon: "chart", h: "lp.get.2h", p: "lp.get.2p", visual: MockPricing },
  { icon: "chat", h: "lp.get.3h", p: "lp.get.3p", visual: MockMessages },
  { icon: "sparkle", h: "lp.get.4h", p: "lp.get.4p", visual: MockCleaning },
  { icon: "chart", h: "lp.get.5h", p: "lp.get.5p", visual: MockInsights },
  { icon: "home", h: "lp.get.6h", p: "lp.get.6p", visual: MockSite },
];

export function WatJeKrijgt({ onCta }: { onCta: () => void }) {
  const t = useT();
  return (
    <section className="lp-sec" id="functies">
      <div className="lp-wide">
        <div className="lp-getcentered lp-fade">
          <h2 className="lp-h2">{t("lp.get.title")}</h2>
          <p className="lp-sub">{t("lp.get.sub")}</p>
        </div>
        <div className="lp-get">
          {GET.map((f) => {
            const Visual = f.visual;
            return (
              <article className="lp-get-item lp-fade" key={f.h}>
                <div className="lp-get-txt">
                  <span className="ico"><Icon name={f.icon} size={19} /></span>
                  <h3>{t(f.h)}</h3>
                  <p>{t(f.p)}</p>
                  <button className="lp-get-link" onClick={onCta}>{t("lp.get.more")}</button>
                </div>
                <Visual />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Kennis & inspiratie — kaarten die naar de artikelpagina linken
   ============================================================ */

export function ArtikelKaart({ a }: { a: Artikel }) {
  const t = useT();
  return (
    <Link to={`/kennis/${a.slug}`} className="lp-art-card lp-fade">
      <div className="lp-art-beeld">
        <img src={a.afbeelding} alt="" loading="lazy" decoding="async" />
        <span className="cat">{a.categorie}</span>
      </div>
      <div className="lp-art-meta">{t("lp.kennis.minRead", { n: a.leestijd })}</div>
      <h3 className="lp-art-titel">{a.titel}</h3>
      <p className="lp-art-intro">{a.intro}</p>
      <span className="lp-art-lees">{t("lp.kennis.read")}</span>
    </Link>
  );
}

export function KennisEnInspiratie() {
  const t = useT();
  return (
    <section className="lp-sec alt" id="kennis">
      <div className="lp-container">
        <div className="lp-kennis-hd lp-fade">
          <div className="mid">
            <h2 className="lp-h2">{t("lp.kennis.title")}</h2>
            <p className="lp-sub">{t("lp.kennis.sub")}</p>
          </div>
          <Link to="/kennis" className="lp-kennis-alle">{t("lp.kennis.all")}</Link>
        </div>
        <div className="lp-kennis">
          {ARTIKELEN.map((a) => <ArtikelKaart a={a} key={a.slug} />)}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Uitgelichte review met foto + zwevende cijfers
   ============================================================ */

const STORIES = [
  { quote: "lp.story.1q", body: "lp.story.1b", naam: "Mark & Linda", info: "lp.story.1info",
    bezetting: "82%", bezettingDelta: "+17%", omzet: "€ 9.640", omzetDelta: "+24%" },
  { quote: "lp.story.2q", body: "lp.story.2b", naam: "Nathalie D.", info: "lp.story.2info",
    bezetting: "74%", bezettingDelta: "+12%", omzet: "€ 7.310", omzetDelta: "+19%" },
  { quote: "lp.story.3q", body: "lp.story.3b", naam: "Elise M.", info: "lp.story.3info",
    bezetting: "88%", bezettingDelta: "+9%", omzet: "€ 12.480", omzetDelta: "+21%" },
];

export function UitgelichteReview({ onCta }: { onCta: () => void }) {
  const t = useT();
  const [i, setI] = useState(0);
  const s = STORIES[i];
  const ga = (stap: number) => setI((v) => (v + stap + STORIES.length) % STORIES.length);

  return (
    <div className="lp-story">
      <div className="lp-fade">
        <p className="lp-label">{t("lp.story.label")}</p>
        <h2 className="lp-story-quote">“{t(s.quote)}”</h2>
        <p className="lp-story-body">{t(s.body)}</p>
        <div className="lp-story-who">
          <b>— {s.naam}</b>
          <span>{t(s.info)}</span>
        </div>
        <button className="btn ghost lp-story-cta" onClick={onCta}>{t("lp.story.cta")}</button>
        <div className="lp-story-nav">
          <button className="arrow" onClick={() => ga(-1)} aria-label={t("lp.story.prev")}><Icon name="chevL" /></button>
          <div className="lp-story-dots">
            {STORIES.map((st, idx) => (
              <button
                key={st.naam}
                className={idx === i ? "on" : ""}
                onClick={() => setI(idx)}
                aria-label={t("lp.story.dot", { i: idx + 1, n: STORIES.length })}
                aria-current={idx === i}
              />
            ))}
          </div>
          <button className="arrow" onClick={() => ga(1)} aria-label={t("lp.story.next")}><Icon name="chevR" /></button>
        </div>
      </div>

      <div className="lp-story-art lp-fade">
        <div className="lp-story-photo">
          <img src="/terras.png" alt={t("lp.story.photoAlt")} width={1535} height={1024} loading="lazy" decoding="async" />
        </div>

        <div className="lp-story-card bezet">
          <span className="lbl">{t("lp.story.occupancy")}</span>
          <div className="big"><b className="num">{s.bezetting}</b><span>{s.bezettingDelta}</span></div>
          <svg viewBox="0 0 150 46" preserveAspectRatio="none" style={{ height: 46 }}>
            <defs>
              <linearGradient id="storyLine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1B8A5A" stopOpacity=".24" />
                <stop offset="100%" stopColor="#1B8A5A" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 40 L18 37 L34 39 L52 30 L68 32 L86 22 L104 24 L122 12 L150 5 L150 46 L0 46 Z" fill="url(#storyLine)" />
            <path d="M0 40 L18 37 L34 39 L52 30 L68 32 L86 22 L104 24 L122 12 L150 5"
              fill="none" stroke="#1B8A5A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="axis"><span>1 mei</span><span>15 mei</span><span>31 mei</span></div>
        </div>

        <div className="lp-story-card omzet">
          <span className="lbl">{t("lp.story.revenue")}</span>
          <div className="big"><b className="num">{s.omzet}</b><span>{s.omzetDelta}</span></div>
          <svg viewBox="0 0 176 52" preserveAspectRatio="none" style={{ height: 52 }}>
            {[24, 34, 28, 58, 40, 48, 36, 70, 30].map((h, idx) => (
              <rect key={idx} x={idx * 19 + 3} y={52 - (h / 74) * 52} width={12} height={(h / 74) * 52} rx={3}
                fill="var(--coral)" opacity={idx === 7 ? 1 : 0.75} />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
