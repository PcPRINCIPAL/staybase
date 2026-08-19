import { Pool, types } from "pg";
import { loadEnv } from "./env";

// Imports worden gehoist: dit module laadt vóór index.ts loadEnv() aanroept,
// dus we laden de .env hier zelf (idempotent — bestaande waarden blijven staan).
loadEnv();

/**
 * Databaselaag — Supabase Postgres (voorheen SQLite via node:sqlite).
 *
 * De rest van de code gebruikt dezelfde API als vroeger (`db.prepare(sql)
 * .get/.all/.run`), alleen zijn de methodes nu async. De laag vertaalt:
 *   • ?-placeholders → $1..$n
 *   • datetime('now' [, '+X days']) → now() [+ interval 'X days']
 * Het schema zelf staat in supabase/migrations/0002_volledig_schema.sql;
 * alleen de eigen auth-tabellen (users/auth_sessions) maakt deze laag aan,
 * omdat die bij de latere Supabase-Auth-overstap weer verdwijnen.
 */

// Postgres-types als strings/getallen teruggeven zoals de app ze verwacht.
types.setTypeParser(1082, (v) => v);                                  // date → "yyyy-mm-dd"
types.setTypeParser(1114, (v) => new Date(v + "Z").toISOString());    // timestamp → ISO
types.setTypeParser(1184, (v) => new Date(v).toISOString());          // timestamptz → ISO
types.setTypeParser(1700, (v) => parseFloat(v));                      // numeric → number
types.setTypeParser(20, (v) => Number(v));                            // int8 (count) → number

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  throw new Error("SUPABASE_DB_URL ontbreekt in backend/.env — zie backend/.env.example");
}

export const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 15000,
});

/** SQLite-vlagen naar Postgres vertalen; puur tekstueel, per query. */
function translate(sql: string): string {
  let out = sql
    .replace(/datetime\('now',\s*'\+(\d+)\s*days?'\)/gi, "(now() + interval '$1 days')")
    .replace(/datetime\('now'\)/gi, "now()");
  // ?-placeholders → $1..$n
  let n = 0;
  out = out.replace(/\?/g, () => `$${++n}`);
  return out;
}

interface Statement {
  get(...params: unknown[]): Promise<unknown>;
  all(...params: unknown[]): Promise<unknown[]>;
  run(...params: unknown[]): Promise<{ changes: number }>;
}

export const db = {
  prepare(sql: string): Statement {
    const text = translate(sql);
    return {
      async get(...params: unknown[]) {
        const r = await pool.query(text, params);
        return r.rows[0];
      },
      async all(...params: unknown[]) {
        const r = await pool.query(text, params);
        return r.rows;
      },
      async run(...params: unknown[]) {
        const r = await pool.query(text, params);
        return { changes: r.rowCount ?? 0 };
      },
    };
  },
  async exec(sql: string) {
    await pool.query(sql);
  },
};

export async function getSetting(key: string, fallback: string): Promise<string> {
  const row = (await db.prepare("SELECT value FROM settings WHERE key = ?").get(key)) as
    | { value: string }
    | undefined;
  return row ? row.value : fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

/** Eenmalige opstart: eigen auth-tabellen + demogebruikers. */
export async function bootstrap(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text NOT NULL UNIQUE,
      name text NOT NULL,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'owner' CHECK (role IN ('admin', 'owner')),
      plan text NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'premium', 'super')),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    );
  `);
  // onboarding_events.user_id en properties.owner_id zijn in het Supabase-script
  // uuid's → profiles; zolang de eigen auth draait, gebruiken we tekst-ids
  // zonder foreign key.
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'onboarding_events' AND column_name = 'user_id' AND data_type = 'uuid'
      ) THEN
        ALTER TABLE onboarding_events DROP CONSTRAINT IF EXISTS onboarding_events_user_id_fkey;
        ALTER TABLE onboarding_events ALTER COLUMN user_id TYPE text USING user_id::text;
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'properties' AND column_name = 'owner_id' AND data_type = 'uuid'
      ) THEN
        ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_owner_id_fkey;
        ALTER TABLE properties ALTER COLUMN owner_id TYPE text USING owner_id::text;
      END IF;
    END $$;
  `);

  // Demogebruikers (idempotent): Julie beheert het platform, Maxime is eigenaar.
  const { hashPassword } = require("./auth") as typeof import("./auth");
  const ensureUser = async (id: string, email: string, name: string, role: "admin" | "owner", plan: string) => {
    const exists = await db.prepare("SELECT 1 FROM users WHERE id = ?").get(id);
    if (!exists) {
      await db.prepare("INSERT INTO users (id, email, name, password_hash, role, plan) VALUES (?, ?, ?, ?, ?, ?)")
        .run(id, email, name, hashPassword("staybase2026"), role, plan);
      console.log(`Demogebruiker aangemaakt: ${email} / staybase2026 (${role}, ${plan})`);
    }
  };
  await ensureUser("u-julie", "julie@staybase.be", "Julie", "admin", "super");
  await ensureUser("u-maxime", "maxime@staybase.be", "Maxime", "owner", "super");
}
