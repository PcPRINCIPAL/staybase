import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AssistantReply, CalendarData, CalendarOverview, Cleaning, Conversation, InsightsData,
  NewPropertyInput, OwnerHomeData, Overview, PriceStripDay, PriceSuggestion, Property,
  BillingProfile, CommissionBasis, Language, PayoutsData, PropertyDetail, RevenueData, UserOrigin, UserPlan,
} from "@shared/types";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch("/api" + path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event("sb:unauthorized"));
    }
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/* ---------- auth ---------- */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "owner";
  plan: UserPlan;
  /** Staybase- of Linnois-gebruiker — bepaalt de variant van het platform. */
  origin: UserOrigin;
  /** Voorkeurstaal van de interface. */
  language: Language;
  /** Facturatiegegevens (§9a-popup) — bepaalt o.a. btw op de gastfactuur. */
  billing: BillingProfile;
}

export const login = (email: string, password: string) =>
  api<AuthUser>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const register = (name: string, email: string, password: string, language: Language) =>
  api<AuthUser>("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password, language }) });

/** Eigen voorkeurstaal bewaren. */
export const setMyLanguage = (language: Language) =>
  api<{ ok: boolean; language: Language }>("/auth/me/language", {
    method: "PATCH",
    body: JSON.stringify({ language }),
  });

/** Facturatiegegevens van de ingelogde eigenaar bewaren (§9a-popup). */
export const saveBilling = (b: {
  vatStatus: string; companyName: string; billingAddress: string; vatNumber: string; vatPeriodic: boolean; iban: string;
}) => api<AuthUser>("/auth/me/billing", { method: "PATCH", body: JSON.stringify(b) });

/** Vertaalt één bericht of voorstel naar de gevraagde taal. */
export const translateText = (text: string, to: Language) =>
  api<{ text: string; language: Language }>("/translate", {
    method: "POST",
    body: JSON.stringify({ text, to }),
  });

export const logout = () => api<{ ok: boolean }>("/auth/logout", { method: "POST" });

export const fetchMe = () => api<AuthUser>("/auth/me");

/* ---------- queries ---------- */

export const useOverview = () =>
  useQuery({ queryKey: ["overview"], queryFn: () => api<Overview>("/overview") });

export const useProperties = () =>
  useQuery({ queryKey: ["properties"], queryFn: () => api<Property[]>("/properties") });

export const useClientConfig = () =>
  useQuery({
    queryKey: ["client-config"],
    queryFn: () => api<{ mapboxToken: string | null }>("/client-config"),
    staleTime: Infinity,
  });

export const usePropertyDetail = (id: string | undefined) =>
  useQuery({
    queryKey: ["property", id],
    queryFn: () => api<PropertyDetail>(`/properties/${id}`),
    enabled: Boolean(id),
  });

export const useCalendar = (property: string, month: string) =>
  useQuery({
    queryKey: ["calendar", property, month],
    queryFn: () => api<CalendarData>(`/calendar?property=${property}&month=${month}`),
    enabled: Boolean(property),
  });

export const useCalendarOverview = (month: string) =>
  useQuery({
    queryKey: ["calendar-overview", month],
    queryFn: () => api<CalendarOverview>(`/calendar-overview?month=${month}`),
  });

export const useConversations = () =>
  useQuery({ queryKey: ["conversations"], queryFn: () => api<Conversation[]>("/conversations") });

export const usePriceSuggestions = () =>
  useQuery({ queryKey: ["price-suggestions"], queryFn: () => api<PriceSuggestion[]>("/price-suggestions") });

export const usePriceStrip = (property: string) =>
  useQuery({
    queryKey: ["price-strip", property],
    queryFn: () => api<PriceStripDay[]>(`/price-strip?property=${property}`),
  });

export const usePricingSettings = () =>
  useQuery({
    queryKey: ["pricing-settings"],
    queryFn: () => api<{ auto: boolean; decided: number; reviewTarget: number; open: number }>("/pricing-settings"),
  });

export const useCleanings = () =>
  useQuery({ queryKey: ["cleanings"], queryFn: () => api<Cleaning[]>("/cleanings") });

export interface RevenueChainTotals {
  guestTotal: number;
  otaFee: number;
  commission: number;
  cleaning: number;
  netPayout: number;
  bookings: number;
}

export const useRevenue = () =>
  useQuery({
    queryKey: ["revenue"],
    queryFn: () => api<RevenueData & { chain: RevenueChainTotals }>("/revenue"),
  });

/* ---------- mutaties ---------- */

function useInvalidating<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keys: string[][]
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => fn(...args),
    onSuccess: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: k })),
  });
}

export const useApproveConversation = () =>
  useInvalidating(
    (id: string) => api<Conversation>(`/conversations/${id}/approve`, { method: "POST" }),
    [["conversations"], ["overview"]]
  );

export const useReplyConversation = () =>
  useInvalidating(
    (id: string, body: string) =>
      api<Conversation>(`/conversations/${id}/reply`, { method: "POST", body: JSON.stringify({ body }) }),
    [["conversations"], ["overview"]]
  );

export const useDecideSuggestion = () =>
  useInvalidating(
    (id: string, decision: "accepted" | "rejected") =>
      api<PriceSuggestion>(`/price-suggestions/${id}/decide`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      }),
    [["price-suggestions"], ["pricing-settings"], ["price-strip"], ["calendar"], ["overview"]]
  );

export const useConfirmCleaning = () =>
  useInvalidating(
    (id: string) => api<Cleaning>(`/cleanings/${id}/confirm`, { method: "POST" }),
    [["cleanings"], ["overview"]]
  );

export const useSetAutoPricing = () =>
  useInvalidating(
    (auto: boolean) => api<{ auto: boolean }>("/pricing-settings", { method: "POST", body: JSON.stringify({ auto }) }),
    [["pricing-settings"]]
  );

export const useCreateProperty = () =>
  useInvalidating(
    (input: NewPropertyInput) => api<Property>("/properties", { method: "POST", body: JSON.stringify(input) }),
    [["overview"], ["revenue"], ["properties"]]
  );

export const askAssistant = (question: string) =>
  api<AssistantReply>("/assistant", { method: "POST", body: JSON.stringify({ question }) });

/* ---------- adres & onboarding ---------- */

export interface AddressSuggestion {
  label: string;
  sub: string;
  value: string;
}

export const geocodeAddress = (q: string) =>
  api<AddressSuggestion[]>(`/geocode?q=${encodeURIComponent(q)}`);

export function trackOnboarding(payload: {
  sessionId: string;
  step: number;
  stepTitle: string;
  durationMs: number;
  completed?: boolean;
}): void {
  // Fire-and-forget: analytics mag de wizard nooit vertragen of breken.
  fetch("/api/onboarding/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

/* ---------- admin (alleen voor rol 'admin') ---------- */

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "owner";
  plan: UserPlan;
  origin: UserOrigin;
  commissionPct: number;
  commissionBasis: CommissionBasis;
  createdAt: string;
  onboardings: number;
  lastLogin: string | null;
}

export interface OnboardingStats {
  sessionsStarted: number;
  sessionsCompleted: number;
  perStep: { step: number; stepTitle: string; visits: number; avgMs: number; totalSec: number }[];
  recent: { sessionId: string; userName: string; startedAt: string; totalMs: number; steps: number; completed: number }[];
}

export const useMyProperty = (propertyId?: string) =>
  useQuery({
    queryKey: ["my-property", propertyId ?? ""],
    queryFn: () => api<OwnerHomeData>(`/my-property${propertyId ? `?property=${propertyId}` : ""}`),
  });

export interface AdminProperty {
  id: string;
  name: string;
  codeName: string | null;
  location: string;
  photo: string | null;
  status: "live" | "onboarding";
  ownerId: string | null;
}

export const useAdminProperties = () =>
  useQuery({ queryKey: ["admin-properties"], queryFn: () => api<AdminProperty[]>("/admin/properties") });

export const useAssignPropertyOwner = () =>
  useInvalidating(
    (propertyId: string, userId: string | null) =>
      api<{ ok: boolean; ownerId: string | null }>(`/admin/properties/${propertyId}/owner`, {
        method: "PATCH",
        body: JSON.stringify({ userId }),
      }),
    [["admin-properties"], ["properties"], ["overview"], ["my-property"]]
  );

export const useInsights = () =>
  useQuery({ queryKey: ["insights"], queryFn: () => api<InsightsData>("/insights") });

export const useSetUserPlan = () =>
  useInvalidating(
    (id: string, plan: UserPlan) =>
      api<{ ok: boolean; plan: UserPlan }>(`/admin/users/${id}/plan`, { method: "PATCH", body: JSON.stringify({ plan }) }),
    [["admin-users"]]
  );

export const useSetUserOrigin = () =>
  useInvalidating(
    (id: string, origin: UserOrigin) =>
      api<{ ok: boolean; origin: UserOrigin }>(`/admin/users/${id}/origin`, { method: "PATCH", body: JSON.stringify({ origin }) }),
    [["admin-users"]]
  );

export const useSetUserCommission = () =>
  useInvalidating(
    (id: string, pct: number, basis: CommissionBasis) =>
      api<{ ok: boolean; pct: number; basis: CommissionBasis }>(`/admin/users/${id}/commission`, {
        method: "PATCH",
        body: JSON.stringify({ pct, basis }),
      }),
    [["admin-users"]]
  );

export const useAdminUsers = () =>
  useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api<{ users: AdminUser[]; roles: { role: string; n: number }[] }>("/admin/users"),
  });

export const useOnboardingStats = () =>
  useQuery({ queryKey: ["onboarding-stats"], queryFn: () => api<OnboardingStats>("/onboarding/stats") });

/* ---------- gastfacturen (§9a) ---------- */

export interface InvoicesOverview {
  issued: { bookingId: string; label: string; issuedAt: string }[];
  pending: { bookingId: string; propertyId: string; propertyName: string; guest: string; endDate: string; checkedOut: boolean }[];
}

export const useInvoicesOverview = () =>
  useQuery({ queryKey: ["invoices"], queryFn: () => api<InvoicesOverview>("/invoices/overview") });

export interface InvoiceListItem {
  bookingId: string;
  label: string;
  issuedAt: string;
  amount: number;
  vatRate: number;
  propertyId: string;
  propertyName: string;
  propertyCode: string | null;
  guest: string;
  startDate: string | null;
  endDate: string | null;
}

export const useInvoices = () =>
  useQuery({ queryKey: ["invoices", "list"], queryFn: () => api<InvoiceListItem[]>("/invoices") });

/**
 * Download via een verborgen navigatie zodat de sessiecookie meegaat; daarna
 * het overzicht verversen, want de eerste download legt het factuurnummer vast.
 */
export function downloadInvoice(bookingId: string): void {
  window.location.assign(`/api/bookings/${bookingId}/invoice.pdf`);
}

/** Owner statement (§9b): administratief overzicht per boeking. */
export function downloadOwnerStatement(bookingId: string): void {
  window.location.assign(`/api/bookings/${bookingId}/owner-statement.pdf`);
}

/** Beheerfactuur (§9b): vergoeding beheerder → eigenaar. */
export function downloadManagementInvoice(bookingId: string): void {
  window.location.assign(`/api/bookings/${bookingId}/management-invoice.pdf`);
}

/** Bundel: alle facturen in scope als één PDF, optioneel voor één pand. */
export function downloadInvoiceBundle(propertyId?: string): void {
  window.location.assign(`/api/invoices/bundle.pdf${propertyId ? `?property=${propertyId}` : ""}`);
}

/* ---------- uitbetalingen (§9c) ---------- */

export const usePayouts = (month?: string) =>
  useQuery({
    queryKey: ["payouts", month ?? "auto"],
    queryFn: () => api<PayoutsData>(`/payouts${month ? `?month=${month}` : ""}`),
  });

/** KBC-batchbestand (CSV) voor de geselecteerde run. */
export function downloadPayoutsCsv(month: string): void {
  window.location.assign(`/api/payouts/kbc.csv?month=${month}`);
}

/* ---------- Guesty-koppeling ---------- */

export interface GuestySyncSummary {
  at: string;
  listings: { created: number; updated: number; total: number };
  bookings: { created: number; updated: number; removed: number; skipped: number };
  messages: { created: number; updated: number; newMessages: number; skipped: number; totalRemote: number };
}

export interface GuestyStatus {
  configured: boolean;
  lastSync: GuestySyncSummary | null;
  linkedProperties: number;
  linkedBookings: number;
  linkedConversations: number;
}

export const useGuestyStatus = () =>
  useQuery({ queryKey: ["guesty-status"], queryFn: () => api<GuestyStatus>("/integrations/guesty") });

export const testGuestyConnection = () =>
  api<{ ok: boolean; listingsTotal: number }>("/integrations/guesty/test", { method: "POST" });

// Na een sync of reset kan élke datapagina veranderd zijn.
const GUESTY_KEYS = [["guesty-status"], ["overview"], ["revenue"], ["calendar"], ["property"], ["properties"], ["price-strip"], ["cleanings"], ["conversations"]];

export const useGuestySync = () =>
  useInvalidating(() => api<GuestySyncSummary>("/integrations/guesty/sync", { method: "POST" }), GUESTY_KEYS);

export const useGuestyReset = () =>
  useInvalidating(
    () => api<{ properties: number; bookings: number }>("/integrations/guesty/reset", { method: "POST" }),
    GUESTY_KEYS
  );

export const useAiStatus = () =>
  useQuery({ queryKey: ["ai-status"], queryFn: () => api<{ llm: boolean }>("/ai-status"), staleTime: 60_000 });

export const useRegenerateDraft = () =>
  useInvalidating(
    (id: string) => api<Conversation>(`/conversations/${id}/regenerate`, { method: "POST" }),
    [["conversations"]]
  );
