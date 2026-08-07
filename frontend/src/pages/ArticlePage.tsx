import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Logo } from "../components/Icon";
import { ArtikelKaart } from "./LandingSections";
import { ARTIKELEN, artikelBySlug, datumLabel, type Blok } from "../content/artikelen";
import { useFadeIn } from "../lib/useFadeIn";
import "./landing.css";

function Inhoud({ blok }: { blok: Blok }) {
  switch (blok.type) {
    case "h2":
      return <h2>{blok.tekst}</h2>;
    case "p":
      return <p>{blok.tekst}</p>;
    case "lijst":
      return <ul>{blok.items.map((i) => <li key={i}>{i}</li>)}</ul>;
    case "tip":
      return (
        <div className="art-tip">
          <b>💡 {blok.titel}</b>
          <p>{blok.tekst}</p>
        </div>
      );
    case "quote":
      return (
        <blockquote className="art-quote">
          <p>“{blok.tekst}”</p>
          {blok.bron && <cite>— {blok.bron}</cite>}
        </blockquote>
      );
  }
}

export function ArticlePage() {
  const { slug } = useParams();
  const nav = useNavigate();
  const artikel = slug ? artikelBySlug(slug) : undefined;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);
  useFadeIn([slug]);

  if (!artikel) return <Navigate to="/" replace />;

  const andere = ARTIKELEN.filter((a) => a.slug !== artikel.slug);

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-nav-in">
          <Link to="/" className="logo" style={{ fontSize: 21 }}>
            <Logo /> staybase
          </Link>
          <div className="lp-nav-cta" style={{ marginLeft: "auto" }}>
            <button className="btn ghost sm" onClick={() => nav("/login")}>Log in</button>
            <button className="btn coral sm" onClick={() => nav("/login")}>Gratis proberen</button>
          </div>
        </div>
      </header>

      <article className="art-wrap">
        <Link to="/#kennis" className="art-terug">← Alle artikelen</Link>

        <span className="art-cat">{artikel.categorie}</span>
        <h1 className="art-titel">{artikel.titel}</h1>
        <div className="art-meta">
          <span>{datumLabel(artikel.datum)}</span>
          <span>·</span>
          <span>{artikel.leestijd} min lezen</span>
        </div>
        <p className="art-intro">{artikel.intro}</p>

        <div className="art-beeld">
          <img src={artikel.afbeelding} alt="" width={1536} height={1024} decoding="async" />
        </div>

        <div className="art-body">
          {artikel.blokken.map((b, i) => <Inhoud blok={b} key={i} />)}
        </div>

        <div className="art-cta">
          <h3>Wil je dit niet allemaal zelf opvolgen?</h3>
          <p>
            Staybase neemt het repetitieve werk over — prijzen, gastberichten en schoonmaak —
            en laat de beslissingen bij jou.
          </p>
          <button className="btn coral" onClick={() => nav("/login")}>Probeer Staybase gratis</button>
        </div>

        <div className="art-verder">
          <h3>Verder lezen</h3>
          <div className="art-verder-grid">
            {andere.map((a) => <ArtikelKaart a={a} key={a.slug} />)}
          </div>
        </div>
      </article>

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
