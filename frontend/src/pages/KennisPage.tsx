import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Icon";
import { ArtikelKaart } from "./LandingSections";
import { ARTIKELEN } from "../content/artikelen";
import { useFadeIn } from "../lib/useFadeIn";
import { useLocale } from "../i18n";
import { LanguagePicker } from "../components/LanguagePicker";
import "./landing.css";

/** Publieke overzichtspagina van alle kennisbank-artikels. */
export function KennisPage() {
  const nav = useNavigate();
  const { lang, t } = useLocale();

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
            <button className="btn ghost sm" onClick={() => nav("/login")}>{t("lp.login")}</button>
            <button className="btn coral sm" onClick={() => nav("/registreer")}>{t("lp.tryFree")}</button>
            <LanguagePicker />
          </div>
        </div>
      </header>

      <div className="art-wrap kennis-wrap">
        <Link to="/#kennis" className="art-terug">{t("kennis.back")}</Link>
        <h1 className="art-titel">{t("lp.kennis.title")}</h1>
        <p className="art-intro">
          {t("kennis.pageIntro")}
          {lang !== "nl" && <> {t("kennis.noteNL")}</>}
        </p>
        <div className="kennis-grid">
          {ARTIKELEN.map((a) => <ArtikelKaart a={a} key={a.slug} />)}
        </div>

        <div className="art-cta">
          <h3>{t("kennis.ctaTitle")}</h3>
          <p>{t("kennis.ctaBody")}</p>
          <button className="btn coral" onClick={() => nav("/registreer")}>{t("kennis.ctaBtn")}</button>
        </div>
      </div>

      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-bottom" style={{ paddingTop: 0 }}>
            <span>{t("lp.footer.copy")}</span>
            <span>{t("lp.footer.proposal")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
