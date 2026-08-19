import { db } from "./db";
import { DEMO_TODAY } from "../../shared/types";
import type { Booking, Channel, Property } from "../../shared/types";

export const MONTH_LABELS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
export const MONTH_FULL = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
export const DOW_LABELS = ["ma", "di", "wo", "do", "vr", "za", "zo"];

export const DEMO_MONTH = DEMO_TODAY.slice(0, 7); // "2026-07"

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function iso(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = maandag … 6 = zondag */
export function weekdayMonday(isoDate: string): number {
  return (new Date(isoDate + "T00:00:00Z").getUTCDay() + 6) % 7;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function shortLabel(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00Z");
  return `${d.getUTCDate()} ${MONTH_LABELS[d.getUTCMonth()]}`;
}

export function nightsBetween(start: string, end: string): number {
  return Math.round(
    (new Date(end + "T00:00:00Z").getTime() - new Date(start + "T00:00:00Z").getTime()) / 86400000
  );
}

/* ---------- rij-mappers ---------- */

export interface PropertyRow {
  id: string; name: string; location: string; type: string;
  bedrooms: number; bathrooms: number; max_guests: number; area_m2: number;
  rating: number | null; status: "live" | "onboarding"; status_label: string;
  art: string; art_bg: string; photo: string | null; description: string | null;
  channels: string | Channel[]; cleaning_price: number;
  base_price_week: number; base_price_weekend: number;
  lat: number | null; lng: number | null;
  owner_id: string | null;
}

export function mapProperty(r: PropertyRow): Property {
  return {
    id: r.id, name: r.name, location: r.location, type: r.type,
    bedrooms: r.bedrooms, bathrooms: r.bathrooms, maxGuests: r.max_guests, areaM2: r.area_m2,
    rating: r.rating, status: r.status, statusLabel: r.status_label,
    art: r.art, artBg: r.art_bg, photo: r.photo, description: r.description,
    // SQLite gaf een JSON-string, Postgres (jsonb) geeft meteen een array.
    channels: (typeof r.channels === "string" ? JSON.parse(r.channels) : r.channels) as Channel[],
    cleaningPrice: r.cleaning_price,
    basePriceWeek: r.base_price_week, basePriceWeekend: r.base_price_weekend,
    lat: r.lat, lng: r.lng,
  };
}

export interface BookingRow {
  id: string; property_id: string; guest: string; avatar: string; channel: Channel;
  start_date: string; end_date: string; guests: number; payout: number; note: string | null;
  checkin_time: string | null; checkout_time: string | null;
  booked_at: string | null;
}

export function mapBooking(r: BookingRow): Booking {
  return {
    id: r.id, propertyId: r.property_id, guest: r.guest, avatar: r.avatar, channel: r.channel,
    startDate: r.start_date, endDate: r.end_date, guests: r.guests, payout: r.payout, note: r.note,
    checkInTime: r.checkin_time, checkOutTime: r.checkout_time,
  };
}

export async function allProperties(): Promise<PropertyRow[]> {
  return (await db.prepare("SELECT * FROM properties ORDER BY created_at").all()) as unknown as PropertyRow[];
}

export async function propertyById(id: string): Promise<PropertyRow | undefined> {
  return (await db.prepare("SELECT * FROM properties WHERE id = ?").get(id)) as unknown as PropertyRow | undefined;
}

export interface SuggestionRow {
  property_id: string; start_date: string; end_date: string; price_to: number; status: string;
}

/** Alle niet-afgewezen prijsvoorstellen van een pand — één query, daarna per nacht rekenen. */
export async function suggestionsFor(propertyId: string): Promise<SuggestionRow[]> {
  return (await db.prepare(
    "SELECT property_id, start_date, end_date, price_to, status FROM price_suggestions WHERE property_id = ? AND status != 'rejected'"
  ).all(propertyId)) as unknown as SuggestionRow[];
}

/** Prijs voor een vrije nacht: weekend (vr/za) of week, met open/aanvaarde voorstellen verrekend. */
export function nightPrice(prop: PropertyRow, isoDate: string, sugs: SuggestionRow[]): { price: number; suggested: number | null } {
  const wd = weekdayMonday(isoDate);
  let price = wd === 4 || wd === 5 ? prop.base_price_weekend : prop.base_price_week;
  let suggested: number | null = null;
  for (const s of sugs) {
    if (s.start_date > isoDate || s.end_date <= isoDate) continue;
    if (s.status === "accepted") price = s.price_to;
    else if (s.status === "open") suggested = s.price_to;
  }
  return { price, suggested };
}
