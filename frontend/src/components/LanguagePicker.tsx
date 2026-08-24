import { useEffect, useRef, useState } from "react";
import { LANGUAGES, LANGUAGE_LABEL, LANGUAGE_SHORT, type Language } from "@shared/types";
import { setMyLanguage } from "../lib/api";
import { useAuth } from "../auth";
import { useLocale } from "../i18n";
import { Icon } from "./Icon";

/**
 * Taalkiezer. Werkt ook uitgelogd (op de website) — dan blijft de keuze in
 * localStorage staan. Ben je aangemeld, dan gaat ze mee naar je profiel,
 * zodat het platform de volgende keer meteen in die taal opent.
 */
export function LanguagePicker({ variant = "bar" }: { variant?: "bar" | "rail" }) {
  const { lang, setLang, t } = useLocale();
  const { user, setUser } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const pick = (next: Language) => {
    setLang(next);
    setOpen(false);
    if (!user) return;
    // De taal staat al om; bewaren mag op de achtergrond mislukken zonder
    // dat de gebruiker daar last van heeft.
    setMyLanguage(next)
      .then(() => setUser({ ...user, language: next }))
      .catch(() => {});
  };

  return (
    <div className={`lang-picker ${variant}`} ref={ref}>
      <button
        className="lang-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t("common.chooseLanguage")}
      >
        <Icon name="globe" />
        <span className="lang-code">{LANGUAGE_SHORT[lang]}</span>
        <span className="lang-chev"><Icon name="chevD" size={13} /></span>
      </button>
      {open && (
        <div className="lang-menu" role="listbox">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              role="option"
              aria-selected={l === lang}
              className={l === lang ? "on" : ""}
              onClick={() => pick(l)}
            >
              <b>{LANGUAGE_SHORT[l]}</b> {LANGUAGE_LABEL[l]}
              {l === lang && <span className="lang-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
