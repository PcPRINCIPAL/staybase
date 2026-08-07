import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AssistantReply, CalendarData, Cleaning, Conversation, NewPropertyInput,
  Overview, PriceStripDay, PriceSuggestion, Property, PropertyDetail, RevenueData,
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
}

export const login = (email: string, password: string) =>
  api<AuthUser>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const logout = () => api<{ ok: boolean }>("/auth/logout", { method: "POST" });

export const fetchMe = () => api<AuthUser>("/auth/me");

/* ---------- queries ---------- */

export const useOverview = () =>
  useQuery({ queryKey: ["overview"], queryFn: () => api<Overview>("/overview") });

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

export const useRevenue = () =>
  useQuery({ queryKey: ["revenue"], queryFn: () => api<RevenueData>("/revenue") });

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
    [["overview"], ["revenue"]]
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

export const useAdminUsers = () =>
  useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api<{ users: AdminUser[]; roles: { role: string; n: number }[] }>("/admin/users"),
  });

export const useOnboardingStats = () =>
  useQuery({ queryKey: ["onboarding-stats"], queryFn: () => api<OnboardingStats>("/onboarding/stats") });

export const useAiStatus = () =>
  useQuery({ queryKey: ["ai-status"], queryFn: () => api<{ llm: boolean }>("/ai-status"), staleTime: 60_000 });

export const useRegenerateDraft = () =>
  useInvalidating(
    (id: string) => api<Conversation>(`/conversations/${id}/regenerate`, { method: "POST" }),
    [["conversations"]]
  );
