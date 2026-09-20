import { describe, it } from "node:test";
import assert from "node:assert/strict";

function normalizeTerm(term) {
  return term.trim().replace(/\s+/g, " ").toLowerCase();
}

function segmentDefinedTerms(text, terms) {
  if (!text) return [];
  const unique = [...terms]
    .filter((t) => t.norm.length > 0)
    .sort((a, b) => b.norm.length - a.norm.length);
  if (unique.length === 0) return [{ type: "text", value: text }];

  const escaped = unique.map((t) => t.norm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  const normSet = new Map(unique.map((t) => [t.norm, t.term]));

  const out = [];
  for (const part of parts) {
    if (!part) continue;
    const norm = normalizeTerm(part);
    if (normSet.has(norm)) out.push({ type: "term", value: part, norm });
    else out.push({ type: "text", value: part });
  }
  return out;
}

describe("define-text", () => {
  it("normalizes whitespace and case", () => {
    assert.equal(normalizeTerm("  Indian   Plate "), "indian plate");
  });

  it("marks known terms and keeps other text", () => {
    const segs = segmentDefinedTerms("The orogen rose as the Indian Plate moved.", [
      { term: "orogen", norm: "orogen" },
      { term: "Indian Plate", norm: "indian plate" },
    ]);
    const joined = segs.map((s) => s.value).join("");
    assert.equal(joined, "The orogen rose as the Indian Plate moved.");
    assert.ok(segs.some((s) => s.type === "term" && s.norm === "orogen"));
    assert.ok(segs.some((s) => s.type === "term" && s.norm === "indian plate"));
  });

  it("prefers longer phrases over shorter overlaps", () => {
    const segs = segmentDefinedTerms("Greater Himalayan Sequence rocks", [
      { term: "Himalayan", norm: "himalayan" },
      { term: "Greater Himalayan Sequence", norm: "greater himalayan sequence" },
    ]);
    const terms = segs.filter((s) => s.type === "term");
    assert.equal(terms.length, 1);
    assert.equal(terms[0].norm, "greater himalayan sequence");
  });
});
