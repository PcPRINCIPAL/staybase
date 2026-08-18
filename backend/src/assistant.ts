import { db } from "./db";
import { DEMO_TODAY } from "../../shared/types";
import { MONTH_FULL, allProperties, nightsBetween, propertyById, type BookingRow } from "./lib";
import { revenueData } from "./routes";

const eur = (n: number) => "€ " + n.toLocaleString("nl-BE");

/**
 * Regelgebaseerde assistent die echte antwoorden uit de database haalt.
 * In een latere fase vervangt de AI-gateway (ORQ.AI) deze logica; de
 * data-toegang hieronder blijft dan de "tools" van het model.
 */
export async function answer(question: string): Promise<string> {
  const q = question.toLowerCase();

  if (q.includes("juni") || q.includes("verdiende")) {
    const jun = await db.prepare("SELECT * FROM revenue_months WHERE month = '2026-06'").get() as
      | { airbnb: number; booking: number; vrbo: number }
      | undefined;
    const mei = await db.prepare("SELECT * FROM revenue_months WHERE month = '2026-05'").get() as
      | { airbnb: number; booking: number; vrbo: number }
      | undefined;
    if (jun) {
      const tot = jun.airbnb + jun.booking + jun.vrbo;
      const totMei = mei ? mei.airbnb + mei.booking + mei.vrbo : 0;
      const pct = totMei ? Math.round(((tot - totMei) / totMei) * 100) : 0;
      const airbnbPct = Math.round((jun.airbnb / tot) * 100);
      return `In juni verdiende je <b>${eur(tot)}</b> over 2 panden — ${pct}% meer dan in mei. Airbnb was goed voor ${airbnbPct}%. Wil je het rapport als PDF?`;
    }
  }

  if (q.includes("gast") || q.includes("check")) {
    const next = await db.prepare(
      "SELECT * FROM bookings WHERE start_date >= ? ORDER BY start_date LIMIT 1"
    ).get(DEMO_TODAY) as unknown as BookingRow | undefined;
    if (next) {
      const p = (await propertyById(next.property_id))!;
      const when = next.start_date === DEMO_TODAY
        ? "Vandaag om <b>16:00</b>"
        : `Op <b>${Number(next.start_date.slice(8))} ${MONTH_FULL[Number(next.start_date.slice(5, 7)) - 1]}</b>`;
      return `${when} checkt ${next.guest} in bij ${p.name} — ${next.guests} gasten, ${nightsBetween(next.start_date, next.end_date)} nachten via ${next.channel === "airbnb" ? "Airbnb" : "Booking.com"}. De sleutelcode wordt automatisch verstuurd. ✅`;
    }
  }

  if (q.includes("best") || q.includes("presteert") || q.includes("topper")) {
    const per = (await revenueData()).perProperty.filter((p) => p.amount !== null);
    per.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
    const top = per[0];
    const prop = (await allProperties()).find((p) => p.id === top.propertyId)!;
    const openSug = (await db.prepare("SELECT COUNT(*) n FROM price_suggestions WHERE status = 'open' AND property_id = ?").get(top.propertyId) as { n: number }).n;
    const tip = openSug ? ` Tip: er ${openSug === 1 ? "staat nog 1 prijsvoorstel" : `staan nog ${openSug} prijsvoorstellen`} open — snel goedgekeurd, snel verdiend.` : "";
    return `<b>${top.name}</b> is je topper: ${eur(top.amount!)} dit jaar en een score van ★ ${prop.rating?.toFixed(2).replace(".", ",")}.${tip}`;
  }

  if (q.includes("bezetting")) {
    return "De bezetting van juli staat op je dashboard onder “Deze maand” — berekend uit de echte boekingen van al je live panden.";
  }

  if (q.includes("rapport")) {
    return "Klaar ✓ Het kwartaalrapport staat bij <b>Opbrengsten → Facturen & documenten</b>. Zal ik het ook doormailen naar je boekhouder?";
  }

  return "Daar heb ik nog geen antwoord op — vraag me iets over je opbrengsten, je volgende gast of welk pand het best presteert. In een volgende fase begrijp ik élke vraag over je verhuur. 😊";
}
