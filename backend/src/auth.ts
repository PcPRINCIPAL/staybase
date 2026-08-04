import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { db } from "./db";

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

function sessionUser(req: Request): UserRow | null {
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.* FROM auth_sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token) as unknown as UserRow | undefined;
  return row ?? null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = sessionUser(req);
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

export function currentUser(req: Request): UserRow | undefined {
  return (req as Request & { user?: UserRow }).user;
}

export const authRoutes = Router();

authRoutes.post("/login", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as unknown as UserRow | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: "E-mailadres of wachtwoord klopt niet." });
    return;
  }
  const token = randomBytes(32).toString("hex");
  db.prepare(
    `INSERT INTO auth_sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+${SESSION_DAYS} days'))`
  ).run(token, user.id);
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`
  );
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

authRoutes.post("/logout", (req, res) => {
  const token = parseCookies(req)[COOKIE_NAME];
  if (token) db.prepare("DELETE FROM auth_sessions WHERE token = ?").run(token);
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  res.json({ ok: true });
});

authRoutes.get("/me", (req, res) => {
  const user = sessionUser(req);
  if (!user) {
    res.status(401).json({ error: "niet aangemeld" });
    return;
  }
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});
