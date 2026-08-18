import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { db } from "./db";
import { PLAN_RANK, type UserPlan } from "../../shared/types";

/**
 * Sessie-gebaseerde login met een httpOnly-cookie.
 * In een latere fase vervangt Supabase Auth deze module; de rest van de API
 * kijkt enkel naar `requireAuth`, dus die wissel blijft lokaal.
 */

const COOKIE_NAME = "sb_session";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: "admin" | "owner";
  plan: UserPlan;
}

/** Publieke weergave van een gebruiker (zonder wachtwoordhash). */
function publicUser(u: UserRow) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, plan: u.plan };
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

async function sessionUser(req: Request): Promise<UserRow | null> {
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return null;
  const row = (await db.prepare(`
    SELECT u.* FROM auth_sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token)) as unknown as UserRow | undefined;
  return row ?? null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await sessionUser(req);
  if (!user) {
    res.status(401).json({ error: "niet aangemeld" });
    return;
  }
  (req as Request & { user: UserRow }).user = user;
  next();
}

/** Extra slot op admin-endpoints; draait ná requireAuth. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as Request & { user?: UserRow }).user;
  if (user?.role !== "admin") {
    res.status(403).json({ error: "alleen voor beheerders" });
    return;
  }
  next();
}

/** Slot op formule-gebonden endpoints; admins mogen altijd door. Draait ná requireAuth. */
export function requirePlan(min: UserPlan) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: UserRow }).user;
    if (!user) {
      res.status(401).json({ error: "niet aangemeld" });
      return;
    }
    if (user.role === "admin" || PLAN_RANK[user.plan ?? "basic"] >= PLAN_RANK[min]) {
      next();
      return;
    }
    res.status(403).json({ error: `Dit onderdeel zit in de ${min === "super" ? "Super" : "Premium"}-formule.`, requiredPlan: min });
  };
}

export function currentUser(req: Request): UserRow | undefined {
  return (req as Request & { user?: UserRow }).user;
}

export const authRoutes = Router();

/** Maakt een sessie aan en zet de httpOnly-cookie; gedeeld door login en registratie. */
async function startSession(res: Response, user: UserRow): Promise<void> {
  const token = randomBytes(32).toString("hex");
  await db.prepare(
    `INSERT INTO auth_sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+${SESSION_DAYS} days'))`
  ).run(token, user.id);
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`
  );
}

authRoutes.post("/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const user = (await db.prepare("SELECT * FROM users WHERE email = ?").get(email)) as unknown as UserRow | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: "E-mailadres of wachtwoord klopt niet." });
    return;
  }
  await startSession(res, user);
  res.json(publicUser(user));
});

authRoutes.post("/register", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (name.length < 2) {
    res.status(400).json({ error: "Vul je naam in." });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    res.status(400).json({ error: "Dat lijkt geen geldig e-mailadres." });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Kies een wachtwoord van minstens 8 tekens." });
    return;
  }
  const exists = await db.prepare("SELECT 1 FROM users WHERE email = ?").get(email);
  if (exists) {
    res.status(409).json({ error: "Er bestaat al een account met dit e-mailadres. Log in of kies een ander adres." });
    return;
  }

  const id = "u-" + randomBytes(8).toString("hex");
  await db.prepare("INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, 'owner')")
    .run(id, email, name, hashPassword(password));
  const user = (await db.prepare("SELECT * FROM users WHERE id = ?").get(id)) as unknown as UserRow;
  await startSession(res, user);
  res.status(201).json(publicUser(user));
});

authRoutes.post("/logout", async (req, res) => {
  const token = parseCookies(req)[COOKIE_NAME];
  if (token) await db.prepare("DELETE FROM auth_sessions WHERE token = ?").run(token);
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  res.json({ ok: true });
});

authRoutes.get("/me", async (req, res) => {
  const user = await sessionUser(req);
  if (!user) {
    res.status(401).json({ error: "niet aangemeld" });
    return;
  }
  res.json(publicUser(user));
});
