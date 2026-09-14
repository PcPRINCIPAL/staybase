import type { Property } from "@shared/types";

/**
 * Pandenzoeker: naam, interne codenaam en locatie.
 *
 * De truc zit in het normaliseren: alles behalve letters en cijfers gaat
 * eruit, accenten ook. Zo wordt "BE.DUIN.ARC.4" → "beduinarc4", en vindt
 * "beduin", "be duin" of "be.duin" allemaal hetzelfde pand — het team tikt
 * die codes nooit twee keer op dezelfde manier in.
 *
 * Meerdere woorden werken als EN: elk woord moet ergens in het pand passen
 * ("pagode knokke" vindt De Pagode in Knokke-Heist).
 */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // é → e
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** De doorzoekbare velden van een pand, één keer genormaliseerd. */
export function propertyHaystack(p: Property): string[] {
  return [p.name, p.codeName ?? "", p.location, p.type].map(normalize).filter(Boolean);
}

export function matchesProperty(p: Property, query: string): boolean {
  const words = query.split(/\s+/).map(normalize).filter(Boolean);
  if (words.length === 0) return true;
  const hay = propertyHaystack(p);
  // Ook de samengeplakte query proberen: "be duin arc" → "beduinarc".
  const glued = words.join("");
  if (hay.some((h) => h.includes(glued))) return true;
  return words.every((w) => hay.some((h) => h.includes(w)));
}
