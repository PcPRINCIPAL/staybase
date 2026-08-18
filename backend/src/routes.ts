import { Router } from "express";
import { db, getSetting, setSetting } from "./db";
import {
  DEMO_MONTH, DOW_LABELS, MONTH_FULL, MONTH_LABELS,
  addDays, allProperties, daysInMonth, iso, mapBooking, mapProperty,
  nightPrice, nightsBetween, pad, propertyById, shortLabel, suggestionsFor, weekdayMonday,
  type BookingRow, type PropertyRow,
} from "./lib";
import { DEMO_TODAY } from "../../shared/types";
import type {
  CalendarData, CalendarDay, CalendarOverview, Cleaning, Conversation, InsightsData, Message,
  NewPropertyInput, Overview, PriceStripDay, PriceSuggestion, RevenueData, TimelineItem,
} from "../../shared/types";
import { answer } from "./assistant";
import { aiAvailable, llmAnswer, llmDraft } from "./ai";
import { guestyAvailable, guestyStatus, resetGuestyData, syncGuesty, testGuesty } from "./guesty";
import { currentUser, requireAdmin, requirePlan } from "./auth";

export const routes = Router();

/**
 * Reactietijden in minuten: per gesprek de tijd tussen een (eerste onbeantwoord)
 * gastbericht en het eerstvolgende antwoord. Gebruikt door /overview en /insights.
 */
async function responseDeltasMin(): Promise<number[]> {
  const msgs = await db.prepare(
    "SELECT conversation_id, sender, created_at FROM messages WHERE created_at IS NOT NULL ORDER BY conversation_id, created_at"
  ).all() as unknown as { conversation_id: string; sender: string; created_at: string }[];
  const deltas: number[] = [];
  let conv = "";
  let openGuestAt: number | null = null;
  for (const m of msgs) {
    if (m.conversation_id !== conv) { conv = m.conversation_id; openGuestAt = null; }
    const t = Date.parse(m.created_at);
    if (Number.isNaN(t)) continue;
    if (m.sender === "guest") {
      openGuestAt = openGuestAt ?? t;
    } else if (openGuestAt != null) {
      const d = (t - openGuestAt) / 60000;
      if (d >= 0 && d <= 7 * 24 * 60) deltas.push(d);
      openGuestAt = null;
    }
  }
  return deltas.sort((a, b) => a - b);
}

/** Publieke client-config: alleen waarden die de browser mag zien. */
routes.get("/client-config", async (_req, res) => {
  res.json({ mapboxToken: process.env.MAPBOX_TOKEN ?? null });
});

/* =========================== Overview =========================== */

routes.get("/overview", async (req, res) => {
  const props = await allProperties();
  const live = props.filter((p) => p.status === "live");

  const inboxDrafts = (await db.prepare("SELECT COUNT(*) n FROM conversations WHERE status = 'draft'").get() as { n: number }).n;
  const guardOpen = (await db.prepare("SELECT COUNT(*) n FROM conversations WHERE status = 'guard'").get() as { n: number }).n;
  const priceOpen = (await db.prepare("SELECT COUNT(*) n FROM price_suggestions WHERE status = 'open'").get() as { n: number }).n;
  const cleaningPending = (await db.prepare("SELECT COUNT(*) n FROM cleanings WHERE status = 'pending_owner'").get() as { n: number }).n;

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
    const rows = await db.prepare(
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
  const occupancyPct = live.length ? Math.round((bookedNights / (dim * live.length)) * 100) : 0;
  const avgNight = paidNights ? Math.round(payoutSum / paidNights) : 0;

  // Tijdlijn van "vandaag": check-outs, poetsbeurten en check-ins.
  const timeline: TimelineItem[] = [];
  const outs = await db.prepare("SELECT * FROM bookings WHERE end_date = ?").all(DEMO_TODAY) as unknown as BookingRow[];
  for (const b of outs) {
    const p = (await propertyById(b.property_id))!;
    timeline.push({
      time: "10:00", icon: "🧳", iconBg: "var(--booking-soft)",
      title: `Check-out ${b.guest}`,
      subtitle: `${p.name} · ${nightsBetween(b.start_date, b.end_date)} nachten · via ${b.channel === "booking" ? "Booking.com" : b.channel === "airbnb" ? "Airbnb" : "VRBO"}`,
      chip: { label: "Uitgecheckt ✓", tone: "good" },
    });
  }
  const cleans = await db.prepare("SELECT * FROM cleanings WHERE date = ? AND status != 'done'").all(DEMO_TODAY) as unknown as { property_id: string; team: string; time_label: string | null; status_note: string | null }[];
  for (const c of cleans) {
    const p = (await propertyById(c.property_id))!;
    timeline.push({
      time: "11:00", icon: "🧽", iconBg: "var(--vrbo-soft)",
      title: `Schoonmaak door ${c.team.split(" (")[0]}`,
      subtitle: `${p.name} · klaar om 14:30 · ${c.status_note ?? ""}`,
      chip: { label: "Bezig", tone: "vrbo" },
    });
  }
  const ins = await db.prepare("SELECT * FROM bookings WHERE start_date = ?").all(DEMO_TODAY) as unknown as BookingRow[];
  for (const b of ins) {
    const p = (await propertyById(b.property_id))!;
    timeline.push({
      time: "16:00", icon: "🔑", iconBg: "var(--coral-soft)",
      title: `Check-in ${b.guest}`,
      subtitle: `${p.name} · ${b.guests} gasten · ${nightsBetween(b.start_date, b.end_date)} nachten · via ${b.channel === "airbnb" ? "Airbnb" : "Booking.com"}`,
      chip: { label: "Code verstuurd", tone: "coral" },
    });
  }

  const hostMsgs = (await db.prepare("SELECT COUNT(*) n FROM messages WHERE sender = 'host'").get() as { n: number }).n;
  const plannedCleanings = (await db.prepare("SELECT COUNT(*) n FROM cleanings WHERE status != 'done'").get() as { n: number }).n;
  const priceUpdates = (await db.prepare("SELECT COUNT(*) n FROM price_suggestions WHERE status = 'accepted'").get() as { n: number }).n;
  const taskTotal = hostMsgs + plannedCleanings + priceUpdates;

  const d = new Date(DEMO_TODAY + "T00:00:00Z");
  const dowFull = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
  const attention = { inboxDrafts: inboxDrafts + guardOpen, priceOpen, cleaningPending };

  /* ---------- Homepage-data (alles uit echte boekingen/berichten) ---------- */
  const liveIds = new Set(live.map((p) => p.id));
  const paid = (await db.prepare("SELECT * FROM bookings WHERE payout > 0").all() as unknown as BookingRow[])
    .filter((b) => liveIds.has(b.property_id));
  const liveCount = live.length || 1;

  const nightsWin = (from: string, toEx: string, propertyId?: string) => {
    let n = 0;
    for (const b of paid) {
      if (propertyId && b.property_id !== propertyId) continue;
      if (b.start_date < toEx && b.end_date > from) {
        const f = b.start_date > from ? b.start_date : from;
        const t = b.end_date < toEx ? b.end_date : toEx;
        n += nightsBetween(f, t);
      }
    }
    return n;
  };
  const monthMeta = (off: number) => {
    const dt = new Date(Date.UTC(yy, mm - 1 + off, 1));
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth() + 1;
    const dd = daysInMonth(y, m);
    const month = `${y}-${String(m).padStart(2, "0")}`;
    return { month, dim: dd, from: `${month}-01`, toEx: addDays(iso(y, m, dd), 1) };
  };

  // Sparklines: laatste 8 maanden t.e.m. nu.
  const sparkOccupancy: number[] = [];
  const sparkRevenue: number[] = [];
  const sparkAdr: number[] = [];
  const sparkBookings: number[] = [];
  for (let off = -7; off <= 0; off++) {
    const mm2 = monthMeta(off);
    sparkOccupancy.push(Math.round((nightsWin(mm2.from, mm2.toEx) / (mm2.dim * liveCount)) * 100));
    const started = paid.filter((b) => b.start_date >= mm2.from && b.start_date < mm2.toEx);
    const rev = started.reduce((a, b) => a + b.payout, 0);
    const nights = started.reduce((a, b) => a + nightsBetween(b.start_date, b.end_date), 0);
    sparkRevenue.push(rev);
    sparkAdr.push(nights ? Math.round(rev / nights) : 0);
    sparkBookings.push(started.length);
  }
  const prev = monthMeta(-1);
  const occupancyPrevPct = Math.round((nightsWin(prev.from, prev.toEx) / (prev.dim * liveCount)) * 100);
  const prevMonthRevenue = paid
    .filter((b) => b.start_date >= prev.from && b.start_date < prev.toEx)
    .reduce((a, b) => a + b.payout, 0);

  const ratings = live.map((p) => p.rating).filter((r): r is number => r != null);
  const rating = ratings.length ? Math.round((ratings.reduce((a, r) => a + r, 0) / ratings.length) * 100) / 100 : null;

  const deltas = await responseDeltasMin();
  const medianResponse = deltas.length ? Math.round(deltas[Math.floor(deltas.length / 2)]) : null;

  // Oudste onbeantwoorde gastbericht (open gesprekken).
  const oldest = await db.prepare(`
    SELECT MIN(m.created_at) AS t FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.status IN ('draft','guard') AND m.sender = 'guest' AND m.created_at IS NOT NULL
  `).get() as { t: string | null };
  const oldestInboxMinutes = oldest.t ? Math.max(1, Math.round((Date.now() - Date.parse(oldest.t)) / 60000)) : null;

  const tomorrowIso = addDays(DEMO_TODAY, 1);
  const tomorrow = {
    checkIns: paid.filter((b) => b.start_date === tomorrowIso).length,
    checkOuts: paid.filter((b) => b.end_date === tomorrowIso).length,
    // Elke check-out betekent een poetsbeurt (zolang de poets-marktplaats nog niet live is).
    cleanings: paid.filter((b) => b.end_date === tomorrowIso).length,
  };

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const weekAgoDay = addDays(DEMO_TODAY, -7);
  const weekMessages = (await db.prepare(
    "SELECT COUNT(*) n FROM messages WHERE sender = 'host' AND created_at >= ?"
  ).get(weekAgo) as { n: number }).n;
  const weekNewBookings = paid.filter((b) => b.booked_at && b.booked_at >= weekAgo).length;
  const weekCheckIns = paid.filter((b) => b.start_date >= weekAgoDay && b.start_date <= DEMO_TODAY).length;
  const weekWork = {
    messages: weekMessages,
    newBookings: weekNewBookings,
    checkIns: weekCheckIns,
    minutes: weekMessages * 4 + weekNewBookings * 3 + weekCheckIns * 2, // geschatte tijdswinst
  };

  // Inzichtkaarten: concreet en berekend, geen verzinsels.
  const homeInsights = [];
  if (attention.inboxDrafts > 0) {
    homeInsights.push({
      icon: "💬", title: "Gastberichten",
      body: `${attention.inboxDrafts} ${attention.inboxDrafts === 1 ? "gast wacht" : "gasten wachten"} op antwoord.`,
      cta: "Laat Staybase antwoorden", to: "/inbox",
    });
  }
  const in30 = addDays(DEMO_TODAY, 30);
  const quietProp = live
    .map((p) => ({ p, free: 30 - nightsWin(DEMO_TODAY, in30, p.id) }))
    .sort((a, b) => b.free - a.free)[0];
  if (quietProp && quietProp.free > 0) {
    homeInsights.push({
      icon: "📅", title: "Beschikbaarheid",
      body: `${quietProp.p.name} heeft de komende 30 dagen nog ${quietProp.free} vrije nachten.`,
      cta: "Bekijk de kalender", to: "/kalender",
    });
  }
  let weakMonth: { label: string; pct: number } | null = null;
  for (let off = 1; off <= 4; off++) {
    const mm3 = monthMeta(off);
    const pct = Math.round((nightsWin(mm3.from, mm3.toEx) / (mm3.dim * liveCount)) * 100);
    if (!weakMonth || pct < weakMonth.pct) weakMonth = { label: MONTH_FULL[Number(mm3.month.slice(5)) - 1], pct };
  }
  if (weakMonth && weakMonth.pct < 50) {
    homeInsights.push({
      icon: "🏷️", title: "Prijskans",
      body: `${weakMonth.label[0].toUpperCase()}${weakMonth.label.slice(1)} is pas ${weakMonth.pct}% gevuld — een scherpere prijs kan boekingen versnellen.`,
      cta: "Bekijk prijzen", to: "/prijzen",
    });
  }

  const curMonth = monthMeta(0);
  const homeProperties = live.map((p) => {
    const checkin = paid.find((b) => b.property_id === p.id && b.start_date === DEMO_TODAY);
    const checkout = paid.find((b) => b.property_id === p.id && b.end_date === DEMO_TODAY);
    const todayLabel = checkin && checkout
      ? "Vandaag: wisseldag"
      : checkin ? `Vandaag: check-in${checkin.checkin_time ? ` om ${checkin.checkin_time}` : ""}`
      : checkout ? `Vandaag: check-out${checkout.checkout_time ? ` om ${checkout.checkout_time}` : ""}`
      : "Vandaag: niets gepland";
    return {
      id: p.id, name: p.name, location: p.location, photo: p.photo, art: p.art, artBg: p.art_bg,
      occupancyPct: Math.round((nightsWin(curMonth.from, curMonth.toEx, p.id) / curMonth.dim) * 100),
      monthRevenue: paid
        .filter((b) => b.property_id === p.id && b.start_date >= curMonth.from && b.start_date < curMonth.toEx)
        .reduce((a, b) => a + b.payout, 0),
      rating: p.rating,
      todayLabel,
    };
  }).sort((a, b) => b.monthRevenue - a.monthRevenue);

  const home = {
    oldestInboxMinutes,
    occupancyPrevPct,
    prevMonthRevenue,
    sparkOccupancy,
    sparkRevenue,
    sparkAdr,
    sparkBookings,
    adrPrev: sparkAdr[sparkAdr.length - 2] || null,
    rating,
    medianResponseMin: medianResponse,
    guestySyncAt: (await guestyStatus()).lastSync?.at ?? null,
    tomorrow,
    weekWork,
    insights: homeInsights.slice(0, 3),
    properties: homeProperties,
  };

  const overview: Overview = {
    greetingName: currentUser(req)?.name ?? await getSetting("owner_name", "Julie"),
    dateLabel: `${dowFull[weekdayMonday(DEMO_TODAY)]} ${d.getUTCDate()} ${MONTH_FULL[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
    attention,
    kpis: {
      occupancyPct,
      monthRevenue,
      avgNight,
      responseMinutes: Number(await getSetting("response_minutes", "4")),
    },
    timeline,
    tasksThisWeek: {
      total: taskTotal,
      detail: taskTotal > 0
        ? `${hostMsgs} gastenberichten beantwoord · ${plannedCleanings} poetsbeurten ingepland · ${priceUpdates} prijsupdates doorgevoerd. Jij keek enkel goed. ✨`
        : "Zodra Staybase berichten beantwoordt, poetsbeurten inplant of prijzen bijstuurt, zie je dat hier.",
    },
    properties: (await allProperties()).map(mapProperty),
    home,
    trust: {
      count: Number(await getSetting("trust_count", "13")),
      target: Number(await getSetting("trust_target", "20")),
    },
  };
  res.json(overview);
});

/* =========================== Panden =========================== */

routes.get("/properties", async (_req, res) => {
  res.json((await allProperties()).map(mapProperty));
});

/** Alles voor de detailpagina van één pand. */
routes.get("/properties/:id", async (req, res) => {
  const prop = await propertyById(req.params.id);
  if (!prop) {
    res.status(404).json({ error: "onbekend pand" });
    return;
  }
  const jaar = DEMO_TODAY.slice(0, 4);
  const boekingen = (await db.prepare(
    "SELECT * FROM bookings WHERE property_id = ? ORDER BY start_date"
  ).all(prop.id) as unknown as BookingRow[]).map(mapBooking);

  const ditJaar = boekingen.filter((b) => b.startDate.startsWith(jaar));
  const nachten = ditJaar.reduce((n, b) => n + nightsBetween(b.startDate, b.endDate), 0);
  const omzetBoekingen = ditJaar.reduce((n, b) => n + b.payout, 0);
  const historisch = (await db.prepare("SELECT amount FROM property_revenue_h1 WHERE property_id = ?")
    .get(prop.id) as { amount: number } | undefined)?.amount ?? 0;

  // Bezetting van de demomaand voor dit pand.
  const [yy, mm] = DEMO_MONTH.split("-").map(Number);
  const dim = daysInMonth(yy, mm);
  const monthStart = `${DEMO_MONTH}-01`;
  const monthEnd = addDays(iso(yy, mm, dim), 1);
  let geboekteNachten = 0;
  for (const b of boekingen) {
    if (b.startDate < monthEnd && b.endDate > monthStart) {
      const van = b.startDate > monthStart ? b.startDate : monthStart;
      const tot = b.endDate < monthEnd ? b.endDate : monthEnd;
      geboekteNachten += nightsBetween(van, tot);
    }
  }

  const perKanaal = { airbnb: 0, booking: 0, vrbo: 0 };
  for (const b of ditJaar) perKanaal[b.channel] += b.payout;
  const totaalKanaal = perKanaal.airbnb + perKanaal.booking + perKanaal.vrbo || 1;

  res.json({
    property: mapProperty(prop),
    kpis: {
      occupancyPct: Math.round((geboekteNachten / dim) * 100),
      revenueYear: historisch + omzetBoekingen,
      avgNight: nachten ? Math.round(omzetBoekingen / nachten) : 0,
      bookingsYear: ditJaar.length,
      nightsBooked: nachten,
    },
    upcomingBookings: boekingen.filter((b) => b.endDate >= DEMO_TODAY).slice(0, 6),
    cleanings: (await db.prepare("SELECT * FROM cleanings WHERE property_id = ? ORDER BY date").all(prop.id) as any[]).map(mapCleaning),
    suggestions: (await db.prepare("SELECT * FROM price_suggestions WHERE property_id = ? AND status = 'open' ORDER BY start_date").all(prop.id) as any[]).map(mapSuggestion),
    revenueByChannel: ([["airbnb", "Airbnb"], ["booking", "Booking.com"], ["vrbo", "VRBO"]] as const)
      .map(([ch, label]) => ({
        channel: ch, label,
        amount: perKanaal[ch],
        pct: Math.round((perKanaal[ch] / totaalKanaal) * 100),
      }))
      .filter((c) => c.amount > 0),
  });
});

routes.post("/properties", async (req, res) => {
  const input = req.body as NewPropertyInput;
  if (!input?.address || typeof input.address !== "string") {
    res.status(400).json({ error: "adres ontbreekt" });
    return;
  }
  const street = input.address.split(",")[0].trim();
  const id = "p-" + street.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const exists = await propertyById(id);
  if (exists) {
    res.json(mapProperty(exists));
    return;
  }
  const area = Math.max(60, (input.bedrooms || 3) * 45);
  const aantal = (await db.prepare("SELECT COUNT(*) n FROM properties").get() as { n: number }).n;
  const voorzieningen = (input.amenities ?? []).map((a) => a.replace(/^\S+\s/, "").toLowerCase());
  await db.prepare(`
    INSERT INTO properties (id, name, location, type, bedrooms, bathrooms, max_guests, area_m2,
      rating, status, status_label, art, art_bg, photo, description, channels, cleaning_price,
      base_price_week, base_price_weekend)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'onboarding', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, street,
    input.address.includes(",") ? input.address.split(",").slice(1).join(",").replace(/\d{4}/, "").trim() : "Knokke-Heist",
    input.type || "Huis",
    input.bedrooms ?? 3, input.bathrooms ?? 2, input.maxGuests ?? 8, area,
    "⏳ Wacht op brandveiligheidsattest", "🏡", "linear-gradient(135deg,#E9F6EF,#D3EDDD)",
    `/pand${(aantal % 4) + 1}.webp`,
    `${input.type || "Huis"} met ${input.bedrooms ?? 3} slaapkamers voor maximaal ${input.maxGuests ?? 8} gasten` +
      (voorzieningen.length ? `, met ${voorzieningen.slice(0, 3).join(", ")}.` : ".") +
      " Deze beschrijving is automatisch opgesteld tijdens de onboarding en kan je nog aanpassen.",
    JSON.stringify(input.vrbo ? ["airbnb", "booking", "vrbo"] : ["airbnb", "booking"]),
    Math.round(area * 0.5), 225, 265
  );
  res.status(201).json(mapProperty((await propertyById(id))!));
});

/* =========================== Kalender =========================== */

routes.get("/calendar", async (req, res) => {
  const propertyId = String(req.query.property || "villa-zeewind");
  const month = String(req.query.month || DEMO_MONTH);
  const prop = await propertyById(propertyId);
  if (!prop || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(404).json({ error: "onbekend pand of maand" });
    return;
  }
  const [yy, mm] = month.split("-").map(Number);
  const dim = daysInMonth(yy, mm);
  const monthStart = `${month}-01`;
  const monthEnd = addDays(iso(yy, mm, dim), 1);

  const bookings = (await db.prepare(
    "SELECT * FROM bookings WHERE property_id = ? AND start_date < ? AND end_date > ? ORDER BY start_date"
  ).all(propertyId, monthEnd, monthStart) as unknown as BookingRow[]).map(mapBooking);

  const checkoutDays = new Set(
    (await db.prepare("SELECT end_date FROM bookings WHERE property_id = ?").all(propertyId) as unknown as { end_date: string }[])
      .map((r) => r.end_date)
  );
  const sugs = await suggestionsFor(propertyId);

  const days: CalendarDay[] = [];
  for (let d = 1; d <= dim; d++) {
    const dateIso = iso(yy, mm, d);
    const b = bookings.find((x) => x.startDate <= dateIso && dateIso < x.endDate);
    let price: number | null = null;
    let suggested: number | null = null;
    if (!b) {
      const np = nightPrice(prop, dateIso, sugs);
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

/** Tijdlijnweergave: alle panden met hun boekingen en bezetting voor één maand. */
routes.get("/calendar-overview", async (req, res) => {
  const month = String(req.query.month || DEMO_MONTH);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "ongeldige maand" });
    return;
  }
  const [yy, mm] = month.split("-").map(Number);
  const dim = daysInMonth(yy, mm);
  const monthStart = `${month}-01`;
  const monthEnd = addDays(iso(yy, mm, dim), 1);

  const rows = [];
  for (const p of await allProperties()) {
    const bookings = await db.prepare(
      "SELECT * FROM bookings WHERE property_id = ? AND start_date < ? AND end_date > ? ORDER BY start_date"
    ).all(p.id, monthEnd, monthStart) as unknown as BookingRow[];
    let nights = 0;
    for (const b of bookings) {
      const from = b.start_date > monthStart ? b.start_date : monthStart;
      const to = b.end_date < monthEnd ? b.end_date : monthEnd;
      nights += nightsBetween(from, to);
    }
    rows.push({
      property: mapProperty(p),
      occupancyPct: Math.round((nights / dim) * 100),
      bookings: bookings.map(mapBooking),
    });
  }

  const overview: CalendarOverview = {
    month,
    monthLabel: `${MONTH_FULL[mm - 1][0].toUpperCase()}${MONTH_FULL[mm - 1].slice(1)} ${yy}`,
    daysInMonth: dim,
    todayDay: DEMO_TODAY.startsWith(month) ? Number(DEMO_TODAY.slice(8)) : null,
    properties: rows,
  };
  res.json(overview);
});

/* =========================== Inbox =========================== */

async function conversationById(id: string): Promise<Conversation | null> {
  const c = await db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as any;
  if (!c) return null;
  const msgs = await db.prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY id").all(id) as any[];
  const prop = (await propertyById(c.property_id))!;
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

routes.get("/conversations", async (_req, res) => {
  const ids = await db.prepare("SELECT id FROM conversations ORDER BY sort").all() as unknown as { id: string }[];
  res.json(await Promise.all(ids.map((r) => conversationById(r.id))));
});

routes.post("/conversations/:id/approve", async (req, res) => {
  const c = await db.prepare("SELECT * FROM conversations WHERE id = ?").get(req.params.id) as any;
  if (!c || c.status !== "draft" || !c.draft) {
    res.status(409).json({ error: "geen voorstel om goed te keuren" });
    return;
  }
  await db.prepare("INSERT INTO messages (conversation_id, sender, body, time_label, auto) VALUES (?, 'host', ?, 'Zonet', false)")
    .run(c.id, c.draft);
  await db.prepare("UPDATE conversations SET status = 'done', snippet = ? WHERE id = ?")
    .run(c.draft.slice(0, 60) + "…", c.id);
  const trust = Math.min(Number(await getSetting("trust_target", "20")), Number(await getSetting("trust_count", "13")) + 1);
  await setSetting("trust_count", String(trust));
  res.json(await conversationById(c.id));
});

routes.post("/conversations/:id/reply", async (req, res) => {
  const body = String(req.body?.body || "").trim();
  const c = await db.prepare("SELECT * FROM conversations WHERE id = ?").get(req.params.id) as any;
  if (!c || !body) {
    res.status(400).json({ error: "geen gesprek of leeg bericht" });
    return;
  }
  await db.prepare("INSERT INTO messages (conversation_id, sender, body, time_label, auto) VALUES (?, 'host', ?, 'Zonet', false)")
    .run(c.id, body);
  await db.prepare("UPDATE conversations SET status = 'done', snippet = ? WHERE id = ?")
    .run(body.slice(0, 60) + "…", c.id);
  res.json(await conversationById(c.id));
});

/* =========================== Prijzen =========================== */

async function mapSuggestion(r: any): Promise<PriceSuggestion> {
  const prop = (await propertyById(r.property_id))!;
  return {
    id: r.id, propertyId: r.property_id, propertyName: prop.name,
    startDate: r.start_date, endDate: r.end_date,
    rangeLabel: r.range_label, dowLabel: r.dow_label,
    priceFrom: r.price_from, priceTo: r.price_to,
    reason: r.reason, status: r.status,
  };
}

routes.get("/price-suggestions", requirePlan("premium"), async (_req, res) => {
  const rows = await db.prepare("SELECT * FROM price_suggestions ORDER BY start_date").all() as any[];
  res.json(await Promise.all(rows.map(mapSuggestion)));
});

routes.post("/price-suggestions/:id/decide", requirePlan("premium"), async (req, res) => {
  const decision = req.body?.decision;
  if (decision !== "accepted" && decision !== "rejected") {
    res.status(400).json({ error: "decision moet 'accepted' of 'rejected' zijn" });
    return;
  }
  const r = await db.prepare("SELECT * FROM price_suggestions WHERE id = ?").get(req.params.id) as any;
  if (!r || r.status !== "open") {
    res.status(409).json({ error: "voorstel niet open" });
    return;
  }
  await db.prepare("UPDATE price_suggestions SET status = ? WHERE id = ?").run(decision, r.id);
  res.json(await mapSuggestion(await db.prepare("SELECT * FROM price_suggestions WHERE id = ?").get(r.id)));
});

routes.get("/price-strip", requirePlan("premium"), async (req, res) => {
  const propertyId = String(req.query.property || "villa-zeewind");
  const prop = await propertyById(propertyId);
  if (!prop) {
    res.status(404).json({ error: "onbekend pand" });
    return;
  }
  const sugs = await suggestionsFor(prop.id);
  const days: PriceStripDay[] = [];
  for (let i = 1; i <= 30; i++) {
    const dateIso = addDays(DEMO_TODAY, i);
    const np = nightPrice(prop, dateIso, sugs);
    days.push({ date: dateIso, label: shortLabel(dateIso), price: np.price, suggested: np.suggested });
  }
  res.json(days);
});

routes.get("/pricing-settings", requirePlan("premium"), async (_req, res) => {
  const open = (await db.prepare("SELECT COUNT(*) n FROM price_suggestions WHERE status = 'open'").get() as { n: number }).n;
  const decided = (await db.prepare("SELECT COUNT(*) n FROM price_suggestions WHERE status != 'open'").get() as { n: number }).n;
  res.json({ auto: await getSetting("auto_pricing", "0") === "1", decided, reviewTarget: 10, open });
});

routes.post("/pricing-settings", requirePlan("premium"), async (req, res) => {
  await setSetting("auto_pricing", req.body?.auto ? "1" : "0");
  res.json({ auto: req.body?.auto === true });
});

/* =========================== Schoonmaak =========================== */

async function mapCleaning(r: any): Promise<Cleaning> {
  const prop = (await propertyById(r.property_id))!;
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

routes.get("/cleanings", async (_req, res) => {
  const rows = await db.prepare("SELECT * FROM cleanings ORDER BY date").all() as any[];
  res.json(await Promise.all(rows.map(mapCleaning)));
});

routes.post("/cleanings/:id/confirm", async (req, res) => {
  const r = await db.prepare("SELECT * FROM cleanings WHERE id = ?").get(req.params.id) as any;
  if (!r || r.status !== "pending_owner") {
    res.status(409).json({ error: "geen bevestiging nodig" });
    return;
  }
  await db.prepare("UPDATE cleanings SET status = 'confirmed' WHERE id = ?").run(r.id);
  res.json(await mapCleaning(await db.prepare("SELECT * FROM cleanings WHERE id = ?").get(r.id)));
});

/* =========================== Opbrengsten =========================== */

export async function revenueData(): Promise<RevenueData> {
  const months = await db.prepare("SELECT * FROM revenue_months ORDER BY month").all() as unknown as
    { month: string; airbnb: number; booking: number; vrbo: number }[];

  // Lopende maand live uit de boekingen.
  const cur = { month: DEMO_MONTH, airbnb: 0, booking: 0, vrbo: 0 };
  const curBookings = await db.prepare(
    "SELECT channel, payout, property_id FROM bookings WHERE start_date::text LIKE ?"
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
  const totalDiv = totalYear || 1; // lege database → geen NaN-percentages
  const channels = ([
    ["airbnb", "Airbnb"], ["booking", "Booking.com"], ["vrbo", "VRBO"],
  ] as const).map(([ch, label]) => ({
    channel: ch, label,
    amount: chAmounts[ch],
    pct: Math.round((chAmounts[ch] / totalDiv) * 100),
  }));

  const perProperty = [];
  for (const p of await allProperties()) {
    if (p.status !== "live") {
      perProperty.push({ propertyId: p.id, name: p.name, art: p.art, amount: null as number | null, badge: "in onboarding" as string | null });
      continue;
    }
    const h1 = (await db.prepare("SELECT amount FROM property_revenue_h1 WHERE property_id = ?").get(p.id) as { amount: number } | undefined)?.amount ?? 0;
    const july = curBookings.filter((b) => b.property_id === p.id).reduce((a, b) => a + b.payout, 0);
    perProperty.push({ propertyId: p.id, name: p.name, art: p.art, amount: (h1 + july) as number | null, badge: null as string | null });
  }

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

routes.get("/revenue", requirePlan("premium"), async (_req, res) => {
  res.json(await revenueData());
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

routes.post("/onboarding/track", async (req, res) => {
  const { sessionId, step, stepTitle, durationMs, completed } = req.body ?? {};
  if (typeof sessionId !== "string" || typeof step !== "number" || typeof durationMs !== "number") {
    res.status(400).json({ error: "sessionId, step en durationMs zijn verplicht" });
    return;
  }
  await db.prepare(
    "INSERT INTO onboarding_events (session_id, step, step_title, duration_ms, completed, user_id) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    sessionId, step, String(stepTitle ?? ""),
    Math.max(0, Math.round(durationMs)), Boolean(completed),
    currentUser(req)?.id ?? null
  );
  res.status(201).json({ ok: true });
});

/** Alleen voor admins — eigenaars zien hun eigen onboarding-tijden bewust niet. */
routes.get("/onboarding/stats", requireAdmin, async (_req, res) => {
  const perStep = await db.prepare(`
    SELECT step, step_title AS "stepTitle",
           COUNT(*) AS visits,
           ROUND(AVG(duration_ms)) AS "avgMs",
           ROUND(SUM(duration_ms) / 1000.0) AS "totalSec"
    FROM onboarding_events GROUP BY step, step_title ORDER BY step
  `).all();
  const sessions = await db.prepare("SELECT COUNT(DISTINCT session_id) AS n FROM onboarding_events").get() as { n: number };
  const completed = await db.prepare("SELECT COUNT(DISTINCT session_id) AS n FROM onboarding_events WHERE completed = true").get() as { n: number };
  const recent = await db.prepare(`
    SELECT e.session_id AS "sessionId",
           COALESCE(MIN(u.name), 'Onbekend') AS "userName",
           MIN(e.created_at) AS "startedAt",
           SUM(e.duration_ms) AS "totalMs",
           COUNT(*) AS steps,
           (bool_or(e.completed))::int AS completed
    FROM onboarding_events e LEFT JOIN users u ON u.id = e.user_id
    GROUP BY e.session_id ORDER BY MIN(e.created_at) DESC LIMIT 12
  `).all();
  res.json({ sessionsStarted: sessions.n, sessionsCompleted: completed.n, perStep, recent });
});

routes.get("/admin/users", requireAdmin, async (_req, res) => {
  const users = await db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.plan, u.created_at AS "createdAt",
           (SELECT COUNT(*) FROM properties) AS _ignore,
           (SELECT COUNT(DISTINCT session_id) FROM onboarding_events e WHERE e.user_id = u.id) AS onboardings,
           (SELECT MAX(s.created_at) FROM auth_sessions s WHERE s.user_id = u.id) AS "lastLogin"
    FROM users u ORDER BY u.created_at
  `).all() as Record<string, unknown>[];
  const roles = await db.prepare("SELECT role, COUNT(*) AS n FROM users GROUP BY role").all();
  res.json({ users: users.map(({ _ignore, ...u }) => u), roles });
});

/** Formule van een gebruiker aanpassen (simuleert de aankoop van een formule). */
routes.patch("/admin/users/:id/plan", requireAdmin, async (req, res) => {
  const plan = String(req.body?.plan || "");
  if (!["basic", "premium", "super"].includes(plan)) {
    res.status(400).json({ error: "plan moet basic, premium of super zijn" });
    return;
  }
  const user = await db.prepare("SELECT id FROM users WHERE id = ?").get(req.params.id);
  if (!user) {
    res.status(404).json({ error: "onbekende gebruiker" });
    return;
  }
  await db.prepare("UPDATE users SET plan = ? WHERE id = ?").run(plan, req.params.id);
  res.json({ ok: true, plan });
});

/* =========================== Insights (admin) =========================== */

routes.get("/insights", requirePlan("super"), async (_req, res) => {
  const live = (await allProperties()).filter((p) => p.status === "live");
  const liveCount = live.length || 1;
  const liveIds = new Set(live.map((p) => p.id));
  // Alleen echte gastverblijven: eigenaarsblokkades staan op € 0 payout.
  const paid = (await db.prepare("SELECT * FROM bookings WHERE payout > 0").all() as unknown as BookingRow[])
    .filter((b) => liveIds.has(b.property_id));

  const nightsInWindow = (from: string, toEx: string, propertyId?: string) => {
    let n = 0;
    for (const b of paid) {
      if (propertyId && b.property_id !== propertyId) continue;
      if (b.start_date < toEx && b.end_date > from) {
        const f = b.start_date > from ? b.start_date : from;
        const t = b.end_date < toEx ? b.end_date : toEx;
        n += nightsBetween(f, t);
      }
    }
    return n;
  };

  // Bezetting per maand: 3 maanden terug t.e.m. 8 vooruit.
  const occupancyByMonth = [];
  for (let off = -3; off <= 8; off++) {
    const [cy, cm] = DEMO_MONTH.split("-").map(Number);
    const dt = new Date(Date.UTC(cy, cm - 1 + off, 1));
    const month = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
    const dim = daysInMonth(dt.getUTCFullYear(), dt.getUTCMonth() + 1);
    const from = `${month}-01`;
    const toEx = addDays(iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dim), 1);
    occupancyByMonth.push({
      month,
      label: MONTH_LABELS[dt.getUTCMonth()],
      pct: Math.round((nightsInWindow(from, toEx) / (dim * liveCount)) * 100),
      current: month === DEMO_MONTH,
    });
  }

  // Reactietijd: per gesprek de tijd tussen een gastbericht en het eerstvolgende antwoord.
  const deltasMin = await responseDeltasMin();
  const medianResponseMin = deltasMin.length
    ? Math.round(deltasMin[Math.floor(deltasMin.length / 2)])
    : null;
  const responseBuckets = [
    { label: "< 15 min", count: deltasMin.filter((d) => d < 15).length },
    { label: "15–60 min", count: deltasMin.filter((d) => d >= 15 && d < 60).length },
    { label: "1–4 u", count: deltasMin.filter((d) => d >= 60 && d < 240).length },
    { label: "4–24 u", count: deltasMin.filter((d) => d >= 240 && d < 1440).length },
    { label: "> 24 u", count: deltasMin.filter((d) => d >= 1440).length },
  ];

  // Verblijfsduur en boekingsvenster.
  const stays = paid.map((b) => nightsBetween(b.start_date, b.end_date)).filter((n) => n > 0);
  const bucket = (defs: [string, (v: number) => boolean][], values: number[]) =>
    defs.map(([label, test]) => ({ label, count: values.filter(test).length }));
  const stayLengthBuckets = bucket([
    ["1–2", (n) => n <= 2], ["3–4", (n) => n >= 3 && n <= 4], ["5–7", (n) => n >= 5 && n <= 7],
    ["8–14", (n) => n >= 8 && n <= 14], ["15+", (n) => n >= 15],
  ], stays);
  const leads = paid
    .filter((b) => b.booked_at)
    .map((b) => Math.round((Date.parse(b.start_date) - Date.parse(b.booked_at!)) / 86400000))
    .filter((d) => d >= 0);
  const leadTimeBuckets = bucket([
    ["< 1 week", (d) => d < 7], ["1–4 weken", (d) => d >= 7 && d < 30], ["1–3 mnd", (d) => d >= 30 && d < 90],
    ["3–6 mnd", (d) => d >= 90 && d < 180], ["6+ mnd", (d) => d >= 180],
  ], leads);

  // Bezetting per pand: komende 90 dagen.
  const in90 = addDays(DEMO_TODAY, 90);
  const occupancyByProperty = live
    .map((p) => ({
      propertyId: p.id,
      name: p.name,
      pct: Math.round((nightsInWindow(DEMO_TODAY, in90, p.id) / 90) * 100),
    }))
    .sort((a, b) => b.pct - a.pct);

  // Kanaalmix over alle betaalde boekingen.
  const channelMix = ([["airbnb", "Airbnb"], ["booking", "Booking.com"], ["vrbo", "VRBO"]] as const)
    .map(([ch, label]) => {
      const rows = paid.filter((b) => b.channel === ch);
      return { channel: ch, label, bookings: rows.length, revenue: rows.reduce((a, b) => a + b.payout, 0) };
    })
    .filter((c) => c.bookings > 0);

  const totalNights = stays.reduce((a, n) => a + n, 0);
  const totalRevenue = paid.reduce((a, b) => a + b.payout, 0);
  const insights: InsightsData = {
    kpis: {
      occupancyNext30: Math.round((nightsInWindow(DEMO_TODAY, addDays(DEMO_TODAY, 30)) / (30 * liveCount)) * 100),
      medianResponseMin,
      avgStayNights: stays.length ? Math.round((totalNights / stays.length) * 10) / 10 : null,
      avgLeadDays: leads.length ? Math.round(leads.reduce((a, d) => a + d, 0) / leads.length) : null,
      adr: totalNights ? Math.round(totalRevenue / totalNights) : null,
    },
    occupancyByMonth,
    responseBuckets,
    occupancyByProperty,
    stayLengthBuckets,
    leadTimeBuckets,
    channelMix,
  };
  res.json(insights);
});

/* =========================== Guesty-koppeling =========================== */

routes.get("/integrations/guesty", async (_req, res) => {
  res.json(await guestyStatus());
});

routes.post("/integrations/guesty/test", requireAdmin, async (_req, res) => {
  if (!guestyAvailable()) {
    res.status(409).json({ error: "Guesty niet geconfigureerd — zet GUESTY_CLIENT_ID en GUESTY_CLIENT_SECRET in backend/.env" });
    return;
  }
  try {
    res.json(await testGuesty());
  } catch (err) {
    console.warn("Guesty-verbindingstest mislukt:", err);
    res.status(502).json({ error: err instanceof Error ? err.message : "Verbinding met Guesty mislukte" });
  }
});

routes.post("/integrations/guesty/sync", requireAdmin, async (_req, res) => {
  if (!guestyAvailable()) {
    res.status(409).json({ error: "Guesty niet geconfigureerd — zet GUESTY_CLIENT_ID en GUESTY_CLIENT_SECRET in backend/.env" });
    return;
  }
  try {
    res.json(await syncGuesty());
  } catch (err) {
    console.warn("Guesty-sync mislukt:", err);
    res.status(502).json({ error: err instanceof Error ? err.message : "Synchroniseren met Guesty mislukte" });
  }
});

routes.post("/integrations/guesty/reset", requireAdmin, async (_req, res) => {
  res.json(await resetGuestyData());
});

/* =========================== Assistent & AI =========================== */

routes.get("/ai-status", async (_req, res) => {
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
  res.json({ answer: await answer(q), source: "rules" });
});

/** Herschrijf het AI-voorstel van een gesprek met het echte model (vereist een API-key). */
routes.post("/conversations/:id/regenerate", async (req, res) => {
  if (!aiAvailable()) {
    res.status(409).json({ error: "Geen AI-key geconfigureerd — zie backend/.env.example" });
    return;
  }
  const c = await db.prepare("SELECT * FROM conversations WHERE id = ?").get(req.params.id) as any;
  // 'draft' = bestaand voorstel herschrijven; 'guard' = onbeantwoord gastbericht
  // waarvoor Staybase alsnog een voorstel schrijft (wordt daarna 'draft').
  if (!c || (c.status !== "draft" && c.status !== "guard")) {
    res.status(409).json({ error: "alleen open gesprekken kunnen een voorstel krijgen" });
    return;
  }
  const prop = (await propertyById(c.property_id))!;
  const msgs = await db.prepare("SELECT sender, body FROM messages WHERE conversation_id = ? ORDER BY id").all(c.id) as any[];
  try {
    const draft = await llmDraft({
      propertyName: prop.name,
      guest: c.guest,
      channel: c.channel,
      messages: msgs,
      note: c.draft_note,
    });
    await db.prepare("UPDATE conversations SET draft = ?, status = 'draft', guard_reason = NULL WHERE id = ?").run(draft, c.id);
    res.json(await conversationById(c.id));
  } catch (err) {
    console.warn("LLM-draft mislukt:", err);
    res.status(502).json({ error: "AI-voorstel genereren mislukte — probeer opnieuw" });
  }
});
