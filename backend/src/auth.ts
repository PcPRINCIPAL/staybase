import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { db } from "./db";
import { PLAN_RANK, isLanguage, viewFor, type Language, type PlatformView, type UserOrigin, type UserPlan, type VatStatus } from "../../shared/types";

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
  origin: UserOrigin;
  language: Language;
  commission_pct: number;
  commission_basis: "bruto" | "netto";
  vat_status: VatStatus;
  company_name: string | null;
  billing_address: string | null;
  vat_number: string | null;
  vat_periodic: boolean;
  iban: string | null;
}

/** Publieke weergave van een gebruiker (zonder wachtwoordhash). */
function publicUser(u: UserRow) {
  return {
    id: u.id, email: u.email, name: u.name, role: u.role, plan: u.plan,
    origin: u.origin ?? "staybase", language: u.language ?? "nl",
    billing: {
      vatStatus: u.vat_status ?? "onbekend",
      companyName: u.company_name ?? null,
      billingAddress: u.billing_address ?? null,
      vatNumber: u.vat_number ?? null,
      vatPeriodic: Boolean(u.vat_periodic),
      iban: u.iban ?? null,
    },
  };
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

/**
 * Slot op onderdelen die een Linnois-gebruiker niet mag zien (inbox, prijzen,
 * schoonmaakdetails). De frontend verbergt ze al; dit is het serverslot erachter.
 * Draait ná requireAuth.
 */
export function requireView(part: keyof PlatformView) {
  const REASON: Record<keyof PlatformView, string> = {
    inbox: "Linnois beheert de gastcommunicatie voor jou — stel je vraag via Chat met Julie.",
    prices: "Linnois bepaalt de prijzen voor jou.",
    grossRevenue: "Je ziet je netto-uitbetaling in plaats van de totale omzet.",
    cleaningDetails: "De schoonmaakdetails worden door Linnois beheerd.",
  };
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: UserRow }).user;
    if (!user) {
      res.status(401).json({ error: "niet aangemeld" });
      return;
    }
    if (viewFor(user)[part]) {
      next();
      return;
    }
    res.status(403).json({ error: REASON[part], blockedBy: "origin" });
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
  // De taal waarin iemand zich inschrijft is meteen zijn voorkeurstaal.
  const language: Language = isLanguage(req.body?.language) ? req.body.language : "nl";
  await db.prepare("INSERT INTO users (id, email, name, password_hash, role, language) VALUES (?, ?, ?, ?, 'owner', ?)")
    .run(id, email, name, hashPassword(password), language);
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

/** Eigen voorkeurstaal aanpassen. Zit op /auth omdat het bij de sessie hoort. */
authRoutes.patch("/me/language", async (req, res) => {
  const user = await sessionUser(req);
  if (!user) {
    res.status(401).json({ error: "niet aangemeld" });
    return;
  }
  const language = req.body?.language;
  if (!isLanguage(language)) {
    res.status(400).json({ error: "taal moet nl, fr of en zijn" });
    return;
  }
  await db.prepare("UPDATE users SET language = ? WHERE id = ?").run(language, user.id);
  res.json({ ok: true, language });
});

/**
 * Facturatiegegevens van de eigenaar zelf (§9a-popup). Het btw-statuut
 * bepaalt vanaf de volgende factuur of er 12% btw op staat of dat de factuur
 * btw-vrij is; reeds uitgereikte facturen behouden hun tarief.
 */
authRoutes.patch("/me/billing", async (req, res) => {
  const user = await sessionUser(req);
  if (!user) {
    res.status(401).json({ error: "niet aangemeld" });
    return;
  }
  const vatStatus = String(req.body?.vatStatus || "");
  if (!["particulier", "vennootschap_btw", "vennootschap_geen_btw"].includes(vatStatus)) {
    res.status(400).json({ error: "kies particulier, btw-plichtige of niet-btw-plichtige vennootschap" });
    return;
  }
  const isCompany = vatStatus !== "particulier";
  const companyName = isCompany ? String(req.body?.companyName || "").trim() || null : null;
  const billingAddress = String(req.body?.billingAddress || "").trim() || null;
  const vatNumber = isCompany ? String(req.body?.vatNumber || "").trim() || null : null;
  const vatPeriodic = isCompany ? Boolean(req.body?.vatPeriodic) : false;
  // IBAN geldt voor elk statuut: ook een particulier krijgt uitbetaald (§9c).
  const iban = String(req.body?.iban || "").trim().toUpperCase() || null;
  if (iban && !/^[A-Z]{2}[0-9]{2}[A-Z0-9 ]{10,30}$/.test(iban)) {
    res.status(400).json({ error: "dat lijkt geen geldig IBAN" });
    return;
  }
  await db.prepare(
    "UPDATE users SET vat_status = ?, company_name = ?, billing_address = ?, vat_number = ?, vat_periodic = ?, iban = ? WHERE id = ?"
  ).run(vatStatus, companyName, billingAddress, vatNumber, vatPeriodic, iban, user.id);
  const fresh = (await db.prepare("SELECT * FROM users WHERE id = ?").get(user.id)) as unknown as UserRow;
  res.json(publicUser(fresh));
});

authRoutes.get("/me", async (req, res) => {
  const user = await sessionUser(req);
  if (!user) {
    res.status(401).json({ error: "niet aangemeld" });
    return;
  }
  res.json(publicUser(user));
});
