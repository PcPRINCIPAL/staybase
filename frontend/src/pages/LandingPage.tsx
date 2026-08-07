import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Logo } from "../components/Icon";
import { Calculator } from "./Calculator";
import "./landing.css";

/**
 * Zet hier de URL van de demovideo zodra die er is — bv. "/demo.mp4" wanneer
 * het bestand in frontend/public/ staat, of een volledige URL. Zolang dit leeg
 * is, toont de modal een nette placeholder.
 */
const DEMO_VIDEO_URL = "";

const NAV = [
  { href: "#hoe", label: "Hoe het werkt" },
  { href: "#calculator", label: "Bereken je waarde" },
  { href: "#prijzen", label: "Prijzen" },
  { href: "#verhalen", label: "Verhalen" },
];

const USPS = [
  { icon: "tag" as const, h: "Slimme prijzen", p: "Maximaliseer je bezetting en opbrengst." },
  { icon: "chat" as const, h: "Gasten op 1 plek", p: "Van boeking tot review, alles geregeld." },
  { icon: "chart" as const, h: "Overzicht & controle", p: "Inzichten die je helpen slimmer te verhuren." },
];

const PIJN = [
  { em: "⏰", h: "12+ uur per week aan beheer", p: "Gastberichten om 23u. Poetshulp via WhatsApp. Agenda's op drie platformen. Het pand verdient; de eigenaar ligt wakker." },
  { em: "📉", h: "Prijzen op gevoel", p: "De meeste verhuurders zetten één tarief en laten het staan. Vraag, evenementen en seizoenen blijven onbenut. Gemiddeld verlies: 15–22% per jaar." },
  { em: "🧩", h: "Alles loopt via jou", p: "Gasten, prijzen, kalenders en poetsdiensten: zolang jij alles opvolgt werkt het. Tot het te druk wordt." },
  { em: "🏦", h: "Agentschappen nemen 20–30%", p: "Het enige volledige alternatief kost je je marge, je controle én de directe band met je gasten." },
];

const FEATURES = [
  { em: "🔄", h: "Eén kalender, alle kanalen", p: "Staybase verbindt je woning met Airbnb, Booking.com en VRBO en synchroniseert beschikbaarheid, prijzen en reserveringen automatisch. Meer bereik, geen dubbele boekingen, één overzicht." },
  { em: "💬", h: "Gastcommunicatie in jouw stem", p: "AI-berichten getraind op het karakter van jouw pand en jouw toon. Gasten krijgen antwoorden die klinken als persoonlijke notities. Jij keurt goed met één tik — of niet meer, zodra het vertrouwen er is." },
  { em: "🧽", h: "Poetsbeheer, automatisch", p: "Bij elke check-out vertrekt de poetsopdracht vanzelf. Je eigen team eerst; geen antwoord, dan springt de marktplaats bij. Niets valt tussen uitcheck en incheck." },
  { em: "📈", h: "Slimme prijzen die je agenda beschermen", badge: "Craft", p: "Staybase volgt de markt en komt met heldere voorstellen wanneer je tarief beter kan. Eén voorstel, één beslissing." },
];

const AI_KAARTEN = [
  { em: "📋", n: "01", h: "Vijf vragen over je pand", p: "Je beschrijft het karakter van je pand, je gasten en je toon. Dat wordt de instructieset van de AI." },
  { em: "✏️", n: "02", h: "Elke aanpassing maakt het scherper", p: "Verander je een woord, dan leert het model mee. Na 20 goedgekeurde berichten hoef je nauwelijks nog bij te sturen." },
  { em: "🛡️", n: "03", h: "Vertrouwen wordt verdiend", p: "De AI start in goedkeuringsmodus en verdient pas daarna autonomie. Kortingen en voorwaarden blijven altijd bij jou." },
];

const VERHALEN = [
  { av: "ND", naam: "Nathalie D.", info: "2 panden · Gent en de Ardennen", q: "Vroeger ging mijn zondagavond op aan berichten en paniek over mijn agenda. Nu open ik Staybase op maandagmorgen, zie dat alles geregeld is, en ga door met mijn dag." },
  { av: "PV", naam: "Pieter V.", info: "8 panden · België", q: "Ik stelde het opstarten uit omdat ik dacht dat het ingewikkeld zou zijn. Achteraf was alles sneller geregeld dan verwacht." },
  { av: "EM", naam: "Elise M.", info: "3 panden · Knokke", q: "Ik heb zoveel zorg in dit pand gestoken. Staybase is het eerste dat dat lijkt te begrijpen. De berichten klinken als mij, niet als een hotelketen." },
];

const FAQ = [
  { v: "Klinken de AI-berichten als mij — of als elke andere verhuurder?", a: "Dat hangt bijna volledig af van de vijf vragen die je bij de start beantwoordt. Verhuurders die tien minuten nemen om het karakter van hun pand, hun typische gast en hun toon te beschrijven, krijgen berichten die gasten voor persoonlijke notities houden." },
  { v: "Dwingt dynamische prijszetting mij tot korting geven?", a: "Nee. Het model werkt op vraag, niet op leegstandsangst — het stelt vaker verhogingen dan verlagingen voor. Je zet ook een bodemprijs per pand: daar gaat niets onder zonder jouw expliciete goedkeuring." },
  { v: "Wat gebeurt er met mijn reviews en Superhost-status?", a: "Niets. Staybase werkt achter je bestaande listings en beheert de operationele laag. Je Airbnb-profiel, reviewgeschiedenis en Superhost-status blijven onaangeroerd." },
  { v: "Hoe lang duurt het opzetten echt?", a: "Je Airbnb koppelen duurt acht minuten, de stemscan van je pand vier. Je eerste AI-bericht staat er binnen enkele minuten na die scan." },
  { v: "Kan ik stoppen wanneer ik wil?", a: "Ja. Geen contract, geen opstartkosten, maandelijks opzegbaar met één klik. De eerste veertien dagen zijn gratis en vragen geen kaartgegevens." },
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

/** Voegt .in toe zodra een element in beeld scrollt. */
function useFadeIn() {
  useEffect(() => {
    const els = document.querySelectorAll(".lp-fade");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { rootMargin: "0px 0px -60px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function VideoModal({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="lp-modal" onMouseDown={(e) => { if (e.target === ref.current) onClose(); }} ref={ref}>
      <div className="lp-modal-box" role="dialog" aria-label="Demovideo">
        <div className="lp-modal-head">
          <span style={{ fontSize: 18 }}>🎬</span>
          <b>Staybase in 2 minuten</b>
          <button className="icon-btn" style={{ marginLeft: "auto" }} onClick={onClose} aria-label="Sluiten">
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const navRef = useRef<HTMLElement>(null);
  useNavHeight(navRef);
  useFadeIn();

  const naarLogin = () => nav("/login");

  return (
    <div className="lp">
      {/* NAV */}
      <header className="lp-nav" ref={navRef}>
        <div className="lp-nav-in">
          <a href="#top" className="logo" style={{ fontSize: 21 }}>
            <Logo /> staybase
          </a>
          <nav className="lp-nav-links">
            {NAV.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
          </nav>
          <div className="lp-nav-cta">
            <button className="btn ghost sm" onClick={naarLogin}>Log in</button>
            <button className="btn coral sm" onClick={naarLogin}>Gratis proberen</button>
          </div>
          <button className="lp-burger" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
            <Icon name={menuOpen ? "x" : "menu"} size={22} />
          </button>
        </div>
        <div className={`lp-mobile ${menuOpen ? "open" : ""}`}>
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)}>{n.label}</a>
          ))}
          <button className="btn coral" style={{ justifyContent: "center", marginTop: 8 }} onClick={naarLogin}>
            Gratis proberen
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
                <p className="lp-label lp-fade">Verhuur als een professional</p>
                <h1 className="lp-fade">Meer rendement. <em>Minder gedoe.</em></h1>
                <p className="lp-hero-sub lp-fade">
                  Staybase is het alles-in-één platform voor verhuurders die meer uit hun
                  vakantiewoning willen halen — zonder de controle uit handen te geven.
                </p>
                <div className="lp-usps lp-fade">
                  {USPS.map((u) => (
                    <div className="lp-usp" key={u.h}>
                      <span className="ico"><Icon name={u.icon} size={19} /></span>
                      <div>
                        <b>{u.h}</b>
                        <span>{u.p}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="lp-hero-ctas lp-fade">
                  <button className="btn coral lp-btn-lg" onClick={naarLogin}>Gratis proberen</button>
                  <button className="btn ghost lp-btn-lg" onClick={() => setVideoOpen(true)}>▶︎ Bekijk de demo (2 min)</button>
                </div>
                <p className="lp-hero-trust lp-fade">Geen contract. Geen opstartkosten. Maandelijks opzegbaar.</p>
              </div>

              <div className="lp-hero-art lp-fade" aria-hidden="true">
                <div className="lp-hero-canvas" />

                <div className="lp-card lp-card-income">
                  <span className="lbl">Inkomsten deze maand</span>
                  <div className="amt"><b className="num">€ 8.945</b><span>+23%</span></div>
                  <svg viewBox="0 0 160 42" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="lpSpark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF385C" stopOpacity=".28" />
                        <stop offset="100%" stopColor="#FF385C" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0 36 L20 33 L40 34 L60 26 L80 22 L100 24 L120 14 L140 9 L160 4 L160 42 L0 42 Z" fill="url(#lpSpark)" />
                    <path d="M0 36 L20 33 L40 34 L60 26 L80 22 L100 24 L120 14 L140 9 L160 4"
                      fill="none" stroke="#FF385C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="axis"><span>1 jul</span><span>15 jul</span><span>31 jul</span></div>
                </div>

                <div className="lp-card lp-card-book">
                  <div className="hd"><b>Boekingen</b><span>Meer bekijken</span></div>
                  {[
                    { av: "🌊", nm: "Sophie & Bram", dt: "3–8 jul", st: "ok", lb: "Bevestigd" },
                    { av: "⛱️", nm: "Familie Müller", dt: "10–17 jul", st: "ok", lb: "Bevestigd" },
                    { av: "🚲", nm: "Familie Peeters", dt: "17–24 jul", st: "wait", lb: "Vandaag" },
                    { av: "🐚", nm: "Claire Dubois", dt: "26–31 jul", st: "ok", lb: "Bevestigd" },
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
                      <div className="dt">2 dagen geleden</div>
                    </div>
                    <span className="stars">★★★★★</span>
                  </div>
                  <p>“Prachtig huis, alles was perfect geregeld. We komen zeker terug!”</p>
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
                <b>Vertrouwd door verhuurders aan de Belgische kust</b>
                <span>Gebouwd vanuit Linnois, dat vandaag zelf vakantiewoningen in Knokke beheert.</span>
              </div>
              <div className="lp-stats-nums">
                <div className="lp-stat"><b className="num">+23%</b><span>gemiddelde omzetgroei in de eerste 90 dagen</span></div>
                <div className="lp-stat"><b className="num">4 uur</b><span>per week minder beheertijd</span></div>
                <div className="lp-stat"><b className="num">4,87</b><span>gemiddelde reviewscore</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PIJN */}
      <section className="lp-sec" id="verhuurders">
        <div className="lp-container">
          <p className="lp-label lp-fade">Klinkt dit bekend?</p>
          <h2 className="lp-h2 lp-fade">Zelf beheren kost tijd.<br />Uitbesteden kost rendement.</h2>
          <p className="lp-sub lp-fade">Dit is waarom zoveel verhuurders vastlopen.</p>
          <div className="lp-pain">
            {PIJN.map((p) => (
              <article className="lp-pain-card lp-fade" key={p.h}>
                <span className="em">{p.em}</span>
                <h3>{p.h}</h3>
                <p>{p.p}</p>
              </article>
            ))}
          </div>
          <div className="lp-quote lp-fade">
            <blockquote>
              “Ik geniet van het extra inkomen, maar eerlijk gezegd stresst het me. Ik heb altijd het gevoel
              dat één slechte review alles kan verstoren.”
            </blockquote>
            <cite>— Vakantieverhuurder, Belgische kust</cite>
          </div>
        </div>
      </section>

      {/* HOE */}
      <section className="lp-sec alt" id="hoe">
        <div className="lp-container">
          <p className="lp-label lp-fade">Hoe het werkt</p>
          <h2 className="lp-h2 lp-fade">De ervaring van een professionele beheerder,<br />geleverd als software.</h2>
          <p className="lp-sub lp-fade">
            Staybase neemt het repetitieve werk over en geeft jou één rustig overzicht waar bijna alles al geregeld is.
          </p>
          <div className="lp-features">
            {FEATURES.map((f) => (
              <article className="lp-feature lp-fade" key={f.h}>
                <span className="em">{f.em}</span>
                <div>
                  <h3>{f.h}{f.badge && <span className="lp-badge">{f.badge}</span>}</h3>
                  <p>{f.p}</p>
                  {f.badge && (
                    <div className="lp-price-demo">
                      Jouw huidige tarief: <b>€140 per nacht</b><br />
                      Vergelijkbare woningen: <b>€185–€210 per nacht</b><br />
                      Voorstel: <b className="voorstel">€175 per nacht</b>
                      <small>Eén voorstel. Eén beslissing. Klaar.</small>
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
            <p className="lp-label">Zie jouw cijfers</p>
            <h2 className="lp-h2">Wat is jouw vakantieverhuur werkelijk waard?</h2>
            <p>Vul je huidige situatie in. Geen e-mailadres nodig — de berekening is van jou, niet van ons.</p>
          </div>
          <Calculator onCta={naarLogin} />
        </div>
      </section>

      {/* PRIJZEN */}
      <section className="lp-sec" id="prijzen">
        <div className="lp-container">
          <p className="lp-label lp-fade">Prijzen</p>
          <h2 className="lp-h2 lp-fade">Eén prijs per pand. Geen commissies. Geen verrassingen.</h2>
          <p className="lp-sub lp-fade">Kies het abonnement dat past bij hoe jij verhuurt.</p>

          <div className="lp-plans">
            <div className="lp-plan lp-fade">
              <p className="lp-plan-label">Voor de onafhankelijke verhuurder</p>
              <div className="lp-plan-name">Host</div>
              <div className="lp-plan-price"><b className="num">€59</b><span>/pand/maand</span></div>
              <p className="lp-plan-disc">−10% vanaf 5 panden · −15% vanaf 10</p>
              <ul>
                <li><span className="tick">✓</span>Synchronisatie met Airbnb, Booking.com en VRBO</li>
                <li><span className="tick">✓</span>Automatische gastcommunicatie</li>
                <li><span className="tick">✓</span>Poetsbeheer en wisseldagen</li>
                <li><span className="tick">✓</span>Kalender- en boekingsdashboard</li>
                <li><span className="tick">✓</span>Opbrengst- en bezettingsrapporten</li>
                <li className="locked"><span>🔒</span>Dynamische prijzen — enkel Craft</li>
                <li className="locked"><span>🔒</span>Stembibliotheek — enkel Craft</li>
                <li className="locked"><span>🔒</span>Eigen boekingspagina — enkel Craft</li>
              </ul>
              <div className="lp-plan-note">Op dag 30 zie je als Host-klant wat dynamische prijzen je vorige maand hadden opgeleverd.</div>
              <button className="btn ghost" onClick={naarLogin}>Gratis proberen</button>
            </div>

            <div className="lp-plan top lp-fade">
              <span className="lp-plan-badge">Meest gekozen</span>
              <p className="lp-plan-label">Voor de hospitality-host</p>
              <div className="lp-plan-name">Craft</div>
              <div className="lp-plan-price"><b className="num">€99</b><span>/pand/maand</span></div>
              <p className="lp-plan-disc">−10% vanaf 5 panden · −15% vanaf 10</p>
              <ul>
                <li><span className="tick">✓</span>Alles uit Host</li>
                <li className="hi">⭐ Dynamische prijzen — vraaggestuurd, altijd door jou goedgekeurd</li>
                <li><span className="tick">✓</span>Stembibliotheek — AI in precies jouw toon</li>
                <li><span className="tick">✓</span>Eigen boekingspagina — nul commissie</li>
                <li><span className="tick">✓</span>Gastbelevingstijdlijn</li>
                <li><span className="tick">✓</span>Reviewantwoorden in jouw stem</li>
                <li><span className="tick">✓</span>Persoonlijk onboardinggesprek (30 min)</li>
              </ul>
              <button className="btn coral" onClick={naarLogin}>Gratis proberen</button>
            </div>
          </div>

          <table className="lp-vol lp-fade">
            <thead><tr><th>Panden</th><th>Host</th><th>Craft</th></tr></thead>
            <tbody>
              <tr><td>1–4</td><td><b>€59</b> / pand</td><td><b>€99</b> / pand</td></tr>
              <tr><td>5–9</td><td><b>€53,10</b> <span className="off">−10%</span></td><td><b>€89,10</b> <span className="off">−10%</span></td></tr>
              <tr><td>10+</td><td><b>€50,15</b> <span className="off">−15%</span></td><td><b>€84,15</b> <span className="off">−15%</span></td></tr>
            </tbody>
          </table>
          <p style={{ fontSize: 12.5, color: "var(--faint)" }}>Kortingen gelden voor al je panden zodra je de drempel bereikt.</p>

          <div className="lp-guarantee lp-fade">
            <span className="em">🛡️</span>
            <div>
              <h4>14 dagen gratis proberen — geen kaartgegevens nodig</h4>
              <p>Voelt Staybase in de eerste twee weken niet goed? Eén klik en het stopt. Geen factuur, geen gesprek.</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI */}
      <section className="lp-sec alt">
        <div className="lp-container">
          <p className="lp-label lp-fade">Jouw stem, versterkt</p>
          <h2 className="lp-h2 lp-fade">Berichten die klinken als jij —<br />niet als elke andere verhuurder.</h2>
          <p className="lp-sub lp-fade">Jouw pand heeft een karakter. Staybase leert het kennen.</p>
          <div className="lp-ai">
            {AI_KAARTEN.map((k) => (
              <article className="lp-ai-card lp-fade" key={k.n}>
                <span className="em">{k.em}</span>
                <div className="num">{k.n}</div>
                <h3>{k.h}</h3>
                <p>{k.p}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* VERHALEN */}
      <section className="lp-sec" id="verhalen">
        <div className="lp-container">
          <p className="lp-label lp-fade">Wat verhuurders zeggen</p>
          <h2 className="lp-h2 lp-fade">Na de eerste maand.</h2>
          <div className="lp-testi">
            {VERHALEN.map((t) => (
              <article className="lp-testi-card lp-fade" key={t.naam}>
                <div className="lp-stars">★★★★★</div>
                <p>“{t.q}”</p>
                <div className="lp-testi-who">
                  <span className="av">{t.av}</span>
                  <div><b>{t.naam}</b><span>{t.info}</span></div>
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
              <p className="lp-label lp-fade">Ons verhaal</p>
              <h2 className="lp-h2 lp-fade">Gebouwd vanuit ervaring.<br /><em>Niet vanuit theorie.</em></h2>
              <p className="lp-founders-text lp-fade">
                Staybase komt voort uit Linnois, een hospitalityconcept aan de Belgische kust. Bij het beheren van
                vakantiewoningen zagen we hetzelfde probleem telkens terugkeren: eigenaars moesten kiezen tussen twee
                uitersten. Alles zelf doen en uren verliezen aan administratie, prijszetting en opvolging. Of het beheer
                volledig uit handen geven en een flink deel van de opbrengst afstaan.
                <br /><br />
                Staybase is gebouwd vanuit de overtuiging dat er een betere manier moest bestaan.
                <br /><br />
                <em>Helpt dit eigenaars om slimmer te verhuren, met minder werk en meer controle?</em><br />
                Is het antwoord nee, dan bouwen we het niet.
              </p>
              <div className="lp-founder-cards">
                <div className="lp-founder lp-fade">
                  <span className="av">BD</span>
                  <div>
                    <h4>Benoit Desintebin</h4>
                    <div className="rol">Medeoprichter &amp; CEO</div>
                    <p>Bracht de operationele visie naar het product. Elke functie is te herleiden tot één doel: vakantieverhuur eenvoudiger en rendabeler maken.</p>
                  </div>
                </div>
                <div className="lp-founder lp-fade">
                  <span className="av">JC</span>
                  <div>
                    <h4>Julie Cousin</h4>
                    <div className="rol">Medeoprichter &amp; CPO</div>
                    <p>Bracht het hospitalitydenken naar het product. Elke UX-beslissing is te herleiden tot echte gasten en wat zij nodig hadden.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lp-fade">
              <div className="lp-founders-photo">
                <img
                  src="/linnois.webp"
                  alt="De oprichters van Staybase voor het Linnois-kantoor in Knokke"
                  width={750}
                  height={1000}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <p className="lp-founders-cap">Linnois · Knokke — waar Staybase begon.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-sec alt">
        <div className="lp-container">
          <p className="lp-label lp-fade">Vragen</p>
          <h2 className="lp-h2 lp-fade">Eerlijke antwoorden.</h2>
          <div className="lp-faq lp-fade">
            {FAQ.map((f, i) => (
              <div className={`lp-faq-item ${faqOpen === i ? "open" : ""}`} key={f.v}>
                <button className="lp-faq-q" aria-expanded={faqOpen === i} onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                  <b>{f.v}</b>
                  <span className="chev"><Icon name="chevD" /></span>
                </button>
                <div className="lp-faq-a"><p>{f.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LAATSTE CTA */}
      <section className="lp-final">
        <div className="lp-container">
          <h2 className="lp-fade">Je pand is meer waard dan een spreadsheet kan meten.</h2>
          <p className="sub lp-fade">Start met Host, upgrade wanneer je meer wil verdienen. Koppel je Airbnb in acht minuten.</p>
          <div className="lp-final-ctas lp-fade">
            <button className="btn coral lp-btn-lg" onClick={naarLogin}>Gratis proberen</button>
            <a className="lp-final-link" href="#hoe">Bekijk hoe het werkt →</a>
          </div>
          <p style={{ fontSize: 13, color: "var(--faint)" }}>Geen kaartgegevens. Geen contract. Maandelijks opzegbaar.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-top">
            <div className="lp-footer-col">
              <div className="logo" style={{ color: "#fff" }}><Logo size={26} /> staybase</div>
              <p className="lp-footer-tag">Het beheersysteem voor onafhankelijke vakantieverhuurders.</p>
            </div>
            <div className="lp-footer-col">
              <h5>Product</h5>
              <a href="#hoe">Hoe het werkt</a>
              <a href="#prijzen">Prijzen</a>
              <a href="#calculator">Bereken je waarde</a>
            </div>
            <div className="lp-footer-col">
              <h5>Bedrijf</h5>
              <a href="#verhalen">Verhalen</a>
              <a href="#top">Over ons</a>
            </div>
            <div className="lp-footer-col">
              <h5>Aan de slag</h5>
              <button className="btn coral sm" style={{ justifyContent: "center" }} onClick={naarLogin}>Gratis proberen</button>
              <a onClick={naarLogin} style={{ marginTop: 12 }}>Ik heb al een account →</a>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>© 2026 Staybase · alle data op deze demo is fictief</span>
            <span>Een voorstel van Oblivion Labs</span>
          </div>
        </div>
      </footer>

      {videoOpen && <VideoModal onClose={() => setVideoOpen(false)} />}
    </div>
  );
}
