import { Router } from "express";
import { db, getSetting, setSetting } from "./db";
import {
  DEMO_MONTH, DOW_LABELS, MONTH_FULL, MONTH_LABELS,
  addDays, allProperties, daysInMonth, iso, mapBooking, mapProperty,
  nightPrice, nightsBetween, pad, propertyById, shortLabel, weekdayMonday,
  type BookingRow, type PropertyRow,
} from "./lib";
import { DEMO_TODAY } from "../../shared/types";
import type {
  CalendarData, CalendarDay, Cleaning, Conversation, Message, NewPropertyInput,
  Overview, PriceStripDay, PriceSuggestion, RevenueData, TimelineItem,
} from "../../shared/types";
import { answer } from "./assistant";
import { aiAvailable, llmAnswer, llmDraft } from "./ai";
import { currentUser, requireAdmin } from "./auth";

export const routes = Router();

/* =========================== Overview =========================== */

routes.get("/overview", (_req, res) => {
  const props = allProperties();
  const live = props.filter((p) => p.status === "live");

  const inboxDrafts = (db.prepare("SELECT COUNT(*) n FROM conversations WHERE status = 'draft'").get() as { n: number }).n;
  const guardOpen = (db.prepare("SELECT COUNT(*) n FROM conversations WHERE status = 'guard'").get() as { n: number }).n;
  const priceOpen = (db.prepare("SELECT COUNT(*) n FROM price_suggestions WHERE status = 'open'").get() as { n: number }).n;
  const cleaningPending = (db.prepare("SELECT COUNT(*) n FROM cleanings WHERE status = 'pending_owner'").get() as { n: number }).n;

  // Bezetting & opbrengst voor de demomaand, berekend uit echte boekingen.
  const [yy, mm] = DEMO_MONTH.split("-").map(Number);
  const dim = daysInMonth(yy, mm);
  const monthStart = `${DEMO_MONTH}-01`;
  const monthEnd = addDays(iso(yy, mm, dim), 1);
  let bookedNights = 0;
  let monthRevenue = 0;
  let payoutSum = 0;
  let paidNights = 0;
  for (const p of live) {
    const rows = db.prepare(
      "SELECT * FROM bookings WHERE property_id = ? AND start_date < ? AND end_date > ?"
    ).all(p.id, monthEnd, monthStart) as unknown as BookingRow[];
    for (const b of rows) {
      const from = b.start_date > monthStart ? b.start_date : monthStart;
      const to = b.end_date < monthEnd ? b.end_date : monthEnd;
      bookedNights += nightsBetween(from, to);
      if (b.start_date >= monthStart && b.start_date < monthEnd) monthRevenue += b.payout;
      payoutSum += b.payout;
      paidNights += nightsBetween(b.start_date, b.end_date);
    }
  }
  const occupancyPct = Math.round((bookedNights / (dim * live.length)) * 100);
  const avgNight = paidNights ? Math.round(payoutSum / paidNights) : 0;

  // Tijdlijn van "vandaag": check-outs, poetsbeurten en check-ins.
  const timeline: TimelineItem[] = [];
  const outs = db.prepare("SELECT * FROM bookings WHERE end_date = ?").all(DEMO_TODAY) as unknown as BookingRow[];
  for (const b of outs) {
    const p = propertyById(b.property_id)!;
    timeline.push({
      time: "10:00", icon: "🧳", iconBg: "var(--booking-soft)",
      title: `Check-out ${b.guest}`,
      subtitle: `${p.name} · ${nightsBetween(b.start_date, b.end_date)} nachten · via ${b.channel === "booking" ? "Booking.com" : b.channel === "airbnb" ? "Airbnb" : "VRBO"}`,
      chip: { label: "Uitgecheckt ✓", tone: "good" },
    });
  }
  const cleans = db.prepare("SELECT * FROM cleanings WHERE date = ? AND status != 'done'").all(DEMO_TODAY) as unknown as { property_id: string; team: string; time_label: string | null; status_note: string | null }[];
  for (const c of cleans) {
    const p = propertyById(c.property_id)!;
    timeline.push({
      time: "11:00", icon: "🧽", iconBg: "var(--vrbo-soft)",
      title: `Schoonmaak door ${c.team.split(" (")[0]}`,
      subtitle: `${p.name} · klaar om 14:30 · ${c.status_note ?? ""}`,
      chip: { label: "Bezig", tone: "vrbo" },
    });
  }
  const ins = db.prepare("SELECT * FROM bookings WHERE start_date = ?").all(DEMO_TODAY) as unknown as BookingRow[];
  for (const b of ins) {
    const p = propertyById(b.property_id)!;
    timeline.push({
      time: "16:00", icon: "🔑", iconBg: "var(--coral-soft)",
      title: `Check-in ${b.guest}`,
      subtitle: `${p.name} · ${b.guests} gasten · ${nightsBetween(b.start_date, b.end_date)} nachten · via ${b.channel === "airbnb" ? "Airbnb" : "Booking.com"}`,
      chip: { label: "Code verstuurd", tone: "coral" },
    });
  }

  const hostMsgs = (db.prepare("SELECT COUNT(*) n FROM messages WHERE sender = 'host'").get() as { n: number }).n;
  const plannedCleanings = (db.prepare("SELECT COUNT(*) n FROM cleanings WHERE status != 'done'").get() as { n: number }).n;
  const priceUpdates = (db.prepare("SELECT COUNT(*) n FROM price_suggestions WHERE status = 'accepted'").get() as { n: number }).n;
  const taskTotal = 16 + hostMsgs + plannedCleanings + priceUpdates;

  const d = new Date(DEMO_TODAY + "T00:00:00Z");
  const dowFull = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
  const attention = { inboxDrafts: inboxDrafts + guardOpen, priceOpen, cleaningPending };

  const overview: Overview = {
    greetingName: getSetting("owner_name", "Julie"),
    dateLabel: `${dowFull[weekdayMonday(DEMO_TODAY)]} ${d.getUTCDate()} ${MONTH_FULL[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
    attention,
    kpis: {
      occupancyPct,
      monthRevenue,
      avgNight,
      responseMinutes: Number(getSetting("response_minutes", "4")),
    },
    timeline,
    tasksThisWeek: {
      total: taskTotal,
      detail: `${16 + hostMsgs} gastenberichten beantwoord · ${plannedCleanings} poetsbeurten ingepland · ${2 + priceUpdates} prijsupdates doorgevoerd. Jij keek enkel goed. ✨`,
    },
    properties: allProperties().map(mapProperty),
    trust: {
      count: Number(getSetting("trust_count", "13")),
      target: Number(getSetting("trust_target", "20")),
    },
  };
  res.json(overview);
});

/* =========================== Panden =========================== */

routes.get("/properties", (_req, res) => {
  res.json(allProperties().map(mapProperty));
});

routes.post("/properties", (req, res) => {
  const input = req.body as NewPropertyInput;
  if (!input?.address || typeof input.address !== "string") {
    res.status(400).json({ error: "adres ontbreekt" });
    return;
  }
  const street = input.address.split(",")[0].trim();
  const id = "p-" + street.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const exists = propertyById(id);
  if (exists) {
    res.json(mapProperty(exists));
    return;
  }
  const area = Math.max(60, (input.bedrooms || 3) * 45);
  db.prepare(`
    INSERT INTO properties (id, name, location, type, bedrooms, bathrooms, max_guests, area_m2,
      rating, status, status_label, art, art_bg, channels, cleaning_price, base_price_week, base_price_weekend)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'onboarding', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, street,
    input.address.includes(",") ? input.address.split(",").slice(1).join(",").replace(/\d{4}/, "").trim() : "Knokke-Heist",
    input.type || "Huis",
    input.bedrooms ?? 3, input.bathrooms ?? 2, input.maxGuests ?? 8, area,
    "⏳ Wacht op brandveiligheidsattest", "🏡", "linear-gradient(135deg,#E9F6EF,#D3EDDD)",
    JSON.stringify(input.vrbo ? ["airbnb", "booking", "vrbo"] : ["airbnb", "booking"]),
    Math.round(area * 0.5), 225, 265
  );
  res.status(201).json(mapProperty(propertyById(id)!));
});

/* =========================== Kalender =========================== */

routes.get("/calendar", (req, res) => {
  const propertyId = String(req.query.property || "villa-zeewind");
  const month = String(req.query.month || DEMO_MONTH);
  const prop = propertyById(propertyId);
  if (!prop || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(404).json({ error: "onbekend pand of maand" });
    return;
  }
  const [yy, mm] = month.split("-").map(Number);
  const dim = daysInMonth(yy, mm);
  const monthStart = `${month}-01`;
  const monthEnd = addDays(iso(yy, mm, dim), 1);

  const bookings = (db.prepare(
    "SELECT * FROM bookings WHERE property_id = ? AND start_date < ? AND end_date > ? ORDER BY start_date"
  ).all(propertyId, monthEnd, monthStart) as unknown as BookingRow[]).map(mapBooking);

  const checkoutDays = new Set(
    (db.prepare("SELECT end_date FROM bookings WHERE property_id = ?").all(propertyId) as unknown as { end_date: string }[])
      .map((r) => r.end_date)
  );

  const days: CalendarDay[] = [];
  for (let d = 1; d <= dim; d++) {
    const dateIso = iso(yy, mm, d);
    const b = bookings.find((x) => x.startDate <= dateIso && dateIso < x.endDate);
    let price: number | null = null;
    let suggested: number | null = null;
    if (!b) {
      const np = nightPrice(prop, dateIso);
      price = np.price;
      suggested = np.suggested;
    }
    days.push({
      date: dateIso,
      day: d,
      weekday: weekdayMonday(dateIso),
      today: dateIso === DEMO_TODAY,
      cleaning: checkoutDays.has(dateIso),
      booking: b
        ? { id: b.id, guest: b.guest, channel: b.channel, isStart: b.startDate === dateIso, isEnd: addDays(b.endDate, -1) === dateIso }
        : null,
      price,
      suggested,
    });
  }

  const data: CalendarData = {
    propertyId,
    month,
    monthLabel: `${MONTH_FULL[mm - 1][0].toUpperCase()}${MONTH_FULL[mm - 1].slice(1)} ${yy}`,
    leadingBlanks: weekdayMonday(monthStart),
    days,
    bookings,
  };
  res.json(data);
});

/* =========================== Inbox =========================== */

function conversationById(id: string): Conversation | null {
  const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as any;
  if (!c) return null;
  const msgs = db.prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY id").all(id) as any[];
  const prop = propertyById(c.property_id)!;
  return {
    id: c.id, propertyId: c.property_id, propertyName: prop.name,
    guest: c.guest, avatar: c.avatar, channel: c.channel, status: c.status,
    snippet: c.snippet, timeLabel: c.time_label,
    draft: c.draft, draftNote: c.draft_note, guardReason: c.guard_reason,
    messages: msgs.map((m): Message => ({
      id: String(m.id), sender: m.sender, body: m.body, timeLabel: m.time_label, auto: !!m.auto,
    })),
  };
}

routes.get("/conversations", (_req, res) => {
  const ids = db.prepare("SELECT id FROM conversations ORDER BY sort").all() as unknown as { id: string }[];
  res.json(ids.map((r) => conversationById(r.id)));
});

routes.post("/conversations/:id/approve", (req, res) => {
  const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(req.params.id) as any;
  if (!c || c.status !== "draft" || !c.draft) {
    res.status(409).json({ error: "geen voorstel om goed te keuren" });
    return;
  }
  db.prepare("INSERT INTO messages (conversation_id, sender, body, time_label, auto) VALUES (?, 'host', ?, 'Zonet', 0)")
    .run(c.id, c.draft);
  db.prepare("UPDATE conversations SET status = 'done', snippet = ? WHERE id = ?")
    .run(c.draft.slice(0, 60) + "…", c.id);
  const trust = Math.min(Number(getSetting("trust_target", "20")), Number(getSetting("trust_count", "13")) + 1);
  setSetting("trust_count", String(trust));
  res.json(conversationById(c.id));
});

routes.post("/conversations/:id/reply", (req, res) => {
  const body = String(req.body?.body || "").trim();
  const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(req.params.id) as any;
  if (!c || !body) {
    res.status(400).json({ error: "geen gesprek of leeg bericht" });
    return;
  }
  db.prepare("INSERT INTO messages (conversation_id, sender, body, time_label, auto) VALUES (?, 'host', ?, 'Zonet', 0)")
    .run(c.id, body);
  db.prepare("UPDATE conversations SET status = 'done', snippet = ? WHERE id = ?")
    .run(body.slice(0, 60) + "…", c.id);
  res.json(conversationById(c.id));
});

/* =========================== Prijzen =========================== */

function mapSuggestion(r: any): PriceSuggestion {
  const prop = propertyById(r.property_id)!;
  return {
    id: r.id, propertyId: r.property_id, propertyName: prop.name,
    startDate: r.start_date, endDate: r.end_date,
    rangeLabel: r.range_label, dowLabel: r.dow_label,
    priceFrom: r.price_from, priceTo: r.price_to,
    reason: r.reason, status: r.status,
  };
}

routes.get("/price-suggestions", (_req, res) => {
  const rows = db.prepare("SELECT * FROM price_suggestions ORDER BY start_date").all() as any[];
  res.json(rows.map(mapSuggestion));
});

routes.post("/price-suggestions/:id/decide", (req, res) => {
  const decision = req.body?.decision;
  if (decision !== "accepted" && decision !== "rejected") {
    res.status(400).json({ error: "decision moet 'accepted' of 'rejected' zijn" });
    return;
  }
  const r = db.prepare("SELECT * FROM price_suggestions WHERE id = ?").get(req.params.id) as any;
  if (!r || r.status !== "open") {
    res.status(409).json({ error: "voorstel niet open" });
    return;
  }
  db.prepare("UPDATE price_suggestions SET status = ? WHERE id = ?").run(decision, r.id);
  res.json(mapSuggestion(db.prepare("SELECT * FROM price_suggestions WHERE id = ?").get(r.id)));
});

routes.get("/price-strip", (req, res) => {
  const propertyId = String(req.query.property || "villa-zeewind");
  const prop = propertyById(propertyId);
  if (!prop) {
    res.status(404).json({ error: "onbekend pand" });
    return;
  }
  const days: PriceStripDay[] = [];
  for (let i = 1; i <= 30; i++) {
    const dateIso = addDays(DEMO_TODAY, i);
    const np = nightPrice(prop, dateIso);
    days.push({ date: dateIso, label: shortLabel(dateIso), price: np.price, suggested: np.suggested });
  }
  res.json(days);
});

routes.get("/pricing-settings", (_req, res) => {
  const open = (db.prepare("SELECT COUNT(*) n FROM price_suggestions WHERE status = 'open'").get() as { n: number }).n;
  const decided = (db.prepare("SELECT COUNT(*) n FROM price_suggestions WHERE status != 'open'").get() as { n: number }).n;
  res.json({ auto: getSetting("auto_pricing", "0") === "1", decided, reviewTarget: 10, open });
});

routes.post("/pricing-settings", (req, res) => {
  setSetting("auto_pricing", req.body?.auto ? "1" : "0");
  res.json({ auto: req.body?.auto === true });
});

/* =========================== Schoonmaak =========================== */

function mapCleaning(r: any): Cleaning {
  const prop = propertyById(r.property_id)!;
  const d = new Date(r.date + "T00:00:00Z");
  return {
    id: r.id, propertyId: r.property_id, propertyName: prop.name,
    date: r.date,
    dateLabel: String(d.getUTCDate()),
    dowLabel: r.date === DEMO_TODAY ? `${MONTH_LABELS[d.getUTCMonth()]} · vandaag` : `${MONTH_LABELS[d.getUTCMonth()]} · ${DOW_LABELS[weekdayMonday(r.date)]}`,
    timeLabel: r.time_label,
    team: r.team, source: r.source, price: r.price,
    status: r.status, statusNote: r.status_note,
    photos: r.photos, aiCheck: r.ai_check,
  };
}

routes.get("/cleanings", (_req, res) => {
  const rows = db.prepare("SELECT * FROM cleanings ORDER BY date").all() as any[];
  res.json(rows.map(mapCleaning));
});

routes.post("/cleanings/:id/confirm", (req, res) => {
  const r = db.prepare("SELECT * FROM cleanings WHERE id = ?").get(req.params.id) as any;
  if (!r || r.status !== "pending_owner") {
    res.status(409).json({ error: "geen bevestiging nodig" });
    return;
  }
  db.prepare("UPDATE cleanings SET status = 'confirmed' WHERE id = ?").run(r.id);
  res.json(mapCleaning(db.prepare("SELECT * FROM cleanings WHERE id = ?").get(r.id)));
});

/* =========================== Opbrengsten =========================== */

export function revenueData(): RevenueData {
  const months = db.prepare("SELECT * FROM revenue_months ORDER BY month").all() as unknown as
    { month: string; airbnb: number; booking: number; vrbo: number }[];

  // Lopende maand live uit de boekingen.
  const cur = { month: DEMO_MONTH, airbnb: 0, booking: 0, vrbo: 0 };
  const curBookings = db.prepare(
    "SELECT channel, payout, property_id FROM bookings WHERE start_date LIKE ?"
  ).all(DEMO_MONTH + "%") as unknown as { channel: "airbnb" | "booking" | "vrbo"; payout: number; property_id: string }[];
  for (const b of curBookings) cur[b.channel] += b.payout;

  const all = [...months, cur];
  const rmonths = all.map((m) => ({
    month: m.month,
    label: MONTH_LABELS[Number(m.month.slice(5)) - 1],
    airbnb: m.airbnb, booking: m.booking, vrbo: m.vrbo,
    running: m.month === DEMO_MONTH,
  }));

  const sum = (k: "airbnb" | "booking" | "vrbo") => all.reduce((acc, m) => acc + m[k], 0);
  const chAmounts = { airbnb: sum("airbnb"), booking: sum("booking"), vrbo: sum("vrbo") };
  const totalYear = chAmounts.airbnb + chAmounts.booking + chAmounts.vrbo;
  const channels = ([
    ["airbnb", "Airbnb"], ["booking", "Booking.com"], ["vrbo", "VRBO"],
  ] as const).map(([ch, label]) => ({
    channel: ch, label,
    amount: chAmounts[ch],
    pct: Math.round((chAmounts[ch] / totalYear) * 100),
  }));

  const perProperty = allProperties().map((p) => {
    if (p.status !== "live") {
      return { propertyId: p.id, name: p.name, art: p.art, amount: null, badge: "in onboarding" };
    }
    const h1 = (db.prepare("SELECT amount FROM property_revenue_h1 WHERE property_id = ?").get(p.id) as { amount: number } | undefined)?.amount ?? 0;
    const july = curBookings.filter((b) => b.property_id === p.id).reduce((a, b) => a + b.payout, 0);
    return { propertyId: p.id, name: p.name, art: p.art, amount: h1 + july, badge: null };
  });

  return {
    totalYear,
    deltaLabel: "+22% t.o.v. 2025",
    months: rmonths,
    channels,
    perProperty,
    documents: [
      { id: "d1", icon: "📄", title: "Uitbetaling Airbnb — juni 2026", subtitle: "PDF · automatisch opgehaald", badge: null },
      { id: "d2", icon: "📄", title: "Uitbetaling Booking.com — juni 2026", subtitle: "PDF · automatisch opgehaald", badge: null },
      { id: "d3", icon: "🧾", title: "Staybase-abonnement — juli 2026", subtitle: "Factuur op je vennootschap", badge: "✓ via Peppol verzonden" },
    ],
  };
}

routes.get("/revenue", (_req, res) => {
  res.json(revenueData());
});

/* =========================== Adres-lookup =========================== */

/**
 * Adressuggesties via OpenStreetMap Nominatim (gratis, geen key nodig).
 * De frontend debounce't; hier beperken we tot België en 5 resultaten.
 */
routes.get("/geocode", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 3) {
    res.json([]);
    return;
  }
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=be&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Staybase-demo/0.1 (hello@oblivionlabs.ai)",
        "Accept-Language": "nl-BE",
      },
    });
    if (!r.ok) throw new Error(`nominatim ${r.status}`);
    const data = (await r.json()) as {
      name?: string;
      display_name?: string;
      address?: Record<string, string>;
    }[];
    const seen = new Set<string>();
    const out = data.flatMap((d) => {
      const a = d.address ?? {};
      const street = [a.road, a.house_number].filter(Boolean).join(" ");
      const city = a.village || a.town || a.city || a.municipality || "";
      const line2 = [a.postcode, city].filter(Boolean).join(" ");
      const label = street || d.name || d.display_name?.split(",")[0] || "";
      const value = line2 ? `${label}, ${line2}` : label;
      // Nominatim geeft vaak meerdere OSM-objecten voor hetzelfde adres terug.
      if (!label || seen.has(value)) return [];
      seen.add(value);
      return [{ label, sub: line2, value }];
    });
    res.json(out);
  } catch (err) {
    console.warn("Geocoding mislukt:", err);
    res.json([]); // stil falen — adres blijft vrij invulbaar
  }
});

/* =========================== Onboarding-analytics =========================== */

routes.post("/onboarding/track", (req, res) => {
  const { sessionId, step, stepTitle, durationMs, completed } = req.body ?? {};
  if (typeof sessionId !== "string" || typeof step !== "number" || typeof durationMs !== "number") {
    res.status(400).json({ error: "sessionId, step en durationMs zijn verplicht" });
    return;
  }
  db.prepare(
    "INSERT INTO onboarding_events (session_id, step, step_title, duration_ms, completed, user_id) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    sessionId, step, String(stepTitle ?? ""),
    Math.max(0, Math.round(durationMs)), completed ? 1 : 0,
    currentUser(req)?.id ?? null
  );
  res.status(201).json({ ok: true });
});

/** Alleen voor admins — eigenaars zien hun eigen onboarding-tijden bewust niet. */
routes.get("/onboarding/stats", requireAdmin, (_req, res) => {
  const perStep = db.prepare(`
    SELECT step, step_title AS stepTitle,
           COUNT(*) AS visits,
           ROUND(AVG(duration_ms)) AS avgMs,
           ROUND(SUM(duration_ms) / 1000.0) AS totalSec
    FROM onboarding_events GROUP BY step, step_title ORDER BY step
  `).all();
  const sessions = db.prepare("SELECT COUNT(DISTINCT session_id) AS n FROM onboarding_events").get() as { n: number };
  const completed = db.prepare("SELECT COUNT(DISTINCT session_id) AS n FROM onboarding_events WHERE completed = 1").get() as { n: number };
  const recent = db.prepare(`
    SELECT e.session_id AS sessionId,
           COALESCE(u.name, 'Onbekend') AS userName,
           MIN(e.created_at) AS startedAt,
           SUM(e.duration_ms) AS totalMs,
           COUNT(*) AS steps,
           MAX(e.completed) AS completed
    FROM onboarding_events e LEFT JOIN users u ON u.id = e.user_id
    GROUP BY e.session_id ORDER BY MIN(e.created_at) DESC LIMIT 12
  `).all();
  res.json({ sessionsStarted: sessions.n, sessionsCompleted: completed.n, perStep, recent });
});

routes.get("/admin/users", requireAdmin, (_req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.created_at AS createdAt,
           (SELECT COUNT(*) FROM properties) AS _ignore,
           (SELECT COUNT(DISTINCT session_id) FROM onboarding_events e WHERE e.user_id = u.id) AS onboardings,
           (SELECT MAX(s.created_at) FROM auth_sessions s WHERE s.user_id = u.id) AS lastLogin
    FROM users u ORDER BY u.created_at
  `).all() as Record<string, unknown>[];
  const roles = db.prepare("SELECT role, COUNT(*) AS n FROM users GROUP BY role").all();
  res.json({ users: users.map(({ _ignore, ...u }) => u), roles });
});

/* =========================== Assistent & AI =========================== */

routes.get("/ai-status", (_req, res) => {
  res.json({ llm: aiAvailable() });
});

routes.post("/assistant", async (req, res) => {
  const q = String(req.body?.question || "");
  if (aiAvailable()) {
    try {
      res.json({ answer: await llmAnswer(q), source: "llm" });
      return;
    } catch (err) {
      console.warn("LLM-antwoord mislukt, val terug op regels:", err);
    }
  }
  res.json({ answer: answer(q), source: "rules" });
});

/** Herschrijf het AI-voorstel van een gesprek met het echte model (vereist een API-key). */
routes.post("/conversations/:id/regenerate", async (req, res) => {
  if (!aiAvailable()) {
    res.status(409).json({ error: "Geen AI-key geconfigureerd — zie backend/.env.example" });
    return;
  }
  const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(req.params.id) as any;
  if (!c || c.status !== "draft") {
    res.status(409).json({ error: "alleen open voorstellen kunnen herschreven worden" });
    return;
  }
  const prop = propertyById(c.property_id)!;
  const msgs = db.prepare("SELECT sender, body FROM messages WHERE conversation_id = ? ORDER BY id").all(c.id) as any[];
  try {
    const draft = await llmDraft({
      propertyName: prop.name,
      guest: c.guest,
      channel: c.channel,
      messages: msgs,
      note: c.draft_note,
    });
    db.prepare("UPDATE conversations SET draft = ? WHERE id = ?").run(draft, c.id);
    res.json(conversationById(c.id));
  } catch (err) {
    console.warn("LLM-draft mislukt:", err);
    res.status(502).json({ error: "AI-voorstel genereren mislukte — probeer opnieuw" });
  }
});
