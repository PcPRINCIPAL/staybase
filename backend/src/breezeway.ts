import { createHash } from "node:crypto";
import { db, getSetting, setSetting } from "./db";
import { addDays, allProperties, propertyBrand, type BookingRow, type PropertyRow } from "./lib";
import { DEMO_TODAY } from "../../shared/types";

/**
 * Breezeway-koppeling (changes 2.0, fase 3).
 *
 * Het poetsteam van Linnois plant zijn poetsbeurten en inspecties in
 * Breezeway. Deze module trekt die data binnen en verrijkt onze
 * poetsbeurten met het exacte poetsmoment (niet per se de uitcheckdag!),
 * de checklist en de inspectiefoto's — enkel voor Linnois-panden, zoals
 * afgesproken in de meeting.
 *
 * Configuratie: BREEZEWAY_CLIENT_ID + BREEZEWAY_CLIENT_SECRET in
 * backend/.env (aan te maken in Breezeway: Settings → Integrations → API).
 * Zolang die er niet zijn draait de koppeling in **demomodus**: de
 * sync-knop bouwt dan realistische poetsbeurten op uit de boekingen zelf,
 * met dezelfde datastructuur — zodra de echte keys er zijn neemt de
 * Breezeway-API het over zonder dat er iets aan de schermen verandert.
 */

const TOKEN_URL = process.env.BREEZEWAY_TOKEN_URL || "https://api.getbreezeway.com/public/auth/v1/";
const BASE_URL = process.env.BREEZEWAY_API_URL || "https://api.getbreezeway.com/public/inventory/v1";

export function breezewayAvailable(): boolean {
  return Boolean(process.env.BREEZEWAY_CLIENT_ID && process.env.BREEZEWAY_CLIENT_SECRET);
}

/* =========================== API-client =========================== */

async function requestToken(): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.BREEZEWAY_CLIENT_ID!,
      client_secret: process.env.BREEZEWAY_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Breezeway-token aanvragen mislukte (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { access_token: string };
  await setSetting("breezeway_token", data.access_token);
  // Breezeway-JWT's zijn kort geldig; we bewaren enkel om herstarts te overleven.
  await setSetting("breezeway_token_at", new Date().toISOString());
  return data.access_token;
}

async function bwFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  let token = await getSetting("breezeway_token", "");
  if (!token) token = await requestToken();
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `JWT ${token}`, Accept: "application/json" } });
    if (res.ok) return (await res.json()) as T;
    if (res.status === 401 && attempt === 1) {
      token = await requestToken();
      continue;
    }
    const body = await res.text();
    throw new Error(`Breezeway ${path} gaf ${res.status}: ${body.slice(0, 300)}`);
  }
}

export async function testBreezeway(): Promise<{ ok: true; propertiesTotal: number }> {
  const data = await bwFetch<{ results?: unknown[]; total_count?: number }>("/property", { limit: "1" });
  return { ok: true, propertiesTotal: Number(data.total_count ?? data.results?.length ?? 0) };
}

/* =========================== Sync =========================== */

export interface BreezewaySyncSummary {
  at: string;
  mode: "api" | "demo";
  tasks: { created: number; updated: number; skipped: number };
}

interface BwTask {
  id: number | string;
  name?: string;
  type_department?: string;
  scheduled_date?: string;       // yyyy-mm-dd
  scheduled_time?: string;       // HH:MM
  finished_at?: string;
  status?: { code?: string } | string;
  home?: { id?: number; name?: string };
  assignments?: { name?: string }[];
  subtasks_count?: number;
  subtasks_finished?: number;
  photos?: { url?: string }[];
}

/** Panden waarvoor Breezeway plant: enkel de Linnois-wereld. */
async function linnoisProperties(): Promise<PropertyRow[]> {
  return (await allProperties()).filter((p) => propertyBrand(p) === "linnois" && p.status === "live");
}

function taskStatus(raw: BwTask): { status: string; note: string | null } {
  const code = typeof raw.status === "string" ? raw.status : raw.status?.code ?? "";
  if (["finished", "closed", "done"].includes(code)) return { status: "done", note: null };
  return { status: "confirmed", note: null };
}

/** Echte sync tegen de Breezeway-API (zodra er keys zijn). */
async function syncFromApi(): Promise<BreezewaySyncSummary["tasks"]> {
  const props = await linnoisProperties();
  // Breezeway koppelt taken aan een "home"; we matchen op naam of codenaam.
  const byName = new Map<string, PropertyRow>();
  for (const p of props) {
    byName.set(p.name.toLowerCase(), p);
    if (p.code_name) byName.set(p.code_name.toLowerCase(), p);
  }

  let created = 0, updated = 0, skipped = 0;
  let page = 1;
  for (;;) {
    const data = await bwFetch<{ results: BwTask[]; total_pages?: number }>("/task", {
      type_department: "housekeeping", page: String(page), limit: "100",
    });
    for (const task of data.results ?? []) {
      const prop = byName.get(String(task.home?.name ?? "").toLowerCase());
      if (!prop || !task.scheduled_date) { skipped++; continue; }
      const { status } = taskStatus(task);
      const photos = (task.photos ?? []).map((p) => p.url).filter(Boolean) as string[];
      const id = `bw-${task.id}`;
      const exists = await db.prepare("SELECT id FROM cleanings WHERE breezeway_id = ?").get(String(task.id));
      const timeLabel = task.scheduled_time ? `${task.scheduled_time.slice(0, 5)}` : null;
      if (exists) {
        await db.prepare(`
          UPDATE cleanings SET date = ?, time_label = ?, status = ?, finished_at = ?,
            checklist_done = ?, checklist_total = ?, photos = ?, report_photos = ?
          WHERE breezeway_id = ?
        `).run(task.scheduled_date, timeLabel, status, task.finished_at ?? null,
          task.subtasks_finished ?? null, task.subtasks_count ?? null,
          photos.length || null, JSON.stringify(photos), String(task.id));
        updated++;
      } else {
        await db.prepare(`
          INSERT INTO cleanings (id, property_id, date, time_label, team, source, price, status, status_note,
            photos, ai_check, breezeway_id, scheduled_start, finished_at, checklist_done, checklist_total, report_photos)
          VALUES (?, ?, ?, ?, ?, 'own', 0, ?, NULL, ?, NULL, ?, ?, ?, ?, ?, ?)
        `).run(id, prop.id, task.scheduled_date, timeLabel, task.assignments?.[0]?.name ?? "Poetsteam Linnois",
          status, photos.length || null, String(task.id), task.scheduled_time ?? null,
          task.finished_at ?? null, task.subtasks_finished ?? null, task.subtasks_count ?? null,
          JSON.stringify(photos));
        created++;
      }
    }
    if (!data.total_pages || page >= data.total_pages) break;
    page++;
  }
  return { created, updated, skipped };
}

/* =========================== Demomodus =========================== */

/** Deterministische pseudo-random uit een sleutel — sync blijft idempotent. */
function det(key: string, mod: number): number {
  return createHash("sha1").update(key).digest()[0] % mod;
}

/**
 * Zonder API-keys: bouw de poetsbeurten op uit de boekingen zelf, precies
 * zoals Breezeway ze zou aanleveren. De poets valt niet per se op de
 * uitcheckdag: bij een gat tot de volgende boeking schuift hij 1 à 3 dagen
 * op (het punt uit de meeting). Afgewerkte beurten krijgen een checklist,
 * een fototeller en een inspectiefoto voor het rapport.
 */
async function syncDemo(): Promise<BreezewaySyncSummary["tasks"]> {
  const props = await linnoisProperties();
  let created = 0, updated = 0, skipped = 0;

  const windowFrom = addDays(DEMO_TODAY, -75);
  const windowTo = addDays(DEMO_TODAY, 45);

  for (const prop of props) {
    const bookings = (await db.prepare(
      "SELECT * FROM bookings WHERE property_id = ? AND payout > 0 ORDER BY start_date"
    ).all(prop.id)) as unknown as BookingRow[];

    for (let i = 0; i < bookings.length; i++) {
      const b = bookings[i];
      if (b.end_date < windowFrom || b.end_date > windowTo) { skipped++; continue; }

      // Gat tot de volgende boeking bepaalt wanneer het team écht langsgaat.
      const next = bookings[i + 1];
      const gapDays = next ? Math.max(0, Math.round(
        (new Date(next.start_date + "T00:00:00Z").getTime() - new Date(b.end_date + "T00:00:00Z").getTime()) / 86400000
      )) : 99;
      const shift = gapDays >= 4 ? 1 + det(b.id, 3) : 0; // ruim gat → 1 à 3 dagen later
      const date = addDays(b.end_date, shift);

      const startHour = 9 + det(b.id + "u", 4);          // 9–12 u starten
      const hours = 2 + det(b.id + "d", 2);              // 2 à 3 uur poetsen
      const timeLabel = `${String(startHour).padStart(2, "0")}:00 – ${String(startHour + hours).padStart(2, "0")}:00`;
      const done = date <= DEMO_TODAY;
      const checklistTotal = 22 + det(b.id + "c", 8);
      const checklistDone = done ? checklistTotal : 0;
      const photoCount = done ? 8 + det(b.id + "p", 9) : null;
      const reportPhotos = done && prop.photo?.startsWith("http")
        ? [prop.photo.replace("/t_default_thumb", "")]
        : [];

      const id = `bw-demo-${b.id}`;
      const exists = await db.prepare("SELECT id FROM cleanings WHERE id = ?").get(id);
      if (exists) {
        await db.prepare(`
          UPDATE cleanings SET date = ?, time_label = ?, status = ?, photos = ?, ai_check = ?,
            checklist_done = ?, checklist_total = ?, report_photos = ?, finished_at = ?
          WHERE id = ?
        `).run(date, timeLabel, done ? "done" : "confirmed", photoCount, done ? "OK" : null,
          checklistDone, checklistTotal, JSON.stringify(reportPhotos),
          done ? `${date}T${String(startHour + hours).padStart(2, "0")}:00:00Z` : null, id);
        updated++;
      } else {
        await db.prepare(`
          INSERT INTO cleanings (id, property_id, date, time_label, team, source, price, status, status_note,
            photos, ai_check, breezeway_id, booking_id, scheduled_start, finished_at,
            checklist_done, checklist_total, report_photos)
          VALUES (?, ?, ?, ?, 'Poetsteam Linnois', 'own', 0, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, prop.id, date, timeLabel, done ? "done" : "confirmed",
          photoCount, done ? "OK" : null, `demo-${b.id}`, b.id,
          `${date}T${String(startHour).padStart(2, "0")}:00:00Z`,
          done ? `${date}T${String(startHour + hours).padStart(2, "0")}:00:00Z` : null,
          checklistDone, checklistTotal, JSON.stringify(reportPhotos));
        created++;
      }
    }
  }
  return { created, updated, skipped };
}

/* =========================== Publieke API =========================== */

export async function syncBreezeway(): Promise<BreezewaySyncSummary> {
  const tasks = breezewayAvailable() ? await syncFromApi() : await syncDemo();
  const summary: BreezewaySyncSummary = {
    at: new Date().toISOString(),
    mode: breezewayAvailable() ? "api" : "demo",
    tasks,
  };
  await setSetting("breezeway_last_sync", JSON.stringify(summary));
  return summary;
}

export async function resetBreezewayData(): Promise<{ cleanings: number }> {
  const r = await db.prepare("DELETE FROM cleanings WHERE breezeway_id IS NOT NULL").run();
  await setSetting("breezeway_last_sync", "");
  return { cleanings: r.changes };
}

export async function breezewayStatus(): Promise<{
  configured: boolean;
  demoMode: boolean;
  lastSync: BreezewaySyncSummary | null;
  linkedCleanings: number;
  reportsReady: number;
}> {
  const raw = await getSetting("breezeway_last_sync", "");
  return {
    configured: breezewayAvailable(),
    demoMode: !breezewayAvailable(),
    lastSync: raw ? (JSON.parse(raw) as BreezewaySyncSummary) : null,
    linkedCleanings: (await db.prepare("SELECT COUNT(*) n FROM cleanings WHERE breezeway_id IS NOT NULL").get() as { n: number }).n,
    reportsReady: (await db.prepare("SELECT COUNT(*) n FROM cleanings WHERE breezeway_id IS NOT NULL AND status = 'done'").get() as { n: number }).n,
  };
}
