import { db, getSetting, setSetting } from "./db";

/**
 * Guesty-koppeling (Open API).
 *
 * Guesty is in de POC de distributiehub: panden en boekingen leven daar en
 * worden naar Airbnb / Booking.com / VRBO gepusht. Deze module haalt ze op en
 * zet ze in onze eigen tabellen, naast de demodata.
 *
 * Configuratie: GUESTY_CLIENT_ID + GUESTY_CLIENT_SECRET in backend/.env
 * (aan te maken in Guesty: Settings → Integrations → API → "Create app").
 * Zonder die twee draait de app gewoon verder — de Koppelingen-pagina toont
 * dan hoe je ze aanmaakt.
 *
 * ⚠️ Guesty beperkt het aantal token-aanvragen streng (± 5 per 24 uur).
 * Het OAuth-token (24 u geldig) wordt daarom in de settings-tabel bewaard en
 * over herstarts heen hergebruikt — nooit per request een nieuw token vragen.
 */

// Overschrijfbaar voor tests tegen een lokale mock van de Guesty-API.
const TOKEN_URL = process.env.GUESTY_TOKEN_URL || "https://open-api.guesty.com/oauth2/token";
const BASE_URL = process.env.GUESTY_API_URL || "https://open-api.guesty.com/v1";
const PAGE_SIZE = 100;

export function guestyAvailable(): boolean {
  return Boolean(process.env.GUESTY_CLIENT_ID && process.env.GUESTY_CLIENT_SECRET);
}

/* =========================== OAuth-token =========================== */

async function requestToken(): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "open-api",
      client_id: process.env.GUESTY_CLIENT_ID!,
      client_secret: process.env.GUESTY_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Guesty-token aanvragen mislukte (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  // 5 minuten marge zodat we nooit met een net-verlopen token werken.
  const expires = new Date(Date.now() + (data.expires_in - 300) * 1000).toISOString();
  setSetting("guesty_token", data.access_token);
  setSetting("guesty_token_expires", expires);
  return data.access_token;
}

async function getToken(forceNew = false): Promise<string> {
  if (!guestyAvailable()) throw new Error("Guesty niet geconfigureerd — zie backend/.env.example");
  if (!forceNew) {
    const cached = getSetting("guesty_token", "");
    const expires = getSetting("guesty_token_expires", "");
    if (cached && expires && new Date(expires).getTime() > Date.now()) return cached;
  }
  return requestToken();
}

/* =========================== API-client =========================== */

async function guestyFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  let token = await getToken();
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (res.ok) return (await res.json()) as T;

    // Token verlopen of ingetrokken → één keer een vers token proberen.
    if (res.status === 401 && attempt === 1) {
      token = await getToken(true);
      continue;
    }
    // Rate limit (15/s, 120/min) → even wachten en opnieuw.
    if (res.status === 429 && attempt <= 3) {
      const wait = Number(res.headers.get("retry-after")) * 1000 || 1500 * attempt;
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    const body = await res.text();
    throw new Error(`Guesty ${path} gaf ${res.status}: ${body.slice(0, 300)}`);
  }
}

interface GuestyPage<T> {
  results: T[];
  count: number;
  limit: number;
  skip: number;
}

async function fetchAll<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const all: T[] = [];
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const page = await guestyFetch<GuestyPage<T>>(path, {
      ...params,
      limit: String(PAGE_SIZE),
      skip: String(skip),
    });
    all.push(...page.results);
    if (all.length >= page.count || page.results.length < PAGE_SIZE) return all;
  }
}

/* =========================== Guesty-vormen =========================== */

interface GuestyListing {
  _id: string;
  title?: string;
  nickname?: string;
  propertyType?: string;
  active?: boolean;
  isListed?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  accommodates?: number;
  areaSquareMeters?: number;
  address?: { city?: string; country?: string; lat?: number; lng?: number };
  picture?: { thumbnail?: string };
  pictures?: { original?: string; thumbnail?: string }[];
  prices?: { basePrice?: number; weekendBasePrice?: number; cleaningFee?: number; currency?: string };
  reviews?: { avg?: number };
}

interface GuestyReservation {
  _id: string;
  listingId?: string;
  status?: string;
  source?: string;
  checkIn?: string;   // ISO datetime
  checkOut?: string;
  guestsCount?: number;
  guest?: { fullName?: string };
  money?: { hostPayout?: number; netIncome?: number; subTotalPrice?: number };
  integration?: { platform?: string };
  createdAt?: string;   // wanneer de reservatie werd aangemaakt (boekingsmoment)
  confirmedAt?: string;
}

/* =========================== Mapping =========================== */

const AVATARS = ["🌊", "⛱️", "🐚", "🚲", "🪁", "🎨", "🏄", "🌅"];
function avatarFor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATARS[h % AVATARS.length];
}

/**
 * Guesty kent veel bronnen (airbnb2, bookingCom, manual, website…); ons schema
 * drie kanalen. Directe/handmatige boekingen tonen we als Booking.com en de
 * echte bron bewaren we in de notitie — tot het schema een 'direct'-kanaal krijgt.
 */
function mapChannel(r: GuestyReservation): { channel: "airbnb" | "booking" | "vrbo"; sourceNote: string | null } {
  const src = (r.source || r.integration?.platform || "").toLowerCase();
  if (src.includes("airbnb")) return { channel: "airbnb", sourceNote: null };
  if (src.includes("booking")) return { channel: "booking", sourceNote: null };
  if (src.includes("vrbo") || src.includes("homeaway") || src.includes("expedia")) {
    return { channel: "vrbo", sourceNote: null };
  }
  return { channel: "booking", sourceNote: src ? `via Guesty · bron: ${src}` : "via Guesty" };
}

/**
 * Guesty-titels zijn gast-gericht en lang ("De Pagode - A serene home with
 * heated pool 04 - 09"); de nickname is een interne code ("BE.DUIN.ARC.4").
 * We nemen het stuk vóór het eerste " - " als kaartnaam; bij botsingen komt
 * de interne code erbij zodat panden uit elkaar te houden blijven.
 */
function listingName(l: GuestyListing, used: Set<string>): string {
  const title = (l.title || "").trim();
  const short = title.split(" - ")[0].trim();
  let name = short.length >= 6 ? short : title || l.nickname || "Pand via Guesty";
  if (used.has(name)) name = `${name} · ${l.nickname || l._id.slice(-4)}`;
  used.add(name);
  return name.slice(0, 80);
}

const GRADIENTS = [
  "linear-gradient(135deg,#FFE3E9,#FFD1DB)",
  "linear-gradient(135deg,#DCEBFF,#C9DEFC)",
  "linear-gradient(135deg,#FFF0D9,#FFE4BC)",
  "linear-gradient(135deg,#E9F6EF,#D3EDDD)",
];

/* =========================== Berichten =========================== */

/**
 * Elke conversatie kost een extra API-call voor de berichten en Guesty laat
 * maar ±120 requests per minuut toe — daarom syncen we alleen de meest
 * recente gesprekken. De rest volgt zodra er webhooks zijn.
 */
const CONVERSATION_CAP = 40;

interface GuestyConversation {
  _id: string;
  createdAt?: string;
  meta?: {
    guest?: { fullName?: string };
    reservations?: { source?: string; listing?: { _id?: string } }[];
  };
}

interface GuestyPost {
  _id: string;
  body?: string;
  sentBy?: string; // "host" | "guest"
  createdAt?: string;
  module?: { type?: string }; // "note" = interne notitie/log, geen gastbericht
}

/**
 * Opschoning van Guesty-bodies: Booking.com-berichten komen soms als
 * volledige HTML-e-mails binnen — die strippen we naar leesbare tekst.
 */
function cleanBody(body: string): string {
  let t = body;
  if (/<[a-z!/][^>]*>/i.test(t)) {
    t = t
      .replace(/<(style|script|head|title)[\s\S]*?<\/\1>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, "\n")
      .replace(/<[^>]+>/g, "");
  }
  return t
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    // Reply-omhulsel van Booking.com-mails ("##- Please type your reply … -##").
    .replace(/#{1,2}-[\s\S]{0,80}?-#{1,2}/g, "")
    .replace(/^New message from [^\n]*$/gim, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const MONTH_SHORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** "2026-08-20T15:00:00.000Z" → "17:00" (Belgische tijd). */
function localTime(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("nl-BE", {
      hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Brussels",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

/** "Zonet", "34 min", "5 u", of "12 aug" — zoals de rest van de inbox. */
function timeLabel(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 2) return "Zonet";
  if (diffMin < 60) return `${diffMin} min`;
  if (d.toDateString() === new Date().toDateString()) return `${Math.round(diffMin / 60)} u`;
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

async function syncMessages(summary: GuestySyncSummary): Promise<void> {
  const list = await guestyFetch<{ data?: { conversations?: GuestyConversation[]; count?: number } }>(
    "/communication/conversations",
    { limit: String(CONVERSATION_CAP), sort: "-lastActivityAt" }
  );
  const convs = list.data?.conversations ?? [];
  summary.messages.totalRemote = list.data?.count ?? convs.length;

  const insertConv = db.prepare(`
    INSERT INTO conversations (id, property_id, guest, avatar, channel, status, snippet, time_label,
      draft, draft_note, guard_reason, sort, guesty_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)
  `);
  const updateConv = db.prepare(`
    UPDATE conversations SET property_id = ?, guest = ?, channel = ?, status = ?, snippet = ?,
      time_label = ?, guard_reason = ?, sort = ? WHERE guesty_id = ?
  `);
  const insertMsg = db.prepare(`
    INSERT INTO messages (conversation_id, sender, body, time_label, auto, created_at, guesty_id)
    VALUES (?, ?, ?, ?, 0, ?, ?)
  `);

  for (const [i, c] of convs.entries()) {
    const listingId = c.meta?.reservations?.[0]?.listing?._id;
    const prop = listingId
      ? (db.prepare("SELECT id FROM properties WHERE guesty_id = ?").get(listingId) as { id: string } | undefined)
      : undefined;
    if (!prop) {
      summary.messages.skipped++;
      continue;
    }

    const postsResp = await guestyFetch<{ data?: { posts?: GuestyPost[] } }>(
      `/communication/conversations/${c._id}/posts`,
      { limit: "100" }
    );
    // Interne notities/automation-logs ("note") zijn geen gastenberichten.
    const posts = (postsResp.data?.posts ?? [])
      .filter((p) => p.module?.type !== "note" && (p.body ?? "").trim())
      .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
    if (posts.length === 0) {
      summary.messages.skipped++;
      continue;
    }

    const last = posts[posts.length - 1];
    const { channel } = mapChannel({ _id: c._id, source: c.meta?.reservations?.[0]?.source });
    // Laatste woord aan de gast → wacht op de eigenaar; anders beantwoord.
    const status = last.sentBy === "guest" ? "guard" : "done";
    const guardReason = status === "guard" ? "Nieuw bericht van de gast — nog niet beantwoord." : null;
    const guest = c.meta?.guest?.fullName || "Gast via Guesty";
    const snippet = cleanBody(last.body ?? "").replace(/\s+/g, " ").slice(0, 60) + "…";
    const convId = "g-" + c._id;

    const exists = db.prepare("SELECT id FROM conversations WHERE guesty_id = ?").get(c._id) as { id: string } | undefined;
    if (exists) {
      updateConv.run(prop.id, guest, channel, status, snippet, timeLabel(last.createdAt), guardReason, i, c._id);
      summary.messages.updated++;
    } else {
      insertConv.run(convId, prop.id, guest, avatarFor(c._id), channel, status, snippet, timeLabel(last.createdAt), guardReason, i, c._id);
      summary.messages.created++;
    }

    for (const p of posts) {
      const msgExists = db.prepare("SELECT 1 FROM messages WHERE guesty_id = ?").get(p._id);
      if (msgExists) continue;
      insertMsg.run(
        exists?.id ?? convId,
        p.sentBy === "guest" ? "guest" : "host",
        cleanBody(p.body ?? ""),
        timeLabel(p.createdAt),
        p.createdAt ?? null,
        p._id
      );
      summary.messages.newMessages++;
    }
  }
}

/* =========================== Sync =========================== */

export interface GuestySyncSummary {
  at: string; // ISO
  listings: { created: number; updated: number; total: number };
  bookings: { created: number; updated: number; removed: number; skipped: number };
  messages: { created: number; updated: number; newMessages: number; skipped: number; totalRemote: number };
}

export async function syncGuesty(): Promise<GuestySyncSummary> {
  const listings = await fetchAll<GuestyListing>("/listings", {
    fields: "title nickname propertyType active isListed bedrooms bathrooms accommodates areaSquareMeters address picture pictures prices reviews",
  });

  const summary: GuestySyncSummary = {
    at: new Date().toISOString(),
    listings: { created: 0, updated: 0, total: listings.length },
    bookings: { created: 0, updated: 0, removed: 0, skipped: 0 },
    messages: { created: 0, updated: 0, newMessages: 0, skipped: 0, totalRemote: 0 },
  };

  const propIdByGuesty = new Map<string, string>();
  const insertProp = db.prepare(`
    INSERT INTO properties (id, name, location, type, bedrooms, bathrooms, max_guests, area_m2,
      rating, status, status_label, art, art_bg, photo, description, channels, cleaning_price,
      base_price_week, base_price_weekend, lat, lng, guesty_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateProp = db.prepare(`
    UPDATE properties SET name = ?, location = ?, type = ?, bedrooms = ?, bathrooms = ?,
      max_guests = ?, area_m2 = ?, rating = ?, status = ?, status_label = ?, photo = ?,
      cleaning_price = ?, base_price_week = ?, base_price_weekend = ?, lat = ?, lng = ?
    WHERE guesty_id = ?
  `);

  const usedNames = new Set<string>();
  listings.forEach((l, i) => {
    const name = listingName(l, usedNames);
    const live = Boolean(l.active && l.isListed);
    const bedrooms = Math.max(1, Math.round(l.bedrooms ?? 1));
    const area = Math.round(l.areaSquareMeters || bedrooms * 45);
    const photo = l.picture?.thumbnail || l.pictures?.[0]?.original || null;
    const weekPrice = Math.round(l.prices?.basePrice ?? 150);
    const vals = [
      name,
      l.address?.city || "Onbekend",
      l.propertyType || "Woning",
      bedrooms,
      Math.max(1, Math.round(l.bathrooms ?? 1)),
      Math.max(1, Math.round(l.accommodates ?? bedrooms * 2)),
      area,
      l.reviews?.avg ?? null,
      live ? "live" : "onboarding",
      live ? "Live · via Guesty" : "⏳ Nog niet live · Guesty",
      photo,
      Math.round(l.prices?.cleaningFee ?? Math.round(area * 0.5)),
      weekPrice,
      Math.round(l.prices?.weekendBasePrice ?? weekPrice * 1.15),
      l.address?.lat ?? null,
      l.address?.lng ?? null,
    ] as const;

    const existing = db.prepare("SELECT id FROM properties WHERE guesty_id = ?").get(l._id) as { id: string } | undefined;
    if (existing) {
      // Kunst (emoji/gradient) en beschrijving laten we staan — die kan de
      // eigenaar in Staybase zelf hebben aangepast.
      updateProp.run(vals[0], vals[1], vals[2], vals[3], vals[4], vals[5], vals[6], vals[7], vals[8], vals[9], vals[10], vals[11], vals[12], vals[13], vals[14], vals[15], l._id);
      propIdByGuesty.set(l._id, existing.id);
      summary.listings.updated++;
    } else {
      const id = "g-" + l._id;
      insertProp.run(
        id, vals[0], vals[1], vals[2], vals[3], vals[4], vals[5], vals[6], vals[7], vals[8], vals[9],
        "🏠", GRADIENTS[i % GRADIENTS.length], vals[10],
        `Geïmporteerd uit Guesty. Pas deze beschrijving gerust aan in Staybase.`,
        JSON.stringify(["airbnb", "booking", "vrbo"]),
        vals[11], vals[12], vals[13], vals[14], vals[15], l._id
      );
      propIdByGuesty.set(l._id, id);
      summary.listings.created++;
    }
  });

  // Boekingen vanaf 1 januari van dit jaar; geannuleerde halen we ook op zodat
  // we ze lokaal kunnen opruimen als ze eerder geïmporteerd waren.
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const reservations = await fetchAll<GuestyReservation>("/reservations", {
    fields: "listingId status source integration checkIn checkOut guestsCount guest money createdAt confirmedAt",
    filters: JSON.stringify([
      { field: "checkOut", operator: "$gte", value: yearStart },
      { field: "status", operator: "$in", value: ["confirmed", "closed", "canceled"] },
    ]),
  });

  const insertBooking = db.prepare(`
    INSERT INTO bookings (id, property_id, guest, avatar, channel, start_date, end_date, guests, payout, note,
      checkin_time, checkout_time, booked_at, guesty_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateBooking = db.prepare(`
    UPDATE bookings SET property_id = ?, guest = ?, channel = ?, start_date = ?, end_date = ?,
      guests = ?, payout = ?, note = ?, checkin_time = ?, checkout_time = ?, booked_at = ? WHERE guesty_id = ?
  `);

  for (const r of reservations) {
    const existing = db.prepare("SELECT id FROM bookings WHERE guesty_id = ?").get(r._id) as { id: string } | undefined;

    if (r.status === "canceled") {
      if (existing) {
        db.prepare("DELETE FROM bookings WHERE guesty_id = ?").run(r._id);
        summary.bookings.removed++;
      }
      continue;
    }

    const propId = r.listingId ? propIdByGuesty.get(r.listingId)
      ?? (db.prepare("SELECT id FROM properties WHERE guesty_id = ?").get(r.listingId) as { id: string } | undefined)?.id
      : undefined;
    const start = r.checkIn?.slice(0, 10);
    const end = r.checkOut?.slice(0, 10);
    if (!propId || !start || !end) {
      summary.bookings.skipped++;
      continue;
    }

    const { channel, sourceNote } = mapChannel(r);
    const payout = Math.round(r.money?.hostPayout ?? r.money?.netIncome ?? r.money?.subTotalPrice ?? 0);
    const guest = r.guest?.fullName || "Gast via Guesty";
    const inTime = localTime(r.checkIn);
    const outTime = localTime(r.checkOut);
    const bookedAt = r.confirmedAt ?? r.createdAt ?? null;
    if (existing) {
      updateBooking.run(propId, guest, channel, start, end, r.guestsCount ?? 2, payout, sourceNote, inTime, outTime, bookedAt, r._id);
      summary.bookings.updated++;
    } else {
      insertBooking.run("g-" + r._id, propId, guest, avatarFor(r._id), channel, start, end, r.guestsCount ?? 2, payout, sourceNote, inTime, outTime, bookedAt, r._id);
      summary.bookings.created++;
    }
  }

  await syncMessages(summary);

  setSetting("guesty_last_sync", JSON.stringify(summary));
  return summary;
}

/** Test de verbinding zonder iets te wijzigen: token + één listing ophalen. */
export async function testGuesty(): Promise<{ ok: true; listingsTotal: number }> {
  const page = await guestyFetch<GuestyPage<GuestyListing>>("/listings", { limit: "1", fields: "title" });
  return { ok: true, listingsTotal: page.count };
}

/** Verwijder alles wat uit Guesty kwam (handig om opnieuw te beginnen). */
export function resetGuestyData(): { properties: number; bookings: number; conversations: number } {
  // Ook lokaal getypte antwoorden binnen Guesty-gesprekken gaan mee weg.
  db.prepare("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE guesty_id IS NOT NULL)").run();
  const conversations = db.prepare("DELETE FROM conversations WHERE guesty_id IS NOT NULL").run().changes;
  const bookings = db.prepare("DELETE FROM bookings WHERE guesty_id IS NOT NULL").run().changes;
  // Eerst boekingen die (via een oudere sync) aan een Guesty-pand hangen.
  db.prepare("DELETE FROM bookings WHERE property_id IN (SELECT id FROM properties WHERE guesty_id IS NOT NULL)").run();
  const properties = db.prepare("DELETE FROM properties WHERE guesty_id IS NOT NULL").run().changes;
  db.prepare("DELETE FROM settings WHERE key = 'guesty_last_sync'").run();
  return { properties: Number(properties), bookings: Number(bookings), conversations: Number(conversations) };
}

export function guestyStatus(): {
  configured: boolean;
  lastSync: GuestySyncSummary | null;
  linkedProperties: number;
  linkedBookings: number;
  linkedConversations: number;
} {
  const raw = getSetting("guesty_last_sync", "");
  return {
    configured: guestyAvailable(),
    lastSync: raw ? (JSON.parse(raw) as GuestySyncSummary) : null,
    linkedProperties: (db.prepare("SELECT COUNT(*) n FROM properties WHERE guesty_id IS NOT NULL").get() as { n: number }).n,
    linkedBookings: (db.prepare("SELECT COUNT(*) n FROM bookings WHERE guesty_id IS NOT NULL").get() as { n: number }).n,
    linkedConversations: (db.prepare("SELECT COUNT(*) n FROM conversations WHERE guesty_id IS NOT NULL").get() as { n: number }).n,
  };
}
