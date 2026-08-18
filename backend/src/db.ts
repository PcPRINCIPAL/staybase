import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

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
    photo TEXT,                      -- coverfoto (pad in /public)
    description TEXT,
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
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('admin', 'owner')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS auth_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  -- Tijd per onboarding-stap, voor de onboarding-analytics uit de analyse
  -- (waar lopen eigenaars vast, hoeveel minuten per stap → CRM/nurturing).
  CREATE TABLE IF NOT EXISTS onboarding_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,          -- één uuid per geopende wizard
    step INTEGER NOT NULL,
    step_title TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,  -- 1 op de slotstap van een afgeronde wizard
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Sinds de Guesty-koppeling live is, wordt er niet meer geseed met demodata:
// panden en boekingen komen binnen via Koppelingen → Synchroniseer nu.
// (De oude demo-seed staat nog in git-historie: backend/src/seed.ts.)

// Lichtgewicht migraties voor databases die vóór deze kolommen zijn aangemaakt.
try { db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'owner'"); } catch { /* bestaat al */ }
try { db.exec("ALTER TABLE onboarding_events ADD COLUMN user_id TEXT"); } catch { /* bestaat al */ }
try { db.exec("ALTER TABLE properties ADD COLUMN photo TEXT"); } catch { /* bestaat al */ }
try { db.exec("ALTER TABLE properties ADD COLUMN description TEXT"); } catch { /* bestaat al */ }
// Guesty-koppeling: onthoud welke rijen uit Guesty komen (upsert bij elke sync).
try { db.exec("ALTER TABLE properties ADD COLUMN guesty_id TEXT"); } catch { /* bestaat al */ }
try { db.exec("ALTER TABLE bookings ADD COLUMN guesty_id TEXT"); } catch { /* bestaat al */ }
// Coördinaten voor de kaartweergave; Guesty levert ze mee bij elke sync.
try { db.exec("ALTER TABLE properties ADD COLUMN lat REAL"); } catch { /* bestaat al */ }
try { db.exec("ALTER TABLE properties ADD COLUMN lng REAL"); } catch { /* bestaat al */ }
// Gastenberichten uit Guesty (inbox-sync).
try { db.exec("ALTER TABLE conversations ADD COLUMN guesty_id TEXT"); } catch { /* bestaat al */ }
try { db.exec("ALTER TABLE messages ADD COLUMN guesty_id TEXT"); } catch { /* bestaat al */ }
// In- en uitchecktijd (HH:MM, lokale tijd) — Guesty levert exacte tijdstippen mee.
try { db.exec("ALTER TABLE bookings ADD COLUMN checkin_time TEXT"); } catch { /* bestaat al */ }
try { db.exec("ALTER TABLE bookings ADD COLUMN checkout_time TEXT"); } catch { /* bestaat al */ }
// Voor de Insights-pagina: wanneer werd geboekt en wanneer werd elk bericht verstuurd.
try { db.exec("ALTER TABLE bookings ADD COLUMN booked_at TEXT"); } catch { /* bestaat al */ }
try { db.exec("ALTER TABLE messages ADD COLUMN created_at TEXT"); } catch { /* bestaat al */ }


// Demogebruikers (idempotent): Julie beheert het platform, Maxime is eigenaar.
{
  // Lazy import om een kringimport (auth → db → auth) te vermijden.
  const { hashPassword } = require("./auth") as typeof import("./auth");
  const ensureUser = (id: string, email: string, name: string, role: "admin" | "owner") => {
    const exists = db.prepare("SELECT 1 FROM users WHERE id = ?").get(id);
    if (!exists) {
      db.prepare("INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)")
        .run(id, email, name, hashPassword("staybase2026"), role);
      console.log(`Demogebruiker aangemaakt: ${email} / staybase2026 (${role})`);
    } else {
      db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
    }
  };
  ensureUser("u-julie", "julie@staybase.be", "Julie", "admin");
  ensureUser("u-maxime", "maxime@staybase.be", "Maxime", "owner");
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
