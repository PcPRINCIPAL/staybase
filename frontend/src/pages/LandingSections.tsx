import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon, type IconName } from "../components/Icon";
import { ARTIKELEN, type Artikel } from "../content/artikelen";

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

const RUIMTES = ["Slaapkamer", "Badkamer", "Keuken", "Woonkamer"];

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
  return (
    <div className="lp-mock">
      <span className="lbl">Aanbevolen prijs</span>
      <div className="big"><b className="num">€ 196</b><span>+12%</span></div>
      <svg viewBox="0 0 160 56" preserveAspectRatio="none" style={{ height: 56 }}>
        <defs>
          <linearGradient id="mockPrice" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF385C" stopOpacity=".26" />
            <stop offset="100%" stopColor="#FF385C" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 48 L18 45 L34 47 L50 38 L66 40 L82 30 L98 32 L114 20 L132 14 L146 12 L160 6 L160 56 L0 56 Z" fill="url(#mockPrice)" />
        <path d="M0 48 L18 45 L34 47 L50 38 L66 40 L82 30 L98 32 L114 20 L132 14 L146 12 L160 6"
          fill="none" stroke="#FF385C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="axis"><span>1 mei</span><span>15 mei</span><span>31 mei</span></div>
    </div>
  );
}

function MockMessages() {
  return (
    <div className="lp-mock-stack">
      <div className="lp-mock-float">
        <span className="av">👩</span>
        <div>
          <b>Nieuwe reservering</b>
          <span>Lisan · Zojuist</span>
        </div>
      </div>
      <div className="lp-mock">
        <div className="lp-mock-row" style={{ padding: 0, borderTop: "none" }}>
          <span className="nm" style={{ fontWeight: 800 }}>Incheckinformatie</span>
          <span style={{ color: "var(--good)", fontWeight: 700 }}>Nu</span>
        </div>
        <p style={{ marginTop: 8, lineHeight: 1.55, color: "var(--muted)" }}>
          Beste Emma,<br />
          Je incheckinformatie voor je verblijf van 12–19 mei.
        </p>
        <span className="lp-msg-btn">Bekijk incheckgids</span>
      </div>
    </div>
  );
}

function MockCleaning() {
  return (
    <div className="lp-mock">
      <div className="mock-hd">Schoonmaak na check-out</div>
      <p className="lp-mock-sub">Vandaag 11:00</p>
      {RUIMTES.map((r) => (
        <div className="lp-mock-check" key={r}>
          <span className="tick">✓</span>
          <span>{r}</span>
          <span className="done">✓</span>
        </div>
      ))}
    </div>
  );
}

function MockInsights() {
  const bars = [26, 38, 30, 62, 44, 52, 40, 78, 34];
  return (
    <div className="lp-mock">
      <span className="lbl">Bezettingsgraad</span>
      <div className="big"><b className="num">78%</b><span>+18%</span></div>
      <svg viewBox="0 0 160 60" preserveAspectRatio="none" style={{ height: 60, marginTop: 8 }}>
        {bars.map((h, i) => (
          <rect key={i} x={i * 18 + 2} y={60 - (h / 80) * 60} width={11} height={(h / 80) * 60} rx={3} fill="#FF385C"
            opacity={i === 7 ? 1 : 0.78} />
        ))}
      </svg>
    </div>
  );
}

function MockSite() {
  return (
    <div className="lp-mock lp-mock-site">
      <div className="lp-site-bar"><i /><i /><i /><span style={{ marginLeft: 4 }}>jouwverhuur.nl</span></div>
      <div className="lp-site-hero">
        <img src="/terras.png" alt="" loading="lazy" decoding="async" />
        <div className="ov">
          <b>Ontspannen<br />verblijven.</b>
          <span className="tag">Voor je thuis, waar je ook bent.</span>
          <span className="cta">Boek direct</span>
        </div>
      </div>
    </div>
  );
}

const GET: { icon: IconName; h: string; p: string; visual: () => JSX.Element }[] = [
  {
    icon: "calendar", h: "Channel manager",
    p: "Synchroniseer al je boekingen over Airbnb, Booking.com en meer. Altijd up-to-date.",
    visual: MockChannels,
  },
  {
    icon: "chart", h: "Dynamic pricing",
    p: "Onze slimme prijsadviezen passen zich dagelijks aan op vraag en aanbod.",
    visual: MockPricing,
  },
  {
    icon: "chat", h: "Gastcommunicatie",
    p: "Automatiseer berichten en geef je gasten een uitstekende ervaring.",
    visual: MockMessages,
  },
  {
    icon: "sparkle", h: "Schoonmaak & taken",
    p: "Plan en beheer schoonmaak, onderhoud en taken op één centrale plek.",
    visual: MockCleaning,
  },
  {
    icon: "chart", h: "Inzichten & rapportages",
    p: "Real-time inzichten in je bezetting, omzet en prestaties.",
    visual: MockInsights,
  },
  {
    icon: "home", h: "Eigen website (optioneel)",
    p: "Krijg meer directe boekingen via je eigen professionele website.",
    visual: MockSite,
  },
];

export function WatJeKrijgt({ onCta }: { onCta: () => void }) {
  return (
    <section className="lp-sec" id="functies">
      <div className="lp-wide">
        <div className="lp-getcentered lp-fade">
          <h2 className="lp-h2">Wat je krijgt met Staybase</h2>
          <p className="lp-sub">Alles wat je nodig hebt om slimmer te verhuren en meer rendement te behalen.</p>
        </div>
        <div className="lp-get">
          {GET.map((f) => {
            const Visual = f.visual;
            return (
              <article className="lp-get-item lp-fade" key={f.h}>
                <div className="lp-get-txt">
                  <span className="ico"><Icon name={f.icon} size={19} /></span>
                  <h3>{f.h}</h3>
                  <p>{f.p}</p>
                  <button className="lp-get-link" onClick={onCta}>Meer informatie →</button>
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
  return (
    <Link to={`/kennis/${a.slug}`} className="lp-art-card lp-fade">
      <div className="lp-art-beeld">
        <img src={a.afbeelding} alt="" loading="lazy" decoding="async" />
        <span className="cat">{a.categorie}</span>
      </div>
      <div className="lp-art-meta">{a.leestijd} min lezen</div>
      <h3 className="lp-art-titel">{a.titel}</h3>
      <p className="lp-art-intro">{a.intro}</p>
      <span className="lp-art-lees">Lees meer →</span>
    </Link>
  );
}

export function KennisEnInspiratie() {
  return (
    <section className="lp-sec alt" id="kennis">
      <div className="lp-container">
        <div className="lp-kennis-hd lp-fade">
          <div className="mid">
            <h2 className="lp-h2">Kennis &amp; inspiratie</h2>
            <p className="lp-sub">Praktische tips en inzichten om meer uit jouw verhuur te halen.</p>
          </div>
          <Link to={`/kennis/${ARTIKELEN[0].slug}`} className="lp-kennis-alle">Bekijk alle artikelen →</Link>
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
  {
    quote: "Wij verdienen meer en hebben ons leven terug.",
    body: "Sinds we Staybase gebruiken, besparen we wekelijks uren en is onze bezettingsgraad flink gestegen. De ondersteuning is top!",
    naam: "Mark & Linda",
    info: "Verhuren 2 woningen in Zeeland",
    bezetting: "82%", bezettingDelta: "+17%",
    omzet: "€ 9.640", omzetDelta: "+24%",
  },
  {
    quote: "Voor het eerst overzicht in plaats van brandjes blussen.",
    body: "Alle kanalen in één kalender en de gastberichten die zichzelf schrijven. Ik kijk 's ochtends even mee en dat is het.",
    naam: "Nathalie D.",
    info: "2 panden · Gent en de Ardennen",
    bezetting: "74%", bezettingDelta: "+12%",
    omzet: "€ 7.310", omzetDelta: "+19%",
  },
  {
    quote: "De prijsvoorstellen betaalden het abonnement in één weekend terug.",
    body: "Ik zag niet dat ik structureel onder de markt zat. Eén voorstel goedkeuren en het verschil was er meteen.",
    naam: "Elise M.",
    info: "3 panden · Knokke",
    bezetting: "88%", bezettingDelta: "+9%",
    omzet: "€ 12.480", omzetDelta: "+21%",
  },
];

export function UitgelichteReview({ onCta }: { onCta: () => void }) {
  const [i, setI] = useState(0);
  const s = STORIES[i];
  const ga = (stap: number) => setI((v) => (v + stap + STORIES.length) % STORIES.length);

  return (
    <div className="lp-story">
      <div className="lp-fade">
        <p className="lp-label">Echte verhuurders, echte resultaten</p>
        <h2 className="lp-story-quote">“{s.quote}”</h2>
        <p className="lp-story-body">{s.body}</p>
        <div className="lp-story-who">
          <b>— {s.naam}</b>
          <span>{s.info}</span>
        </div>
        <button className="btn ghost lp-story-cta" onClick={onCta}>Lees hun verhaal →</button>
        <div className="lp-story-nav">
          <button className="arrow" onClick={() => ga(-1)} aria-label="Vorig verhaal"><Icon name="chevL" /></button>
          <div className="lp-story-dots">
            {STORIES.map((st, idx) => (
              <button
                key={st.naam}
                className={idx === i ? "on" : ""}
                onClick={() => setI(idx)}
                aria-label={`Verhaal ${idx + 1} van ${STORIES.length}`}
                aria-current={idx === i}
              />
            ))}
          </div>
          <button className="arrow" onClick={() => ga(1)} aria-label="Volgend verhaal"><Icon name="chevR" /></button>
        </div>
      </div>

      <div className="lp-story-art lp-fade">
        <div className="lp-story-photo">
          <img src="/terras.png" alt="Terras van een vakantiewoning bij zonsondergang" width={1535} height={1024} loading="lazy" decoding="async" />
        </div>

        <div className="lp-story-card bezet">
          <span className="lbl">Bezettingsgraad</span>
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
          <span className="lbl">Omzet deze maand</span>
          <div className="big"><b className="num">{s.omzet}</b><span>{s.omzetDelta}</span></div>
          <svg viewBox="0 0 176 52" preserveAspectRatio="none" style={{ height: 52 }}>
            {[24, 34, 28, 58, 40, 48, 36, 70, 30].map((h, idx) => (
              <rect key={idx} x={idx * 19 + 3} y={52 - (h / 74) * 52} width={12} height={(h / 74) * 52} rx={3}
                fill="#FF385C" opacity={idx === 7 ? 1 : 0.75} />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
