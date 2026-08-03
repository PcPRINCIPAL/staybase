import type { Channel } from "@shared/types";

export const eur = (n: number) => "€ " + n.toLocaleString("nl-BE");

export const CHANNEL_META: Record<Channel, { name: string; chip: string; cellClass: string; color: string }> = {
  airbnb: { name: "Airbnb", chip: "coral", cellClass: "bk-airbnb", color: "var(--coral)" },
  booking: { name: "Booking.com", chip: "booking", cellClass: "bk-booking", color: "var(--booking)" },
  vrbo: { name: "VRBO", chip: "vrbo", cellClass: "bk-vrbo", color: "var(--vrbo)" },
};

export function nightsBetween(start: string, end: string): number {
  return Math.round(
    (new Date(end + "T00:00:00Z").getTime() - new Date(start + "T00:00:00Z").getTime()) / 86400000
  );
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
