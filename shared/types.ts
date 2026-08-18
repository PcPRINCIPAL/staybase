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
  payout: number;    // euro
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
