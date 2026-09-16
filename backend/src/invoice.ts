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
 *   • volledig white-label (klantfeedback 15/09): geen logo en nergens de
 *     naam Staybase of Linnois — de brandingkleuren blijven wel de omgeving
 *     van de eigenaar volgen. Geen pandfoto's, geen betaalgegevens.
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

  // Btw-tarief volgt het statuut van de eigenaar op het moment van uitreiken:
  // btw-plichtige vennootschap → 12% (gemeubeld logies); particulier of
  // vennootschap zonder btw-plicht → btw-vrij; onbekend → 12% als voorlopige
  // standaard. Al uitgereikte facturen behouden hun tarief.
  const status = ownerId
    ? ((await db.prepare("SELECT vat_status FROM users WHERE id = ?").get(ownerId)) as { vat_status: string } | undefined)?.vat_status
    : undefined;
  const vatRate = status === "particulier" || status === "vennootschap_geen_btw" ? 0 : 12;

  const amount = booking.guest_total ?? booking.payout;
  const id = "inv-" + booking.id;
  await db.prepare(
    "INSERT INTO invoices (id, booking_id, property_id, owner_id, number, year, amount, vat_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, booking.id, property.id, ownerId, last.n + 1, year, amount, vatRate);
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
export interface InvoiceOwner {
  name: string;
  email: string;
  company_name?: string | null;
  billing_address?: string | null;
  vat_number?: string | null;
}

export interface InvoicePageInput {
  invoice: InvoiceRow;
  booking: BookingRow;
  property: PropertyRow;
  owner: InvoiceOwner | null;
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

  // Bewust géén logo of merknaam op de gastfactuur (klantfeedback 15/09):
  // volledig white-label — de brandingkleuren mogen wel blijven.

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
  doc.font("Helvetica-Bold").fontSize(11).fillColor(INK)
    .text(owner?.company_name || owner?.name || "Eigenaar", L, blockY + 15);
  let issuerY = blockY + 30;
  doc.font("Helvetica").fontSize(9.5).fillColor(MUTED);
  if (owner?.company_name && owner.name) { doc.text(owner.name, L, issuerY); issuerY += 14; }
  if (owner?.billing_address) { doc.text(owner.billing_address, L, issuerY, { width: W / 2 - 10 }); issuerY = doc.y + 2; }
  if (owner?.vat_number) { doc.text(`BTW ${owner.vat_number}`, L, issuerY); issuerY += 14; }
  if (owner?.email) { doc.text(owner.email, L, issuerY); issuerY += 14; }
  if (!owner?.billing_address && !owner?.vat_number) {
    doc.fontSize(8.5).fillColor(FAINT)
      .text("Vennootschaps- en btw-gegevens volgen uit de onboarding.", L, issuerY, { width: W / 2 - 10 });
  }

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
  if (vatRate > 0) {
    row(`Maatstaf (excl. ${vatRate}% btw)`, eur(excl));
    row(`Btw ${vatRate}%`, eur(vat));
  }
  y += 4;
  doc.roundedRect(sumX, y, sumW, 34, 10).fillColor(pal.soft).fill();
  doc.font("Helvetica-Bold").fontSize(12).fillColor(pal.deep)
    .text("Totaal", sumX + 14, y + 10, { width: sumW - 28 })
    .text(eur(incl), sumX + 14, y + 10, { width: sumW - 28, align: "right" });
  y += 34;
  if (vatRate === 0) {
    // Btw-vrije factuur: verplichte vermelding in plaats van maatstaf/btw-lijnen.
    doc.font("Helvetica").fontSize(8.5).fillColor(FAINT)
      .text("Btw niet van toepassing op basis van het btw-statuut van de logiesverstrekker.", L, y + 2, { width: W, align: "right" });
    y += 16;
  }

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
      "Opgemaakt door de beheerder van het vakantieverblijf, in naam en voor rekening van de " +
      "logiesverstrekker. Btw-tarief onder voorbehoud van het btw-statuut van de logiesverstrekker en de " +
      "toepasselijke overgangsregeling.",
      L, footY + 12, { width: W }
    );
}


/* =========================== §9b: eigenaarsafrekening =========================== */

/**
 * De reguliere flow uit de klant-templates ("Facturatie Flow Linnois",
 * gevalideerd op het Marijke-voorbeeld):
 *
 *   gastbetaling verblijf = totale gastbetaling − schoonmaak (aan gast)
 *   Net Rental Income     = totale gastbetaling − OTA-commissie − schoonmaak
 *                           (− schade − linnen; nog niet bijgehouden)
 *   commissie             = pct × totale gastbetaling   (basis "bruto")
 *                           pct × Net Rental Income     (basis "netto")
 *   factuur               = commissie (excl.) + 21% btw
 *   netto uitbetaling     = Net Rental Income − factuur incl. btw
 *
 * Het owner statement is uitdrukkelijk GEEN factuur (btw-advies punt 7);
 * de beheerfactuur betreft enkel de beheer-, coördinatie- en
 * bemiddelingsdienst. Uitzonderingen (conciërgeservice, de 0,88-clausule)
 * volgen zodra ze in het datamodel zitten.
 */

export interface OwnerInvoiceRow {
  id: string;
  booking_id: string;
  property_id: string;
  owner_id: string | null;
  number: number;
  year: number;
  commission_pct: number;
  commission_basis: "bruto" | "netto";
  base_amount: number;
  amount_excl: number;
  vat_rate: number;
  issued_at: string;
}

/** "F2026-KNK.ZEED.843-105-778" — jaartal, pandcode en doorlopend nummer, zoals de klant-template. */
export function ownerInvoiceLabel(inv: OwnerInvoiceRow, property: PropertyRow): string {
  const code = property.code_name ? `-${property.code_name}` : "";
  return `F${inv.year}${code}-${String(inv.number).padStart(3, "0")}`;
}

/** De §9b-rekenlijnen voor één boeking. */
export function statementFigures(booking: BookingRow) {
  const guestTotal = Number(booking.guest_total ?? booking.payout);
  const cleaning = Number(booking.guest_cleaning ?? 0);
  const otaFee = Number(booking.ota_fee ?? 0);
  return {
    guestTotal,
    cleaning,
    otaFee,
    stay: guestTotal - cleaning,
    netRentalIncome: guestTotal - otaFee - cleaning,
  };
}

/** Bestaande beheerfactuur ophalen of aanmaken met een momentopname van de commissieafspraak. */
export async function ensureOwnerInvoice(booking: BookingRow, property: PropertyRow): Promise<OwnerInvoiceRow> {
  const existing = (await db.prepare("SELECT * FROM owner_invoices WHERE booking_id = ?").get(booking.id)) as OwnerInvoiceRow | undefined;
  if (existing) return existing;

  const year = Number(DEMO_TODAY.slice(0, 4));
  const ownerId = property.owner_id ?? null;
  const deal = ownerId
    ? (await db.prepare("SELECT commission_pct, commission_basis FROM users WHERE id = ?").get(ownerId)) as
        { commission_pct: number; commission_basis: "bruto" | "netto" } | undefined
    : undefined;
  const pct = Number(deal?.commission_pct ?? 15);
  const basis = deal?.commission_basis ?? "bruto";

  const fig = statementFigures(booking);
  const base = basis === "netto" ? fig.netRentalIncome : fig.guestTotal;
  const amountExcl = Math.round(base * pct) / 100; // pct is in procenten

  // Doorlopend nummer per jaar, over alle eigenaars heen (zoals F2026-…-778).
  const last = (await db.prepare(
    "SELECT COALESCE(MAX(number), 0) AS n FROM owner_invoices WHERE year = ?"
  ).get(year)) as { n: number };

  const id = "oinv-" + booking.id;
  await db.prepare(
    `INSERT INTO owner_invoices (id, booking_id, property_id, owner_id, number, year,
       commission_pct, commission_basis, base_amount, amount_excl, vat_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 21)`
  ).run(id, booking.id, property.id, ownerId, last.n + 1, year, pct, basis, base, amountExcl);
  return (await db.prepare("SELECT * FROM owner_invoices WHERE booking_id = ?").get(booking.id)) as OwnerInvoiceRow;
}

/** Beheerdergegevens per omgeving — voorlopig vast; later instelbaar in Beheer. */
const MANAGER: Record<Brand, { name: string; line: string }> = {
  linnois: {
    name: "Linnois",
    line: "Linnois BV  ·  Stationsstraat 2, 9961 Boekhoute  ·  BTW BE1026 886 441  ·  IBAN BE07 7380 4892 1566",
  },
  staybase: {
    name: "Staybase",
    line: "Staybase BV  ·  vennootschapsgegevens volgen",
  },
};

function drawManagerHeader(doc: PDFKit.PDFDocument, title: string, brand: Brand, L: number, W: number): void {
  const pal = PALETTES[brand];
  doc.rect(0, 0, doc.page.width, 6).fillColor(pal.accent).fill();
  if (brand === "linnois" && existsSync(LINNOIS_LOGO)) {
    doc.image(LINNOIS_LOGO, L + W - 85, 62, { height: 26 });
  } else {
    drawStaybaseLogo(doc, L + W - 118, 60, 26, pal);
    doc.font("Helvetica-Bold").fontSize(17).fillColor(pal.accent)
      .text("staybase", L + W - 86, 65, { width: 90 });
  }
  doc.font("Helvetica-Bold").fontSize(24).fillColor(INK).text(title, L, 60);
}

export interface OwnerDocInput {
  ownerInvoice: OwnerInvoiceRow;
  booking: BookingRow;
  property: PropertyRow;
  owner: InvoiceOwner | null;
  brand: Brand;
}

/** Owner statement: administratief overzicht per boeking — uitdrukkelijk geen factuur. */
export function renderOwnerStatementPdf(input: OwnerDocInput): Promise<Buffer> {
  const { ownerInvoice, booking, property, owner, brand } = input;
  const pal = PALETTES[brand];
  const fig = statementFigures(booking);
  const invoiceIncl = Number(ownerInvoice.amount_excl) * (1 + Number(ownerInvoice.vat_rate) / 100);
  const netPayout = fig.netRentalIncome - invoiceIncl;

  const doc = new PDFDocument({ size: "A4", margins: { top: 64, left: 64, right: 64, bottom: 64 } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  const W = doc.page.width - 128;
  const L = 64;

  drawManagerHeader(doc, "Owner statement", brand, L, W);
  // De rode wenk uit de klant-template: dit is géén factuur.
  doc.font("Helvetica-BoldOblique").fontSize(9.5).fillColor("#B3261E")
    .text(
      "Dit is GEEN factuur — louter een administratief overzicht van bedragen ontvangen, verrekend en " +
      "doorgestort voor rekening van de eigenaar.",
      L, 96, { width: W }
    );

  // --- kerngegevens ---
  const metaY = 136;
  const meta = (label: string, value: string, row: number) => {
    doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(label, L, metaY + row * 16);
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text(value, L + 130, metaY + row * 16, { width: W - 130 });
  };
  meta("Eigenaar", owner?.name ?? "Eigenaar", 0);
  meta("Pand", `${property.name}${property.code_name ? ` · ${property.code_name}` : ""}`, 1);
  meta("Periode", `${MONTHS_NL[Number(booking.end_date.slice(5, 7)) - 1]} ${booking.end_date.slice(0, 4)}`, 2);
  meta("Gast", booking.guest, 3);
  meta("Verblijfsperiode", `${dateNL(booking.start_date)} – ${dateNL(booking.end_date)}`, 4);

  // --- rekenlijnen ---
  let y = metaY + 5 * 16 + 22;
  doc.moveTo(L, y).lineTo(L + W, y).lineWidth(1.5).strokeColor(pal.accent).stroke();
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(FAINT)
    .text("OMSCHRIJVING", L, y + 10, { characterSpacing: 0.6 })
    .text("BEDRAG", L, y + 10, { width: W, align: "right", characterSpacing: 0.6 });
  y += 30;

  const line = (label: string, value: number | null, opts: { bold?: boolean; sub?: boolean; negative?: boolean } = {}) => {
    const display = value == null ? "—" : (opts.negative ? `(${eur(Math.abs(value))})` : eur(value));
    doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(opts.bold ? 10.5 : 9.5)
      .fillColor(opts.bold ? INK : opts.sub ? FAINT : MUTED)
      .text(label, L + (opts.sub ? 12 : 0), y, { width: W - 140 })
      .text(display, L, y, { width: W, align: "right" });
    y += opts.bold ? 22 : 18;
  };

  line("Totale gastbetaling", fig.guestTotal, { bold: true });
  line("Gastbetaling — verblijf", fig.stay, { sub: true });
  line("Gastbetaling — schoonmaak", fig.cleaning, { sub: true });
  line("OTA-commissie", fig.otaFee, { negative: true });
  line("Schoonmaakkosten", fig.cleaning, { negative: true });
  line("Eventuele extra kosten (schade, linnen)", null);
  y += 4;
  doc.roundedRect(L, y, W, 32, 10).fillColor(pal.soft).fill();
  doc.font("Helvetica-Bold").fontSize(11.5).fillColor(pal.deep)
    .text("Netto beheersopbrengst (Net Rental Income)", L + 14, y + 9, { width: W - 200 })
    .text(eur(fig.netRentalIncome), L + 14, y + 9, { width: W - 28, align: "right" });
  y += 52;

  // --- ter info: vergoeding en netto-uitbetaling ---
  doc.font("Helvetica-Oblique").fontSize(9).fillColor(FAINT)
    .text("Ter info: vergoeding van de beheerder (zie afzonderlijke factuur) en netto-uitbetaling aan de eigenaar.", L, y, { width: W });
  y = doc.y + 10;
  line(`Factuur ${MANAGER[brand].name} ${ownerInvoiceLabel(ownerInvoice, property)} (incl. btw)`, invoiceIncl, { negative: true });
  y += 2;
  doc.moveTo(L, y).lineTo(L + W, y).lineWidth(1).strokeColor(INK).stroke();
  y += 8;
  line("Netto uitbetaling aan eigenaar", netPayout, { bold: true });

  // --- voettekst ---
  const footY = doc.page.height - 100;
  doc.moveTo(L, footY).lineTo(L + W, footY).lineWidth(0.5).strokeColor(LINE).stroke();
  doc.font("Helvetica").fontSize(8.5).fillColor(FAINT)
    .text(
      `Opgemaakt door ${MANAGER[brand].name}, als beheerder van het vakantieverblijf, voor rekening van de eigenaar. ` +
      `Bedragen excl. btw, tenzij anders vermeld.`,
      L, footY + 12, { width: W }
    );

  doc.end();
  return done;
}

/** Beheerfactuur (beheerder → eigenaar): enkel de eigen dienst, 21% btw. */
export function renderManagementInvoicePdf(input: OwnerDocInput): Promise<Buffer> {
  const { ownerInvoice, booking, property, owner, brand } = input;
  const pal = PALETTES[brand];
  const excl = Number(ownerInvoice.amount_excl);
  const vat = excl * Number(ownerInvoice.vat_rate) / 100;
  const incl = excl + vat;
  const issued = ownerInvoice.issued_at.slice(0, 10);
  const due = new Date(new Date(issued + "T00:00:00Z").getTime() + 30 * 86400000).toISOString().slice(0, 10);

  const doc = new PDFDocument({ size: "A4", margins: { top: 64, left: 64, right: 64, bottom: 64 } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  const W = doc.page.width - 128;
  const L = 64;

  drawManagerHeader(doc, "Factuur", brand, L, W);
  doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text(MANAGER[brand].line, L, 96, { width: W });

  // --- nummerchip + data ---
  const label = ownerInvoiceLabel(ownerInvoice, property);
  doc.font("Helvetica-Bold").fontSize(9);
  const chipW = doc.widthOfString(label) + 20;
  doc.roundedRect(L, 118, chipW, 20, 10).fillColor(pal.soft).fill();
  doc.fillColor(pal.deep).text(label, L + 10, 124);
  doc.font("Helvetica").fontSize(10).fillColor(MUTED)
    .text(`Factuurdatum ${dateNL(issued)}   ·   Vervaldatum (30 dagen) ${dateNL(due)}`, L + chipW + 12, 124);

  // --- klant (de eigenaar) ---
  const blockY = 170;
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(pal.deep).text("KLANT (EIGENAAR)", L, blockY, { characterSpacing: 0.6 });
  doc.font("Helvetica-Bold").fontSize(11).fillColor(INK)
    .text(owner?.company_name || owner?.name || "Eigenaar", L, blockY + 15);
  let clientY = blockY + 30;
  doc.font("Helvetica").fontSize(9.5).fillColor(MUTED);
  if (owner?.company_name && owner.name) { doc.text(owner.name, L, clientY); clientY += 14; }
  if (owner?.billing_address) { doc.text(owner.billing_address, L, clientY, { width: W / 2 - 10 }); clientY = doc.y + 2; }
  if (owner?.vat_number) { doc.text(`BTW ${owner.vat_number}`, L, clientY); clientY += 14; }
  if (owner?.email) { doc.text(owner.email, L, clientY); clientY += 14; }
  if (!owner?.billing_address && !owner?.vat_number) {
    doc.fontSize(8.5).fillColor(FAINT)
      .text("Adres en btw-nummer volgen uit de onboarding.", L, clientY, { width: W / 2 - 10 });
  }

  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(pal.deep).text("PAND", L + W / 2, blockY, { characterSpacing: 0.6 });
  doc.font("Helvetica-Bold").fontSize(11).fillColor(INK)
    .text(property.code_name ?? property.name, L + W / 2, blockY + 15);
  doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(property.name, L + W / 2, blockY + 30);

  // --- factuurlijn: enkel de eigen dienst (btw-advies punt 3/7) ---
  const tableY = 260;
  doc.moveTo(L, tableY).lineTo(L + W, tableY).lineWidth(1.5).strokeColor(pal.accent).stroke();
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(FAINT)
    .text("OMSCHRIJVING", L, tableY + 12, { characterSpacing: 0.6 })
    .text("BEDRAG (EXCL. BTW)", L, tableY + 12, { width: W, align: "right", characterSpacing: 0.6 });

  let y = tableY + 34;
  const basisLabel = ownerInvoice.commission_basis === "netto" ? "netto-beheersopbrengst" : "totale gastbetaling";
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(INK)
    .text("Beheer, coördinatie en bemiddeling", L, y, { width: W - 140 })
    .text(eur(excl), L, y, { width: W, align: "right" });
  y = Math.max(doc.y, y + 16);
  doc.font("Helvetica").fontSize(9.5).fillColor(MUTED)
    .text(
      `Verblijf ${booking.guest} · ${dateNL(booking.start_date)} – ${dateNL(booking.end_date)} · ` +
      `${String(ownerInvoice.commission_pct).replace(".", ",")}% op de ${basisLabel} (${eur(Number(ownerInvoice.base_amount))})`,
      L, y, { width: W - 140 }
    );
  y = doc.y + 16;
  doc.moveTo(L, y).lineTo(L + W, y).lineWidth(0.5).strokeColor(LINE).stroke();

  // --- totalen ---
  const sumW = 250;
  const sumX = L + W - sumW;
  y += 14;
  doc.font("Helvetica").fontSize(9.5).fillColor(MUTED)
    .text("Subtotaal (excl. btw)", sumX + 14, y, { width: sumW - 28 })
    .text(eur(excl), sumX + 14, y, { width: sumW - 28, align: "right" });
  y += 17;
  doc.text(`Btw ${Number(ownerInvoice.vat_rate)}%`, sumX + 14, y, { width: sumW - 28 })
    .text(eur(vat), sumX + 14, y, { width: sumW - 28, align: "right" });
  y += 21;
  doc.roundedRect(sumX, y, sumW, 34, 10).fillColor(pal.soft).fill();
  doc.font("Helvetica-Bold").fontSize(12).fillColor(pal.deep)
    .text("Totaal te betalen", sumX + 14, y + 10, { width: sumW - 28 })
    .text(eur(incl), sumX + 14, y + 10, { width: sumW - 28, align: "right" });
  y += 56;

  // --- verplichte duiding uit de klant-template + btw-advies ---
  doc.roundedRect(L, y, W, 52, 10).fillColor(SOFT).fill();
  doc.font("Helvetica").fontSize(9).fillColor(MUTED)
    .text(
      `Deze factuur betreft uitsluitend de beheer-, coördinatie- en bemiddelingsdienst van ${MANAGER[brand].name} ` +
      "aan de eigenaar. Schoonmaak, platform- en softwarekosten zijn reeds verwerkt in de berekening van de " +
      "Net Rental Income (zie owner statement) en worden niet afzonderlijk aangerekend.",
      L + 14, y + 12, { width: W - 28 }
    );

  doc.end();
  return done;
}
