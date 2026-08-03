import type { DatabaseSync } from "node:sqlite";

/** Demodata — hetzelfde verhaal als de fase 1-demo, rond "vandaag" 17 juli 2026. */
export function seed(db: DatabaseSync) {
  const insProp = db.prepare(`
    INSERT INTO properties (id, name, location, type, bedrooms, bathrooms, max_guests, area_m2,
      rating, status, status_label, art, art_bg, channels, cleaning_price, base_price_week, base_price_weekend)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insProp.run(
    "villa-zeewind", "Villa Zeewind", "Knokke-Heist", "Villa", 4, 3, 8, 180,
    4.93, "live", "Live · Airbnb + Booking", "🏖️", "linear-gradient(135deg,#FFE3E9,#FFD1DB)",
    JSON.stringify(["airbnb", "booking"]), 95, 245, 285
  );
  insProp.run(
    "duplex-zeedijk", "Duplex Zeedijk 401", "Knokke", "Duplex", 2, 1, 5, 120,
    4.88, "live", "Live · Airbnb + Booking", "🌊", "linear-gradient(135deg,#DCEBFF,#C9DEFC)",
    JSON.stringify(["airbnb", "booking"]), 75, 175, 195
  );
  insProp.run(
    "residentie-lichttoren", "Residentie Lichttoren 12", "Knokke", "Appartement", 2, 1, 4, 85,
    null, "onboarding", "⏳ Wacht op brandveiligheidsattest", "🏢", "linear-gradient(135deg,#FFF0D9,#FFE4BC)",
    JSON.stringify(["airbnb"]), 65, 155, 175
  );

  const insBooking = db.prepare(`
    INSERT INTO bookings (id, property_id, guest, avatar, channel, start_date, end_date, guests, payout, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  // Villa Zeewind — juli 2026
  insBooking.run("b1", "villa-zeewind", "Sophie & Bram", "🌊", "airbnb", "2026-07-03", "2026-07-08", 2, 1375, "2e verblijf — kwamen vorig jaar ook");
  insBooking.run("b2", "villa-zeewind", "Familie Müller", "⛱️", "booking", "2026-07-10", "2026-07-17", 5, 1820, "Checkte vandaag uit om 10:00");
  insBooking.run("b3", "villa-zeewind", "Familie Peeters", "🚲", "airbnb", "2026-07-17", "2026-07-24", 6, 2044, "Komt vandaag aan om 16:00");
  insBooking.run("b4", "villa-zeewind", "Claire Dubois", "🐚", "airbnb", "2026-07-26", "2026-07-31", 4, 1290, "Vroeg gisteren naar een langer verblijf");
  // Duplex Zeedijk — juli 2026
  insBooking.run("b5", "duplex-zeedijk", "Familie Janssens", "🪁", "airbnb", "2026-07-03", "2026-07-10", 4, 1295, null);
  insBooking.run("b6", "duplex-zeedijk", "Lucas & Marie", "🚤", "booking", "2026-07-11", "2026-07-18", 2, 1246, null);
  insBooking.run("b7", "duplex-zeedijk", "Anne Vandamme", "🎨", "airbnb", "2026-07-19", "2026-07-24", 3, 910, null);
  insBooking.run("b8", "duplex-zeedijk", "Tom & Els", "⚽", "airbnb", "2026-07-26", "2026-07-30", 4, 700, null);
  // Villa Zeewind — augustus (context voor de prijsvoorstellen)
  insBooking.run("b9", "villa-zeewind", "Familie Rousseau", "🦀", "airbnb", "2026-08-07", "2026-08-14", 6, 2130, null);

  const insConvo = db.prepare(`
    INSERT INTO conversations (id, property_id, guest, avatar, channel, status, snippet, time_label, draft, draft_note, guard_reason, sort)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insMsg = db.prepare(`
    INSERT INTO messages (conversation_id, sender, body, time_label, auto) VALUES (?, ?, ?, ?, ?)
  `);

  insConvo.run(
    "c1", "villa-zeewind", "Familie Peeters", "🚲", "airbnb", "draft",
    "Kunnen we iets vroeger inchecken, rond 14u?", "08:47",
    "Goeiemorgen! De schoonmaak is vandaag om 14:30 afgerond, dus jullie kunnen er vanaf 15:00 in — een uurtje vroeger dan gepland. De code van de sleutelkluis werkt vanaf dan. Goeie reis en tot straks! 🏖️",
    "Staybase keek in de schoonmaakplanning: Rosa is om 14:30 klaar.", null, 1
  );
  insMsg.run("c1", "guest", "Goeiemorgen! We vertrekken vroeg vanmorgen. Zouden we al rond 14u kunnen inchecken vandaag?", "08:47", 0);

  insConvo.run(
    "c2", "villa-zeewind", "Emma & Loïc", "🐶", "airbnb", "draft",
    "Zijn we welkom met onze hond Miló?", "09:12",
    "Hallo Emma en Loïc! Leuk dat jullie Villa Zeewind op het oog hebben 😊 Miló is zeker welkom — we vragen enkel om hem niet op de zetels en bedden te laten. De omheinde tuin is trouwens ideaal voor hem. Tot snel aan zee!",
    "Geschreven in jouw stijl — geleerd uit je eerdere antwoorden.", null, 2
  );
  insMsg.run("c2", "guest", "Hallo! We bekijken jullie villa voor eind augustus. Zijn we welkom met onze hond Miló? Hij is klein en heel braaf 🐶", "09:12", 0);

  insConvo.run(
    "c3", "villa-zeewind", "Claire Dubois", "🐚", "airbnb", "guard",
    "Is er een korting mogelijk als we langer blijven?", "Gisteren", null, null,
    "Dit gaat over een korting. Vragen over prijzen, kortingen of voorwaarden beantwoordt Staybase nooit zelf — die komen altijd eerst bij jou.", 3
  );
  insMsg.run("c3", "guest", "Bonjour! Als we eind augustus een week langer blijven, is er dan een korting mogelijk?", "Gisteren 18:20", 0);

  insConvo.run(
    "c4", "villa-zeewind", "Herr Müller", "⛱️", "booking", "done",
    "Vielen Dank für den schönen Aufenthalt!", "Gisteren", null, null, null, 4
  );
  insMsg.run("c4", "guest", "Vielen Dank für den schönen Aufenthalt! Können wir noch eine Rechnung bekommen?", "Gisteren 20:05", 0);
  insMsg.run("c4", "host", "Vielen Dank, Familie Müller! Die Rechnung finden Sie ab morgen bei Ihren Dokumenten in der Booking.com-Bestätigung. Gute Heimreise! 🚗", "Gisteren 20:09", 1);

  const insSug = db.prepare(`
    INSERT INTO price_suggestions (id, property_id, start_date, end_date, range_label, dow_label, price_from, price_to, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
  `);
  insSug.run("s1", "villa-zeewind", "2026-07-24", "2026-07-26", "24 – 26 jul", "vr – zo", 245, 209,
    "Laatste 2 vrije nachten tussen twee boekingen. Een kleine daling verdrievoudigt de kans op een last-minute boeking.");
  insSug.run("s2", "villa-zeewind", "2026-08-21", "2026-08-23", "21 – 23 aug", "vr – zo", 260, 319,
    "Zeilwedstrijd in Knokke dat weekend — de vraag piekt en 82% van vergelijkbare verblijven is al volzet.");
  insSug.run("s3", "villa-zeewind", "2026-08-31", "2026-09-04", "31 aug – 4 sep", "ma – vr", 250, 218,
    "Einde van de zomervakantie — de vraag zakt. Iets scherper prijzen houdt je bezetting op peil.");

  const insClean = db.prepare(`
    INSERT INTO cleanings (id, property_id, date, time_label, team, source, price, status, status_note, photos, ai_check)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insClean.run("cl1", "villa-zeewind", "2026-07-17", "11:00 – 14:30", "Rosa (jouw team)", "own", 95, "confirmed", "linnen inbegrepen", null, null);
  insClean.run("cl2", "villa-zeewind", "2026-07-25", "na check-out fam. Peeters", "Sparkle Coast · ★ 4,9", "marketplace", 95, "pending_owner", "via de marktplaats (Rosa was verhinderd)", null, null);
  insClean.run("cl3", "duplex-zeedijk", "2026-07-31", "na check-out", "Aangevraagd bij Marc (jouw team)", "own", 75, "awaiting_team", "Nog 2u14 — daarna marktplaats", null, null);
  insClean.run("cl4", "duplex-zeedijk", "2026-07-15", null, "Rosa", "own", 75, "done", null, 14, "geen schade");
  insClean.run("cl5", "villa-zeewind", "2026-07-10", null, "Rosa", "own", 95, "done", null, 12, "geen schade");

  const insRev = db.prepare("INSERT INTO revenue_months (month, airbnb, booking, vrbo) VALUES (?, ?, ?, ?)");
  insRev.run("2026-01", 3300, 700, 200);
  insRev.run("2026-02", 4100, 900, 300);
  insRev.run("2026-03", 5100, 1000, 300);
  insRev.run("2026-04", 7200, 1400, 500);
  insRev.run("2026-05", 8800, 1900, 500);
  insRev.run("2026-06", 13400, 2600, 800);

  const insH1 = db.prepare("INSERT INTO property_revenue_h1 (property_id, amount) VALUES (?, ?)");
  insH1.run("villa-zeewind", 33000);
  insH1.run("duplex-zeedijk", 20000);

  const insSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
  insSetting.run("trust_count", "13");
  insSetting.run("trust_target", "20");
  insSetting.run("owner_name", "Julie");
  insSetting.run("response_minutes", "4");
  insSetting.run("auto_pricing", "0");
}
