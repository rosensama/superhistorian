/** Normalize a selected phrase for definition cache keys. */
export function normalizeTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ").toLowerCase();
}

export type TextSegment =
  | { type: "text"; value: string }
  | { type: "term"; value: string; norm: string };

/**
 * Split `text` so known terms (longest first) become marked segments.
 * Case-insensitive match; preserves original casing in `value`.
 */
export function segmentDefinedTerms(
  text: string,
  terms: { term: string; norm: string }[]
): TextSegment[] {
  if (!text) return [];
  const unique = [...terms]
    .filter((t) => t.norm.length > 0)
    .sort((a, b) => b.norm.length - a.norm.length);
  if (unique.length === 0) return [{ type: "text", value: text }];

  const escaped = unique.map((t) => t.norm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  const normSet = new Map(unique.map((t) => [t.norm, t.term]));

  const out: TextSegment[] = [];
  for (const part of parts) {
    if (!part) continue;
    const norm = normalizeTerm(part);
    if (normSet.has(norm)) {
      out.push({ type: "term", value: part, norm });
    } else {
      out.push({ type: "text", value: part });
    }
  }
  return out;
}
