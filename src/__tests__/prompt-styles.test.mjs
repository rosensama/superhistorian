import { describe, it } from "node:test";
import assert from "node:assert/strict";

const DEFAULT_ESSAY_STYLE = `You are writing a short encyclopedia article.`;
const DEFAULT_DEFINE_STYLE = `Define the selected word or phrase.`;
const ESSAY_JSON_FOOTER = `Respond in JSON: { "essay": "..." }`;
const DEFINE_JSON_FOOTER = `Respond in JSON: { "definition": "..." }`;

function essayContextBlock(node) {
  return `Topic: ${node.title}
Time period: ${node.timeRange.start} to ${node.timeRange.end}
Geographic scope: ${node.geographicScope}
Context: ${node.summary}`;
}

function defineContextBlock(term, context, topic) {
  return `Term: "${term}"
Topic context: ${topic}
Surrounding text: ${context.slice(0, 800)}`;
}

function buildEssayPrompt(node, language = "English", style = DEFAULT_ESSAY_STYLE) {
  const lang =
    language === "English"
      ? ""
      : `\n\nRespond entirely in ${language}. All titles, summaries, and text content must be in ${language}. JSON keys must remain in English.`;
  return `${style}

${essayContextBlock(node)}

${ESSAY_JSON_FOOTER}${lang}`;
}

function buildDefinePrompt(term, context, topic, language = "English", style = DEFAULT_DEFINE_STYLE) {
  const lang =
    language === "English"
      ? ""
      : `\n\nRespond entirely in ${language}. All titles, summaries, and text content must be in ${language}. JSON keys must remain in English.`;
  return `${style}

${defineContextBlock(term, context, topic)}

${DEFINE_JSON_FOOTER}${lang}`;
}

const node = {
  title: "Test Era",
  timeRange: { start: "1000", end: "1100" },
  geographicScope: "Europe",
  summary: "A summary.",
};

describe("prompt style assembly", () => {
  it("uses default essay style and includes scaffolding", () => {
    const prompt = buildEssayPrompt(node);
    assert.match(prompt, /You are writing a short encyclopedia article/);
    assert.match(prompt, /Topic: Test Era/);
    assert.match(prompt, /Respond in JSON: \{ "essay": "\.\.\." \}/);
  });

  it("injects a custom essay style", () => {
    const prompt = buildEssayPrompt(node, "English", "CUSTOM STYLE BLOCK");
    assert.match(prompt, /^CUSTOM STYLE BLOCK/);
    assert.doesNotMatch(prompt, /You are writing a short encyclopedia article/);
    assert.match(prompt, /Topic: Test Era/);
  });

  it("injects a custom define style and keeps term context", () => {
    const prompt = buildDefinePrompt("orogen", "The orogen rose.", "Geology", "English", "Be terse.");
    assert.match(prompt, /^Be terse\./);
    assert.match(prompt, /Term: "orogen"/);
    assert.match(prompt, /Respond in JSON: \{ "definition": "\.\.\." \}/);
  });

  it("appends language instruction when not English", () => {
    const prompt = buildEssayPrompt(node, "French", "Style.");
    assert.match(prompt, /Respond entirely in French/);
  });
});
