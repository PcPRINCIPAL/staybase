import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LANGUAGE, isLanguage, type Language } from "@shared/types";
import { nl } from "./nl";
import { fr } from "./fr";
import { en } from "./en";

/**
 * Vertalingen. Nederlands is de bron: elke sleutel bestaat daar, en ontbreekt
 * een vertaling in FR of EN, dan valt `t` terug op het Nederlands in plaats
 * van een lege plek of de ruwe sleutel te tonen.
 *
 * De taal komt, in volgorde: uit het profiel van de ingelogde gebruiker, uit
 * localStorage (ook voor wie niet ingelogd is, op de website), uit de taal van
 * de browser, en anders Nederlands.
 */
export type Dict = Record<string, string>;

const DICTS: Record<Language, Dict> = { nl, fr, en };

const STORAGE_KEY = "sb:lang";

/**
 * De actieve taal, leesbaar buiten React. Datumhelpers (maand- en dagnamen in
 * lib/format.ts) zijn gewone functies zonder hooks; zij lezen dit. De provider
 * houdt het synchroon, en elke taalwissel her-rendert de hele boom, dus de
 * helpers draaien altijd met de juiste waarde.
 */
let activeLanguage: Language = DEFAULT_LANGUAGE;
export const getActiveLanguage = (): Language => activeLanguage;

export function storedLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (isLanguage(saved)) return saved;
  const nav = navigator.language.slice(0, 2).toLowerCase();
  return isLanguage(nav) ? nav : DEFAULT_LANGUAGE;
}

/** Vervangt {naam}-plaatshouders in een vertaling. */
function fill(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

interface LocaleState {
  lang: Language;
  setLang: (l: Language) => void;
  t: TFn;
}

const LocaleCtx = createContext<LocaleState>({
  lang: DEFAULT_LANGUAGE,
  setLang: () => {},
  t: (k) => nl[k] ?? k,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => storedLanguage());

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  // De <html lang="…"> hoort mee te lopen: schermlezers en de spellingcheck
  // van de browser gaan daarop af.
  useEffect(() => {
    document.documentElement.lang = lang;
    activeLanguage = lang;
  }, [lang]);

  // Vóór de eerste render al juist zetten, anders formatteert de eerste
  // schermopbouw datums nog in de standaardtaal.
  activeLanguage = lang;

  const t = useCallback<TFn>(
    (key, vars) => fill(DICTS[lang][key] ?? nl[key] ?? key, vars),
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}

export const useLocale = () => useContext(LocaleCtx);
/** Kort: alleen de vertaalfunctie. */
export const useT = (): TFn => useContext(LocaleCtx).t;
