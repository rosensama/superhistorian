import { HistoryNode } from "./types";

/**
 * Parses the most recent year mentioned in a time range endpoint string.
 * Returns null if no year can be extracted.
 */
function parseEndYear(endDate: string): number | null {
  const lower = endDate.toLowerCase().trim();
  if (lower === "present" || lower === "today" || lower === "now") {
    return new Date().getFullYear();
  }
  // Match the last 4-digit year in the string (e.g. "late 19th century" → null,
  // "1970" → 1970, "c. 1850 BCE" → 1850 treated as negative handled below)
  const matches = endDate.match(/\b(\d{4})\b/g);
  const last = matches?.at(-1);
  if (!last) return null;
  const year = parseInt(last);
  // Treat BCE/BC years as negative — no modern style for those
  if (/bce?|bc/i.test(endDate)) return -year;
  return year;
}

/**
 * Returns a map generation prompt suited to the era of the node.
 * For periods ending after 1900 the map uses a clean, contemporaneous style;
 * for earlier periods it uses period-appropriate cartographic conventions —
 * but in both cases asks the model NOT to artificially age or distress the image.
 */
export function buildMapContext(node: HistoryNode): string {
  const endYear = parseEndYear(node.timeRange.end);
  const isModern = endYear !== null && endYear >= 1900;

  const base = `Map of ${node.geographicScope} for the period ${node.timeRange.start} to ${node.timeRange.end} (${node.title}). Show political boundaries, major cities, key trade routes, and territorial features relevant to this era.`;

  if (isModern) {
    return `${base} The map should look as if it was produced during this period — use the clean, precise cartographic conventions of the mid-to-late twentieth century or later: clear line work, flat or lightly shaded political colours, standard legend symbols. Do not apply parchment textures, aged-paper effects, burn marks, or any artificial distressing.`;
  }

  return `${base} The map should look as if it was produced contemporaneously during this period, using the cartographic conventions of the time. Do not apply parchment textures, burn marks, or exaggerated aging effects beyond what is appropriate for the era.`;
}
