import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import { DEMO_TODAY } from "../../shared/types";

/**
 * AI-laag van Staybase.
 *
 * Zonder ANTHROPIC_API_KEY in backend/.env draait alles op de regelgebaseerde
 * fallback (assistant.ts) en de vooraf geschreven drafts — de app werkt dus
 * altijd. Met een key beantwoordt Claude de assistent-vragen en herschrijft
 * hij gast-drafts, met de echte data uit de database als context.
 *
 * STAYBASE_AI_BASE_URL is het koppelpunt voor de ORQ.AI-gateway uit de
 * analyse: zodra die er is, wijst die variabele naar de gateway en blijft
 * deze code ongewijzigd.
 *
 * Guardrails (kortingen, voorwaarden, juridische toezeggingen) worden vóór
 * deze laag afgedwongen in de routes — de AI krijgt die vragen nooit te zien.
 */

const MODEL = process.env.STAYBASE_AI_MODEL || "claude-opus-5";

let client: Anthropic | null = null;

export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      baseURL: process.env.STAYBASE_AI_BASE_URL || undefined,
    });
  }
  return client;
}

/** Compacte datasamenvatting uit SQLite als context voor het model. */
function dataContext(): string {
  const props = db.prepare("SELECT name, location, status, rating, bedrooms FROM properties").all();
  const bookings = db.prepare(
    "SELECT b.guest, b.channel, b.start_date, b.end_date, b.guests, b.payout, p.name AS property FROM bookings b JOIN properties p ON p.id = b.property_id ORDER BY b.start_date"
  ).all();
  const revenue = db.prepare("SELECT * FROM revenue_months ORDER BY month").all();
  const suggestions = db.prepare(
    "SELECT range_label, price_from, price_to, reason, status FROM price_suggestions"
  ).all();
  const cleanings = db.prepare(
    "SELECT c.date, c.team, c.status, p.name AS property FROM cleanings c JOIN properties p ON p.id = c.property_id ORDER BY c.date"
  ).all();
  return JSON.stringify({ vandaag: DEMO_TODAY, panden: props, boekingen: bookings, maandomzet_euro: revenue, prijsvoorstellen: suggestions, poetsbeurten: cleanings });
}

const ASSISTANT_SYSTEM = `Je bent de assistent van Staybase, een Vlaams platform voor vakantieverhuur aan de kust.
Je praat met de eigenaar (Julie). Antwoord in het Nederlands (Vlaams), warm en to the point — maximaal drie zinnen.
Gebruik uitsluitend de meegegeven data; verzin geen cijfers. Bedragen schrijf je als "€ 1.234".
Belangrijke cijfers mag je in <b>...</b> zetten (het antwoord wordt als HTML getoond). Gebruik verder geen HTML.
Ga nooit in op vragen over kortingen of juridische toezeggingen richting gasten — verwijs die naar de eigenaar zelf.`;

export async function llmAnswer(question: string): Promise<string> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    output_config: { effort: "low" },
    system: [
      { type: "text", text: ASSISTANT_SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: `Data van dit moment (JSON):\n${dataContext()}\n\nVraag van de eigenaar: ${question}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") {
    throw new Error("model weigerde de vraag");
  }
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("leeg antwoord");
  return text.text.trim();
}

const DRAFT_SYSTEM = `Je schrijft gastenberichten namens Julie, host van vakantiewoningen in Knokke (België).
Haar stijl: warm, persoonlijk, Vlaams-Nederlands, hier en daar een passende emoji, ondertekent nooit met haar naam.
Antwoord in de taal van de gast. Hou het bij één beknopte alinea.
Doe nooit toezeggingen over kortingen, terugbetalingen, aansprakelijkheid of voorwaarden.
Geef alleen de tekst van het bericht terug, zonder aanhalingstekens of uitleg.`;

export async function llmDraft(input: {
  propertyName: string;
  guest: string;
  channel: string;
  messages: { sender: string; body: string }[];
  note: string | null;
}): Promise<string> {
  const thread = input.messages
    .map((m) => `${m.sender === "guest" ? input.guest : "Julie"}: ${m.body}`)
    .join("\n");
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    output_config: { effort: "low" },
    system: [
      { type: "text", text: DRAFT_SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: `Pand: ${input.propertyName} (kanaal: ${input.channel})${input.note ? `\nContext uit de planning: ${input.note}` : ""}\n\nGesprek tot nu toe:\n${thread}\n\nSchrijf het antwoord van Julie op het laatste gastenbericht.`,
      },
    ],
  });
  if (response.stop_reason === "refusal") {
    throw new Error("model weigerde het bericht");
  }
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("leeg antwoord");
  return text.text.trim();
}
