import type { Channel } from "@shared/types";

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

const MONTH_FULL_NL = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

/** Volledige Nederlandse maandnaam uit een ISO-datum of "yyyy-mm". */
export function monthName(iso: string): string {
  return MONTH_FULL_NL[Number(iso.slice(5, 7)) - 1];
}

const DOW_SHORT_NL = ["ma", "di", "wo", "do", "vr", "za", "zo"];

/**
 * "Ma 3 apr" — korte datum met weekdag. Slikt zowel "2026-04-03" als een
 * volledige tijdstempel ("2026-04-03T12:59:00Z").
 */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const day = iso.slice(0, 10);
  const d = new Date(day + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return "—";
  const dow = DOW_SHORT_NL[(d.getUTCDay() + 6) % 7];
  return `${dow[0].toUpperCase()}${dow.slice(1)} ${d.getUTCDate()} ${monthName(day).slice(0, 3)}`;
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
