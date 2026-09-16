/**
 * Gedeelde types tussen frontend en backend.
 * Sinds de Guesty-koppeling live is, is "vandaag" gewoon de echte datum
 * (voorheen een vaste demodag zodat het demoverhaal klopte).
 */
const now = new Date();
export const DEMO_TODAY = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

export type Channel = "airbnb" | "booking" | "vrbo";

export type PropertyStatus = "live" | "onboarding";

export interface Property {
  id: string;
  name: string;
  /** Interne codenaam uit Guesty (bv. "BE.DUIN.ARC.4") — zo praat het team over panden. */
  codeName: string | null;
  location: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  areaM2: number;
  rating: number | null;
  status: PropertyStatus;
  statusLabel: string;
  art: string;
  artBg: string;
  photo: string | null;
  description: string | null;
  channels: Channel[];
  cleaningPrice: number;
  basePriceWeek: number;
  basePriceWeekend: number;
  lat: number | null;
  lng: number | null;
  /**
   * Merk van het pand: de omgeving van de eigenaar, of zonder eigenaar de
   * bron — uit Guesty gesynct = Linnois (dat account is vandaag Linnois),
   * via het platform aangemaakt = Staybase. Volgt later de
   * Guesty-accountonderverdeling (changes 2.0, fase 2).
   */
  ownerBrand: Brand;
}

/** Alles wat de detailpagina van één pand toont. */
export interface PropertyDetail {
  property: Property;
  kpis: {
    occupancyPct: number;
    revenueYear: number;
    avgNight: number;
    bookingsYear: number;
    nightsBooked: number;
  };
  upcomingBookings: Booking[];
  cleanings: Cleaning[];
  suggestions: PriceSuggestion[];
  revenueByChannel: { channel: Channel; label: string; amount: number; pct: number }[];
}

export interface Booking {
  id: string;
  propertyId: string;
  guest: string;
  avatar: string;
  channel: Channel;
  startDate: string; // ISO yyyy-mm-dd (check-in)
  endDate: string;   // ISO yyyy-mm-dd (check-out)
  guests: number;
  /**
   * Totale gastbetaling (logies + kosten + taksen). §8: dit is hét bedrag —
   * de Guesty-uitbetaling reist bewust niet meer mee naar de client.
   */
  guestTotal: number;
  otaFee: number;
  cleaningFee: number;
  note: string | null;
  checkInTime: string | null;   // "17:00" (lokale tijd, uit Guesty)
  checkOutTime: string | null;  // "10:00"
}

export interface CalendarDay {
  date: string;
  day: number;
  weekday: number; // 0 = maandag … 6 = zondag
  today: boolean;
  cleaning: boolean;
  booking: null | {
    id: string;
    guest: string;
    channel: Channel;
    isStart: boolean;
    isEnd: boolean;
  };
  price: number | null;      // enkel voor vrije nachten
  suggested: number | null;  // openstaand prijsvoorstel voor die nacht
}

export interface CalendarData {
  propertyId: string;
  month: string; // yyyy-mm
  monthLabel: string;
  leadingBlanks: number;
  days: CalendarDay[];
  bookings: Booking[];
}

/** Eén rij in de tijdlijnweergave van de kalender (alle panden naast elkaar). */
export interface CalendarOverviewRow {
  property: Property;
  occupancyPct: number;   // bezetting binnen de getoonde maand
  bookings: Booking[];    // alle boekingen die de maand overlappen
}

export interface CalendarOverview {
  month: string;          // yyyy-mm
  monthLabel: string;
  daysInMonth: number;
  todayDay: number | null; // dagnummer van vandaag als die in deze maand valt
  properties: CalendarOverviewRow[];
}

/**
 * Herkomst: van waar komt deze gebruiker? Linnois doet het volledige beheer
 * voor zijn eigenaars (gastcommunicatie, prijzen, schoonmaak), dus die
 * eigenaars krijgen een uitgeklede variant van het platform te zien.
 * Staybase-gebruikers zijn externe eigenaars/property managers die het
 * platform zelf bedienen en dus alles zien.
 */
export type UserOrigin = "staybase" | "linnois";
export const ORIGIN_LABEL: Record<UserOrigin, string> = {
  staybase: "Staybase-gebruiker",
  linnois: "Linnois-gebruiker",
};

/** Wat een gebruiker mag zien op basis van zijn herkomst. */
export interface PlatformView {
  /** Eigen gastcommunicatie. Bij Linnois doet Julie dat — zij zien enkel "Chat met Julie". */
  inbox: boolean;
  /** Prijzen, prijssetting en nachtprijzen in de kalender. */
  prices: boolean;
  /** Totale omzet. Zonder dit ziet de eigenaar enkel zijn netto-uitbetaling. */
  grossRevenue: boolean;
  /** Schoonmaakdetails (team, kost, status). Zonder dit blijft enkel de datum over. */
  cleaningDetails: boolean;
}

const STAYBASE_VIEW: PlatformView = { inbox: true, prices: true, grossRevenue: true, cleaningDetails: true };
const LINNOIS_VIEW: PlatformView = { inbox: false, prices: false, grossRevenue: false, cleaningDetails: false };

/**
 * De variant van het platform voor deze gebruiker. Beheerders (het Staybase-
 * en Linnois-team zelf) zien altijd alles — de beperking geldt enkel voor
 * eigenaars van wie Linnois het beheer doet.
 */
export function viewFor(user: { role?: string; origin?: UserOrigin | null } | null | undefined): PlatformView {
  if (!user) return LINNOIS_VIEW;
  if (user.role === "admin") return STAYBASE_VIEW;
  return user.origin === "linnois" ? LINNOIS_VIEW : STAYBASE_VIEW;
}

/**
 * Huisstijl. Enkel de omgeving van een Linnois-*eigenaar* draagt de branding
 * van Linnois: hun logo in de zijbalk en het diepblauw #100551 als accentkleur.
 * De beheeromgeving is het gereedschap van het platform zelf en blijft altijd
 * Staybase — net als de uitgelogde website.
 */
export type Brand = "staybase" | "linnois";
/** Naam die de gebruiker ziet staan in de app-schil (assistent, footer, …). */
export const BRAND_LABEL: Record<Brand, string> = { staybase: "Staybase", linnois: "Linnois" };
/**
 * Admin-view (meeting 16/09): een beheerder switcht tussen drie werelden —
 * Linnois (enkel Linnois-panden, Linnois-branding), Staybase (enkel
 * Staybase-panden) en alles (overall admin, met per pand een merkbadge).
 */
export type AdminScope = "all" | "linnois" | "staybase";
export const ADMIN_SCOPES: AdminScope[] = ["linnois", "staybase", "all"];
export function isAdminScope(v: unknown): v is AdminScope {
  return v === "all" || v === "linnois" || v === "staybase";
}

export function brandFor(user: { role?: string; origin?: UserOrigin | null; adminScope?: AdminScope | null } | null | undefined): Brand {
  if (!user) return "staybase";
  // De omgeving van een admin volgt de gekozen view: in de Linnois-view
  // werkt ze zichtbaar "in Linnois"; Staybase- en overall-view blijven Staybase.
  if (user.role === "admin") return user.adminScope === "linnois" ? "linnois" : "staybase";
  return user.origin === "linnois" ? "linnois" : "staybase";
}

/**
 * Taal van de interface. NL is de basis: ontbreekt een vertaling, dan valt de
 * app terug op het Nederlands in plaats van een lege plek te tonen.
 */
export type Language = "nl" | "fr" | "en";
export const LANGUAGES: Language[] = ["nl", "fr", "en"];
export const LANGUAGE_LABEL: Record<Language, string> = {
  nl: "Nederlands",
  fr: "Français",
  en: "English",
};
/** Korte weergave voor de taalkiezer in de balk. */
export const LANGUAGE_SHORT: Record<Language, string> = { nl: "NL", fr: "FR", en: "EN" };
export const DEFAULT_LANGUAGE: Language = "nl";

export function isLanguage(v: unknown): v is Language {
  return v === "nl" || v === "fr" || v === "en";
}

/**
 * Btw-statuut van een eigenaar (§9a + btw-advies). Bepaalt of de gastfactuur
 * 12% btw draagt (btw-plichtige vennootschap) of btw-vrij is; "periodieke
 * aangiften" stuurt later de verleggingsregeling bij apart doorgerekende
 * schoonmaak. Regels blijven bewust soepel tot het overleg uit het advies.
 */
export type VatStatus = "onbekend" | "particulier" | "vennootschap_btw" | "vennootschap_geen_btw";
export const VAT_STATUS_LABEL: Record<VatStatus, string> = {
  onbekend: "Nog niet ingevuld",
  particulier: "Particulier",
  vennootschap_btw: "Btw-plichtige vennootschap",
  vennootschap_geen_btw: "Vennootschap zonder btw-plicht",
};

export interface BillingProfile {
  vatStatus: VatStatus;
  companyName: string | null;
  billingAddress: string | null;
  vatNumber: string | null;
  vatPeriodic: boolean;
  iban: string | null; // rekening waarop de netto-uitbetaling gestort wordt (§9c)
}

/* ---------- Uitbetalingen (§9c) ---------- */

/**
 * Eén uitbetalingsrun: alle boekingen die in een bepaalde maand zijn
 * uitgecheckt, per eigenaar opgeteld tot één overschrijving. Wordt op de
 * 15e van de maand erna uitbetaald; geen bankkoppeling maar een
 * CSV-batchbestand dat in KBC wordt ingeladen.
 */
export interface PayoutBookingLine {
  bookingId: string;
  guest: string;
  propertyId: string;
  propertyName: string;
  propertyCode: string | null;
  endDate: string;
  guestTotal: number;
  otaFee: number;
  cleaningFee: number;
  commissionIncl: number;
  netPayout: number;
}

export interface PayoutOwner {
  ownerId: string;
  name: string;
  email: string;
  iban: string | null;      // zonder IBAN kan de lijn niet mee in het batchbestand
  reference: string;         // mededeling op de overschrijving
  bookings: PayoutBookingLine[];
  amount: number;            // som van de netto-uitbetalingen
}

export interface PayoutsData {
  months: { month: string; runDate: string; bookings: number; amount: number; running: boolean }[];
  month: string;             // geselecteerde uitcheckmaand (YYYY-MM)
  runDate: string;           // 15e van de maand erna
  running: boolean;          // lopende maand: checkouts tot vandaag
  owners: PayoutOwner[];
  totals: { amount: number; bookings: number; owners: number; missingIban: number };
}

/**
 * Commissieafspraak. Wordt per klant onderhandeld, dus twee gegevens:
 * hoeveel procent, en waarover het gerekend wordt.
 *   • bruto = de totale gastbetaling
 *   • netto = totale gastbetaling − OTA-commissie − schoonmaakkost
 * Bruto is de standaard; netto is een commerciële geste voor eigenaars die
 * geen commissie willen betalen over kosten die ze toch al afdragen.
 */
export type CommissionBasis = "bruto" | "netto";
export const COMMISSION_BASIS_LABEL: Record<CommissionBasis, string> = {
  bruto: "Bruto",
  netto: "Netto",
};
export const COMMISSION_BASIS_HINT: Record<CommissionBasis, string> = {
  bruto: "over de totale gastbetaling",
  netto: "na aftrek van OTA-commissie en schoonmaak",
};
/** De standaardafspraak waarmee een nieuwe klant start. */
export const COMMISSION_DEFAULT_PCT = 15;
export const COMMISSION_MIN_PCT = 0;
export const COMMISSION_MAX_PCT = 40;

export interface Commission {
  pct: number;
  basis: CommissionBasis;
}

/**
 * De §8-keten voor één boeking, gevalideerd op de klant-templates:
 *   gast betaalde − OTA-commissie − schoonmaakkost = Net Rental Income
 *   commissie = pct × gastbetaling (bruto) of pct × NRI (netto), excl. btw
 *   netto uitbetaling = NRI − commissie incl. 21% btw
 * Front- en backend rekenen allebei met déze functie — één bron van waarheid.
 */
export interface BookingMoney {
  guestTotal: number;
  otaFee: number;
  cleaningFee: number;
}

export function revenueChain(m: BookingMoney, deal: Commission) {
  const netRentalIncome = m.guestTotal - m.otaFee - m.cleaningFee;
  const base = deal.basis === "netto" ? netRentalIncome : m.guestTotal;
  const commissionExcl = Math.round(base * deal.pct) / 100;
  const commissionIncl = Math.round(commissionExcl * 121) / 100;
  return {
    guestTotal: m.guestTotal,
    otaFee: m.otaFee,
    cleaningFee: m.cleaningFee,
    netRentalIncome,
    commissionExcl,
    commissionIncl,
    netPayout: netRentalIncome - commissionIncl,
  };
}

/** Formules: bepalen welke schermen een eigenaar ziet. Admins zien alles. */
export type UserPlan = "basic" | "premium" | "super";
export const PLAN_RANK: Record<UserPlan, number> = { basic: 0, premium: 1, super: 2 };
export const PLAN_LABEL: Record<UserPlan, string> = { basic: "Basic", premium: "Premium", super: "Super" };

/** Eigenaar-dashboard: één pand centraal (of een selectie bij meerdere panden). */
export interface OwnerHomeData {
  properties: { id: string; name: string }[];  // toegewezen panden (voor de switcher)
  property: Property | null;                    // het getoonde pand
  kpis: {
    occupancyPct: number;        // deze maand
    occupancyPrevPct: number;
    monthRevenue: number;
    prevMonthRevenue: number;
    rating: number | null;
  };
  nextBooking: (Booking & { nights: number; daysUntil: number }) | null;
  upcoming: Booking[];           // boekingen in de komende 8 weken
  recent: { id: string; guest: string; avatar: string; snippet: string; timeLabel: string; status: ConversationStatus }[];
  contactName: string;           // property manager (eerste admin)
}

/** Homepage: alles server-side berekend uit echte data. */
export interface HomeInsightCard {
  icon: string;
  title: string;
  body: string;
  cta: string;
  to: string;
}

export interface HomePropertyCard {
  id: string;
  name: string;
  location: string;
  photo: string | null;
  art: string;
  artBg: string;
  occupancyPct: number;   // deze maand
  monthRevenue: number;
  rating: number | null;
  todayLabel: string;     // "Check-in om 17:00" / "Niets gepland vandaag"
}

export interface HomeData {
  oldestInboxMinutes: number | null;
  occupancyPrevPct: number;
  prevMonthRevenue: number;
  sparkOccupancy: number[];  // laatste 8 maanden t.e.m. nu
  sparkRevenue: number[];
  sparkAdr: number[];
  sparkBookings: number[];
  adrPrev: number | null;
  rating: number | null;     // gem. score van live panden (uit Guesty)
  medianResponseMin: number | null;
  guestySyncAt: string | null;
  tomorrow: { checkIns: number; checkOuts: number; cleanings: number };
  weekWork: { messages: number; newBookings: number; checkIns: number; minutes: number };
  insights: HomeInsightCard[];
  properties: HomePropertyCard[];
}

/** Insights-pagina (admin): alles server-side berekend uit echte data. */
export interface InsightBucket {
  label: string;
  count: number;
}

export interface InsightsData {
  kpis: {
    occupancyNext30: number;           // % over alle live panden
    medianResponseMin: number | null;  // mediane reactietijd op gastberichten
    avgStayNights: number | null;
    avgLeadDays: number | null;        // boekingsvenster: boeking → check-in
    adr: number | null;                // gemiddelde nachtprijs (euro)
  };
  occupancyByMonth: { month: string; label: string; pct: number; current: boolean }[];
  responseBuckets: InsightBucket[];
  occupancyByProperty: { propertyId: string; name: string; pct: number }[];
  stayLengthBuckets: InsightBucket[];
  leadTimeBuckets: InsightBucket[];
  channelMix: { channel: Channel; label: string; bookings: number; revenue: number }[];
}

export type ConversationStatus = "draft" | "guard" | "done";

export interface Message {
  id: string;
  sender: "guest" | "host";
  body: string;
  timeLabel: string;
  auto: boolean;
}

export interface Conversation {
  id: string;
  propertyId: string;
  propertyName: string;
  guest: string;
  avatar: string;
  channel: Channel;
  status: ConversationStatus;
  snippet: string;
  timeLabel: string;
  draft: string | null;
  draftNote: string | null;
  guardReason: string | null;
  messages: Message[];
}

export type SuggestionStatus = "open" | "accepted" | "rejected";

export interface PriceSuggestion {
  id: string;
  propertyId: string;
  propertyName: string;
  startDate: string;
  endDate: string;
  rangeLabel: string;   // bv. "24 – 26 jul"
  dowLabel: string;     // bv. "vr – zo"
  priceFrom: number;
  priceTo: number;
  reason: string;
  status: SuggestionStatus;
}

export interface PriceStripDay {
  date: string;
  label: string;   // bv. "18 jul"
  price: number;
  suggested: number | null;
}

export type CleaningStatus = "confirmed" | "pending_owner" | "awaiting_team" | "done";

export interface Cleaning {
  id: string;
  propertyId: string;
  propertyName: string;
  date: string;
  dateLabel: string;
  dowLabel: string;
  timeLabel: string | null;
  team: string;
  source: "own" | "marketplace";
  price: number;
  status: CleaningStatus;
  statusNote: string | null;
  photos: number | null;
  aiCheck: string | null;
  /** Breezeway (fase 3): checklist-voortgang van de poetsbeurt. */
  checklistDone: number | null;
  checklistTotal: number | null;
  /** Inspectierapport-PDF beschikbaar (afgewerkte Breezeway-beurt) — ook voor de eigenaar. */
  reportAvailable: boolean;
}

export interface RevenueMonth {
  month: string;      // yyyy-mm
  label: string;      // "jan" …
  airbnb: number;
  booking: number;
  vrbo: number;
  running: boolean;   // true voor de lopende maand
}

export interface RevenueData {
  totalYear: number;
  deltaLabel: string;
  months: RevenueMonth[];
  channels: { channel: Channel; label: string; amount: number; pct: number }[];
  perProperty: { propertyId: string; name: string; art: string; amount: number | null; badge: string | null }[];
  documents: { id: string; icon: string; title: string; subtitle: string; badge: string | null }[];
}

export interface TimelineItem {
  time: string;
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  chip: { label: string; tone: "good" | "coral" | "vrbo" | "warn" | "gray" };
}

export interface Overview {
  greetingName: string;
  dateLabel: string;
  attention: {
    inboxDrafts: number;
    priceOpen: number;
    cleaningPending: number;
  };
  kpis: {
    occupancyPct: number;
    monthRevenue: number;
    avgNight: number;
    responseMinutes: number;
  };
  timeline: TimelineItem[];
  tasksThisWeek: { total: number; detail: string };
  properties: Property[];
  home: HomeData;
  trust: { count: number; target: number };
}

export interface AssistantReply {
  answer: string;
}

/** Payload van de onboarding-wizard. */
export interface NewPropertyInput {
  address: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  amenities: string[];
  photoChoice: "photographer" | "own";
  cleaningChoice: "marketplace" | "own";
  cleaningEmail: string | null;
  vrbo: boolean;
}
