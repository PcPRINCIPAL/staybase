import type { Channel } from "@shared/types";
import { getActiveLanguage } from "../i18n";

export const eur = (n: number) => "€ " + n.toLocaleString("nl-BE");

export const CHANNEL_META: Record<Channel, { name: string; chip: string; cellClass: string; color: string }> = {
  airbnb: { name: "Airbnb", chip: "airbnb", cellClass: "bk-airbnb", color: "var(--airbnb)" },
  booking: { name: "Booking.com", chip: "booking", cellClass: "bk-booking", color: "var(--booking)" },
  vrbo: { name: "VRBO", chip: "vrbo", cellClass: "bk-vrbo", color: "var(--vrbo)" },
};

export function nightsBetween(start: string, end: string): number {
  return Math.round(
    (new Date(end + "T00:00:00Z").getTime() - new Date(start + "T00:00:00Z").getTime()) / 86400000
  );
}

const MONTHS: Record<string, string[]> = {
  nl: ["januari", "februari", "maart", "april", "mei", "juni",
       "juli", "augustus", "september", "oktober", "november", "december"],
  fr: ["janvier", "février", "mars", "avril", "mai", "juin",
       "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  en: ["january", "february", "march", "april", "may", "june",
       "july", "august", "september", "october", "november", "december"],
};

export const DOWS: Record<string, string[]> = {
  nl: ["ma", "di", "wo", "do", "vr", "za", "zo"],
  fr: ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"],
  en: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
};

const DOW_FULL: Record<string, string[]> = {
  nl: ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"],
  fr: ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
};

/** "Maandag 14 september 2026" — volledige datum in de actieve taal. */
export function longDate(iso: string): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  const dow = DOW_FULL[getActiveLanguage()][(d.getUTCDay() + 6) % 7];
  return `${dow[0].toUpperCase()}${dow.slice(1)} ${d.getUTCDate()} ${monthName(iso)} ${d.getUTCFullYear()}`;
}

/** Volledige maandnaam in de actieve taal, uit een ISO-datum of "yyyy-mm". */
export function monthName(iso: string): string {
  return MONTHS[getActiveLanguage()][Number(iso.slice(5, 7)) - 1];
}

/** Korte dagnamen (ma…zo) in de actieve taal, met hoofdletter. */
export function dowShort(): string[] {
  return DOWS[getActiveLanguage()].map((d) => d[0].toUpperCase() + d.slice(1));
}

/**
 * "Ma 3 apr" / "Lun 3 avr" / "Mon 3 sep" — korte datum met weekdag, in de
 * actieve taal. Slikt zowel "2026-04-03" als een volledige tijdstempel.
 */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const day = iso.slice(0, 10);
  const d = new Date(day + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return "—";
  const dow = DOWS[getActiveLanguage()][(d.getUTCDay() + 6) % 7];
  return `${dow[0].toUpperCase()}${dow.slice(1)} ${d.getUTCDate()} ${monthName(day).slice(0, 3)}`;
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
