import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { db } from "./db";
import { DEMO_TODAY, type Brand } from "../../shared/types";
import { nightsBetween, type BookingRow, type PropertyRow } from "./lib";
import type { UserRow } from "./auth";

/**
 * Gastfactuur (eigenaar → gast), §9a.
 *
 * De regels komen uit het btw-advies (docs/btw-advies-bouwregels.md):
 *   • de EIGENAAR is de logiesverstrekker en dus de afzender van de factuur;
 *   • Staybase/Linnois maakt het document enkel op, voor rekening van de
 *     eigenaar — en zegt dat ook expliciet in de voettekst;
 *   • basis is de totale gastbetaling (logies + kosten + taksen), 12% btw
 *     inbegrepen zolang het btw-statuut per eigenaar nog niet is vastgelegd
 *     (de onboarding-popup uit §9a); het tarief staat daarom op de factuurrij
 *     zodat btw-vrij later per eigenaar kan;
 *   • white-label in de huisstijl van het platform: geen pandfoto's, geen
 *     betaalgegevens (expliciet níét de Guesty-stijl). De huisstijl volgt de
 *     herkomst van de eigenaar: Linnois-eigenaars krijgen het diepblauw en
 *     het Linnois-woordmerk, Staybase-eigenaars het koraal en het huisje.
 *
 * Eén factuur per boeking: nummer en datum liggen vast bij de eerste
 * download, elke volgende download geeft exact hetzelfde document.
 */

export interface InvoiceRow {
  id: string;
  booking_id: string;
  property_id: string;
  owner_id: string | null;
  number: number;
  year: number;
  amount: number;
  vat_rate: number;
  issued_at: string;
}

/** "F-2026-007" — doorlopend per eigenaar per jaar (de eigenaar is de uitreiker). */
export function invoiceLabel(inv: InvoiceRow): string {
  return `F-${inv.year}-${String(inv.number).padStart(3, "0")}`;
}

/** Vanaf de uitcheckdag mag er gefactureerd worden (§9a: "op de dag van check-out"). */
export function invoiceAvailable(booking: BookingRow): boolean {
  return booking.end_date <= DEMO_TODAY;
}

export async function invoiceForBooking(bookingId: string): Promise<InvoiceRow | undefined> {
  return (await db.prepare("SELECT * FROM invoices WHERE booking_id = ?").get(bookingId)) as InvoiceRow | undefined;
}

/** Bestaande factuur ophalen of — eenmalig — aanmaken met vast nummer en datum. */
export async function ensureInvoice(booking: BookingRow, property: PropertyRow): Promise<InvoiceRow> {
  const existing = await invoiceForBooking(booking.id);
  if (existing) return existing;

  const year = Number(DEMO_TODAY.slice(0, 4));
  const ownerId = property.owner_id ?? null;
  // Nummering per uitreiker (de eigenaar); panden zonder eigenaar delen één reeks.
  const last = (await db.prepare(
    "SELECT COALESCE(MAX(number), 0) AS n FROM invoices WHERE year = ? AND owner_id IS NOT DISTINCT FROM ?"
  ).get(year, ownerId)) as { n: number };

  const amount = booking.guest_total ?? booking.payout;
  const id = "inv-" + booking.id;
  await db.prepare(
    "INSERT INTO invoices (id, booking_id, property_id, owner_id, number, year, amount, vat_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, booking.id, property.id, ownerId, last.n + 1, year, amount, 12);
  return (await invoiceForBooking(booking.id))!;
}

/* =========================== Huisstijl =========================== */

// Dezelfde tokens als frontend/src/styles.css — de factuur hoort bij het platform.
const INK = "#232323";
const MUTED = "#71706C";
const FAINT = "#9C9A94";
const LINE = "#ECEAE6";
const SOFT = "#F5F4F1";

interface Palette {
  name: string;
  accent: string;  // --coral
  deep: string;    // --coral-deep
  soft: string;    // --coral-soft
}

const PALETTES: Record<Brand, Palette> = {
  staybase: { name: "Staybase", accent: "#FF385C", deep: "#E31C5F", soft: "#FFF0F3" },
  linnois: { name: "Linnois", accent: "#100551", deep: "#0B0338", soft: "#EEEDF6" },
};

/** Het Linnois-woordmerk (transparante PNG) — zelfde bestand als de zijbalk. */
const LINNOIS_LOGO = join(__dirname, "../../frontend/public/linnois-logo.png");

/** Staybase-logo: het huisje uit Icon.tsx, nagetekend met dezelfde SVG-paden. */
function drawStaybaseLogo(doc: PDFKit.PDFDocument, x: number, y: number, size: number, pal: Palette): void {
  const s = size / 32; // het origineel leeft in een 32×32-viewBox
  doc.save().translate(x, y).scale(s);
  doc.roundedRect(0, 0, 32, 32, 10).fillColor(pal.accent).fill();
  doc.lineWidth(2.4).lineCap("round").lineJoin("round").strokeColor("#ffffff");
  doc.path("M9 17.2 L16 10 L23 17.2").stroke();
  doc.path("M11.5 16 L11.5 22.5 L20.5 22.5 L20.5 16").stroke();
  doc.restore();
}

const MONTHS_NL = ["januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december"];
const dateNL = (iso: string) =>
  `${Number(iso.slice(8, 10))} ${MONTHS_NL[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const eur = (n: number) =>
  "€ " + n.toLocaleString("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Rendert de factuur als PDF en geeft de bytes terug. De factuurtaal is
 * bewust Nederlands: het is een wettelijk document van een Belgische
 * eigenaar; meertalige templates komen later, samen met de gastgegevens
 * (adres/btw-nummer van de gast) uit de §9a-onboarding.
 */
export interface InvoicePageInput {
  invoice: InvoiceRow;
  booking: BookingRow;
  property: PropertyRow;
  owner: Pick<UserRow, "name" | "email"> | null;
  brand: Brand; // huisstijl van de omgeving van de eigenaar
}

export function renderInvoicePdf(input: InvoicePageInput): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margins: { top: 64, left: 64, right: 64, bottom: 64 } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  drawInvoicePage(doc, input);
  doc.end();
  return done;
}

/**
 * Bundel: alle facturen in één document, elk op een eigen pagina en elk in
 * de huisstijl van zijn eigen eigenaar. Volgorde bepaalt de aanroeper
 * (per pand, dan op nummer).
 */
export function renderInvoiceBundlePdf(inputs: InvoicePageInput[]): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margins: { top: 64, left: 64, right: 64, bottom: 64 }, autoFirstPage: false });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  for (const input of inputs) {
    doc.addPage();
    drawInvoicePage(doc, input);
  }
  doc.end();
  return done;
}

function drawInvoicePage(doc: PDFKit.PDFDocument, input: InvoicePageInput): void {
  const { invoice, booking, property, owner, brand } = input;
  const pal = PALETTES[brand];
  const nights = nightsBetween(booking.start_date, booking.end_date);
  const vatRate = Number(invoice.vat_rate);
  const incl = Number(invoice.amount);
  const excl = incl / (1 + vatRate / 100);
  const vat = incl - excl;

  const W = doc.page.width - 128; // tekstbreedte binnen de marges
  const L = 64;

  // --- merkband bovenaan, zoals het accent op de website ---
  doc.rect(0, 0, doc.page.width, 6).fillColor(pal.accent).fill();

  // --- logo rechtsboven ---
  if (brand === "linnois" && existsSync(LINNOIS_LOGO)) {
    // Woordmerk-verhouding 600×184 → hoogte 26 ≈ breedte 85.
    doc.image(LINNOIS_LOGO, L + W - 85, 62, { height: 26 });
  } else {
    drawStaybaseLogo(doc, L + W - 118, 60, 26, pal);
    doc.font("Helvetica-Bold").fontSize(17).fillColor(pal.accent)
      .text("staybase", L + W - 86, 65, { width: 90 });
  }

  // --- kop ---
  doc.font("Helvetica-Bold").fontSize(24).fillColor(INK).text("Factuur", L, 60);
  // Factuurnummer als chip in de merk-tint, zoals de badges op de website.
  const chipLabel = invoiceLabel(invoice);
  doc.font("Helvetica-Bold").fontSize(9);
  const chipW = doc.widthOfString(chipLabel) + 20;
  doc.roundedRect(L, 96, chipW, 20, 10).fillColor(pal.soft).fill();
  doc.fillColor(pal.deep).text(chipLabel, L + 10, 102);
  doc.font("Helvetica").fontSize(10).fillColor(MUTED)
    .text(`Factuurdatum ${dateNL(invoice.issued_at.slice(0, 10))}`, L + chipW + 12, 102);

  // --- afzender (de eigenaar = logiesverstrekker) en gast ---
  const blockY = 156;
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(pal.deep).text("LOGIESVERSTREKKER", L, blockY, { characterSpacing: 0.6 });
  doc.font("Helvetica-Bold").fontSize(11).fillColor(INK).text(owner?.name ?? "Eigenaar", L, blockY + 15);
  doc.font("Helvetica").fontSize(9.5).fillColor(MUTED);
  if (owner?.email) doc.text(owner.email, L, blockY + 30);
  doc.fontSize(8.5).fillColor(FAINT)
    .text("Vennootschaps- en btw-gegevens volgen uit de onboarding.", L, blockY + (owner?.email ? 45 : 30), { width: W / 2 - 10 });

  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(pal.deep).text("GAST", L + W / 2, blockY, { characterSpacing: 0.6 });
  doc.font("Helvetica-Bold").fontSize(11).fillColor(INK).text(booking.guest, L + W / 2, blockY + 15);
  doc.font("Helvetica").fontSize(9.5).fillColor(MUTED)
    .text(`${booking.guests} ${booking.guests === 1 ? "gast" : "gasten"}`, L + W / 2, blockY + 30);

  // --- factuurlijn ---
  const tableY = 250;
  doc.moveTo(L, tableY).lineTo(L + W, tableY).lineWidth(1.5).strokeColor(pal.accent).stroke();
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(FAINT)
    .text("OMSCHRIJVING", L, tableY + 12, { characterSpacing: 0.6 })
    .text("BEDRAG (INCL. BTW)", L, tableY + 12, { width: W, align: "right", characterSpacing: 0.6 });

  let y = tableY + 34;
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(INK)
    .text(`Verblijf ${property.name}`, L, y, { width: W - 120 });
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(INK)
    .text(eur(incl), L, y, { width: W, align: "right" });
  y = Math.max(doc.y, y + 16);
  doc.font("Helvetica").fontSize(9.5).fillColor(MUTED)
    .text(
      `${property.location} · ${dateNL(booking.start_date)} tot ${dateNL(booking.end_date)} · ` +
      `${nights} ${nights === 1 ? "nacht" : "nachten"}`,
      L, y, { width: W - 120 }
    );
  y = doc.y + 6;
  doc.fontSize(9).fillColor(FAINT)
    .text("Terbeschikkingstelling van gemeubeld logies, inclusief bijhorende kosten en taksen.", L, y, { width: W - 120 });
  y = doc.y + 16;
  doc.moveTo(L, y).lineTo(L + W, y).lineWidth(0.5).strokeColor(LINE).stroke();

  // --- btw-samenvatting; het totaal in een kaart in de merk-tint ---
  const sumW = 250;
  const sumX = L + W - sumW;
  y += 14;
  const row = (label: string, value: string) => {
    doc.font("Helvetica").fontSize(9.5).fillColor(MUTED)
      .text(label, sumX + 14, y, { width: sumW - 28 })
      .text(value, sumX + 14, y, { width: sumW - 28, align: "right" });
    y += 17;
  };
  row(`Maatstaf (excl. ${vatRate}% btw)`, eur(excl));
  row(`Btw ${vatRate}%`, eur(vat));
  y += 4;
  doc.roundedRect(sumX, y, sumW, 34, 10).fillColor(pal.soft).fill();
  doc.font("Helvetica-Bold").fontSize(12).fillColor(pal.deep)
    .text("Totaal", sumX + 14, y + 10, { width: sumW - 28 })
    .text(eur(incl), sumX + 14, y + 10, { width: sumW - 28, align: "right" });
  y += 34;

  // --- betaalstatus: via het kanaal, dus geen betaalinstructies op de factuur ---
  y += 22;
  doc.roundedRect(L, y, W, 40, 10).fillColor(SOFT).fill();
  doc.font("Helvetica").fontSize(9.5).fillColor(MUTED)
    .text(
      "Deze factuur werd voldaan via het boekingskanaal. Er is geen verdere betaling vereist.",
      L + 14, y + 14, { width: W - 28 }
    );

  // --- voettekst per btw-advies: opgemaakt voor rekening van de eigenaar ---
  const footY = doc.page.height - 100;
  doc.moveTo(L, footY).lineTo(L + W, footY).lineWidth(0.5).strokeColor(LINE).stroke();
  doc.font("Helvetica").fontSize(8.5).fillColor(FAINT)
    .text(
      `Opgemaakt via ${pal.name}, als beheerder van het vakantieverblijf, in naam en voor rekening van de ` +
      `logiesverstrekker. Btw-tarief onder voorbehoud van het btw-statuut van de logiesverstrekker en de ` +
      `toepasselijke overgangsregeling.`,
      L, footY + 12, { width: W }
    );
}
