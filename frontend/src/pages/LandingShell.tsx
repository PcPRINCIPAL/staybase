import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Icon, Logo } from "../components/Icon";
import { LanguagePicker } from "../components/LanguagePicker";
import { useT } from "../i18n";

/**
 * Gedeelde schil van de website (fase 6): de landingspagina is kort en de
 * inhoud leeft op doorklikpagina's — "doorklikken is diepgaander, dat is
 * vertrouwelijker", en elke pagina telt mee voor SEO. Nav en footer staan
 * daarom hier, één keer.
 */

export const SITE_NAV = [
  { to: "/hoe-het-werkt", key: "lp.nav.how" },
  { to: "/bereken-je-waarde", key: "lp.nav.calc" },
  { to: "/prijzen", key: "lp.nav.prices" },
  { to: "/verhalen", key: "lp.nav.stories" },
];

/** Meet de sticky nav en zet de hoogte als CSS-variabele (hero-layout). */
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

export function LpNav() {
  const t = useT();
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  useNavHeight(navRef);

  return (
    <header className="lp-nav" ref={navRef}>
      <div className="lp-nav-in">
        <Link to="/" className="logo" style={{ fontSize: 21 }}>
          <Logo /> staybase
        </Link>
        <nav className="lp-nav-links">
          {/* De actieve pagina staat vet aangeduid. */}
          {SITE_NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? "on" : "")}>{t(n.key)}</NavLink>
          ))}
        </nav>
        <div className="lp-nav-cta">
          <button className="btn ghost sm" onClick={() => nav("/login")}>{t("lp.login")}</button>
          <button className="btn coral sm" onClick={() => nav("/registreer")}>{t("lp.tryFree")}</button>
          <LanguagePicker />
        </div>
        <button className="lp-burger" onClick={() => setMenuOpen((o) => !o)} aria-label={t("lp.menu")}>
          <Icon name={menuOpen ? "x" : "menu"} size={22} />
        </button>
      </div>
      <div className={`lp-mobile ${menuOpen ? "open" : ""}`}>
        {SITE_NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? "on" : "")}
            onClick={() => setMenuOpen(false)}>{t(n.key)}</NavLink>
        ))}
        <button className="btn ghost" style={{ justifyContent: "center", marginTop: 8 }} onClick={() => nav("/login")}>
          {t("lp.login")}
        </button>
        <button className="btn coral" style={{ justifyContent: "center" }} onClick={() => nav("/registreer")}>
          {t("lp.tryFree")}
        </button>
      </div>
    </header>
  );
}

/** Laatste CTA-blok — hetzelfde op elke websitepagina. */
export function LpFinalCta() {
  const t = useT();
  const nav = useNavigate();
  return (
    <section className="lp-final">
      <div className="lp-container">
        <h2 className="lp-fade">{t("lp.final.title")}</h2>
        <p className="sub lp-fade">{t("lp.final.sub")}</p>
        <div className="lp-final-ctas lp-fade">
          <button className="btn coral lp-btn-lg" onClick={() => nav("/registreer")}>{t("lp.tryFree")}</button>
          <Link className="lp-final-link" to="/hoe-het-werkt">{t("lp.final.link")}</Link>
        </div>
        <p style={{ fontSize: 13, color: "var(--faint)" }}>{t("lp.final.note")}</p>
      </div>
    </section>
  );
}

export function LpFooter() {
  const t = useT();
  const nav = useNavigate();
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer-top">
          <div className="lp-footer-col">
            <div className="logo" style={{ color: "#fff" }}><Logo size={26} /> staybase</div>
            <p className="lp-footer-tag">{t("lp.footer.tag")}</p>
          </div>
          <div className="lp-footer-col">
            <h5>{t("lp.footer.product")}</h5>
            <Link to="/hoe-het-werkt">{t("lp.nav.how")}</Link>
            <Link to="/prijzen">{t("lp.nav.prices")}</Link>
            <Link to="/bereken-je-waarde">{t("lp.nav.calc")}</Link>
          </div>
          <div className="lp-footer-col">
            <h5>{t("lp.footer.company")}</h5>
            <Link to="/verhalen">{t("lp.nav.stories")}</Link>
            <Link to="/kennis">{t("lp.footer.kennis")}</Link>
          </div>
          <div className="lp-footer-col">
            <h5>{t("lp.footer.start")}</h5>
            <button className="btn coral sm" style={{ justifyContent: "center" }} onClick={() => nav("/registreer")}>{t("lp.tryFree")}</button>
            <a onClick={() => nav("/login")} style={{ marginTop: 12 }}>{t("lp.footer.haveAccount")}</a>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>{t("lp.footer.copy")}</span>
          <span>{t("lp.footer.proposal")}</span>
        </div>
      </div>
    </footer>
  );
}

/** Paginakop van een doorklikpagina + scroll naar boven bij binnenkomen. */
export function LpPageHead({ label, title, sub }: { label: string; title: React.ReactNode; sub?: string }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="lp-container lp-page-head">
      <p className="lp-label lp-fade">{label}</p>
      <h1 className="lp-h2 lp-fade">{title}</h1>
      {sub && <p className="lp-sub lp-fade">{sub}</p>}
    </div>
  );
}
