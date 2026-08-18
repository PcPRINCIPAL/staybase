import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Icon";
import { ArtikelKaart } from "./LandingSections";
import { ARTIKELEN } from "../content/artikelen";
import { useFadeIn } from "../lib/useFadeIn";
import "./landing.css";

/** Publieke overzichtspagina van alle kennisbank-artikels. */
export function KennisPage() {
  const nav = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  useFadeIn([]);

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-nav-in">
          <Link to="/" className="logo" style={{ fontSize: 21 }}>
            <Logo /> staybase
          </Link>
          <div className="lp-nav-cta" style={{ marginLeft: "auto" }}>
            <button className="btn ghost sm" onClick={() => nav("/login")}>Log in</button>
            <button className="btn coral sm" onClick={() => nav("/registreer")}>Gratis proberen</button>
          </div>
        </div>
      </header>

      <div className="art-wrap kennis-wrap">
        <Link to="/#kennis" className="art-terug">← Terug naar de website</Link>
        <h1 className="art-titel">Kennis &amp; inspiratie</h1>
        <p className="art-intro">
          Praktische tips en inzichten om meer uit jouw verhuur te halen — geschreven voor
          eigenaars die het liefst zo min mogelijk tijd kwijt zijn aan hun vakantiewoning.
        </p>
        <div className="kennis-grid">
          {ARTIKELEN.map((a) => <ArtikelKaart a={a} key={a.slug} />)}
        </div>

        <div className="art-cta">
          <h3>Liever dat Staybase het gewoon voor je doet?</h3>
          <p>
            Staybase neemt het repetitieve werk over — prijzen, gastberichten en schoonmaak —
            en laat de beslissingen bij jou.
          </p>
          <button className="btn coral" onClick={() => nav("/registreer")}>Probeer Staybase gratis</button>
        </div>
      </div>

      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-bottom" style={{ paddingTop: 0 }}>
            <span>© 2026 Staybase · alle data op deze demo is fictief</span>
            <span>Een voorstel van Oblivion Labs</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
