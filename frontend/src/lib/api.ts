import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AssistantReply, CalendarData, Cleaning, Conversation, NewPropertyInput,
  Overview, PriceStripDay, PriceSuggestion, Property, RevenueData,
} from "@shared/types";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch("/api" + path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

/* ---------- queries ---------- */

export const useOverview = () =>
  useQuery({ queryKey: ["overview"], queryFn: () => api<Overview>("/overview") });

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
