import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { seed } from "./seed";

const dataDir = path.join(__dirname, "..", "data");
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "staybase.db"));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms INTEGER NOT NULL,
    max_guests INTEGER NOT NULL,
    area_m2 INTEGER NOT NULL,
    rating REAL,
    status TEXT NOT NULL CHECK (status IN ('live','onboarding')),
    status_label TEXT NOT NULL,
    art TEXT NOT NULL,
    art_bg TEXT NOT NULL,
    channels TEXT NOT NULL,          -- json array
    cleaning_price INTEGER NOT NULL,
    base_price_week INTEGER NOT NULL DEFAULT 245,
    base_price_weekend INTEGER NOT NULL DEFAULT 285,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id),
    guest TEXT NOT NULL,
    avatar TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('airbnb','booking','vrbo')),
    start_date TEXT NOT NULL,        -- check-in (ISO)
    end_date TEXT NOT NULL,          -- check-out (ISO)
    guests INTEGER NOT NULL,
    payout INTEGER NOT NULL,         -- euro
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id),
    guest TEXT NOT NULL,
    avatar TEXT NOT NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft','guard','done')),
    snippet TEXT NOT NULL,
    time_label TEXT NOT NULL,
    draft TEXT,
    draft_note TEXT,
    guard_reason TEXT,
    sort INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    sender TEXT NOT NULL CHECK (sender IN ('guest','host')),
    body TEXT NOT NULL,
    time_label TEXT NOT NULL,
    auto INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS price_suggestions (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,          -- exclusief (nacht vóór deze datum is de laatste)
    range_label TEXT NOT NULL,
    dow_label TEXT NOT NULL,
    price_from INTEGER NOT NULL,
    price_to INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','rejected'))
  );

  CREATE TABLE IF NOT EXISTS cleanings (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id),
    date TEXT NOT NULL,
    time_label TEXT,
    team TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('own','marketplace')),
    price INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('confirmed','pending_owner','awaiting_team','done')),
    status_note TEXT,
    photos INTEGER,
    ai_check TEXT
  );

  -- Historische maandopbrengsten per kanaal (euro). De lopende maand wordt
  -- live berekend uit de boekingen, zodat alles consistent blijft.
  CREATE TABLE IF NOT EXISTS revenue_months (
    month TEXT PRIMARY KEY,          -- yyyy-mm
    airbnb INTEGER NOT NULL,
    booking INTEGER NOT NULL,
    vrbo INTEGER NOT NULL
  );

  -- Historisch jaartotaal per pand vóór de lopende maand (euro).
  CREATE TABLE IF NOT EXISTS property_revenue_h1 (
    property_id TEXT PRIMARY KEY REFERENCES properties(id),
    amount INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS auth_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );
`);

const hasData = db.prepare("SELECT COUNT(*) AS n FROM properties").get() as { n: number };
if (hasData.n === 0) {
  seed(db);
  console.log("Database geseed met demodata.");
}

// Aparte check zodat bestaande databases de demogebruiker ook krijgen.
const hasUsers = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
if (hasUsers.n === 0) {
  // Lazy import om een kringimport (auth → db → auth) te vermijden.
  const { hashPassword } = require("./auth") as typeof import("./auth");
  db.prepare("INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)")
    .run("u-julie", "julie@staybase.be", "Julie", hashPassword("staybase2026"));
  console.log("Demogebruiker aangemaakt: julie@staybase.be / staybase2026");
}

export function getSetting(key: string, fallback: string): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row ? row.value : fallback;
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}
