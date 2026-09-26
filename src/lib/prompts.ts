import { HistoryNode } from "./types";

function langInstruction(language: string): string {
  if (language === "English") return "";
  return `\n\nRespond entirely in ${language}. All titles, summaries, and text content must be in ${language}. JSON keys must remain in English.`;
}

export function buildSplitByTimePrompt(node: HistoryNode, language = "English"): string {
  return `You are a historian. Given the following historical period, divide it into 3 to 6 sequential sub-periods (including an "Other" category for anything that doesn't fit neatly). For each, provide:
- title (short, evocative name)
- start and end dates
- summary (2-3 sentences)

Period: ${node.title}
Time range: ${node.timeRange.start} to ${node.timeRange.end}
Geographic scope: ${node.geographicScope}
Context: ${node.summary}

Respond in JSON: { "phases": [{ "title", "start", "end", "summary" }] }${langInstruction(language)}`;
}

export function buildSplitByGeoPrompt(node: HistoryNode, language = "English"): string {
  return `You are a historian. Given the following historical period and region, divide the geographic scope into 3 to 6 meaningful sub-regions for this era (including an "Other" category for anything that doesn't fit neatly). For each, provide:
- regionName
- summary of what was happening there during this period (2-3 sentences)

Period: ${node.title}
Time range: ${node.timeRange.start} to ${node.timeRange.end}
Current scope: ${node.geographicScope}
Context: ${node.summary}

Respond in JSON: { "regions": [{ "regionName", "summary" }] }${langInstruction(language)}`;
}

export function buildJumpToTopicPrompt(query: string, language = "English"): string {
  return `You are a historian. The user wants to explore: "${query}"

Provide:
- title
- start and end dates
- geographic scope (e.g. "Europe", "Global", "Japan")
- summary (3-4 sentences)

Respond in JSON: { "title", "start", "end", "geographicScope", "summary" }${langInstruction(language)}`;
}

/** Editable instruction/style block for essays (scaffolding stays in code). */
export const DEFAULT_ESSAY_STYLE = `You are writing a short encyclopedia article for intelligent, educated readers who already care about the topic. Be factual and dry. Prefer plain description over color.

Write about 350 words. Include specific names, dates, places, and causal claims where known. State uncertainty when evidence is thin.

Style rules:
- Encyclopedia register: clear, precise, neutral — not literary, not persuasive.
- Precise technical terms are welcome when they are the right word (e.g. orogen, satrapy, synoecism). Do not water them down for a lay audience; readers can look up definitions.
- Do not spice it up, persuade, or try to be engaging or vivid.
- No anthropomorphism (plates, oceans, empires, etc. do not have patience, silence, or intent).
- No first person, imagined scenes, or "picture yourself" framing.
- Avoid ornamental adjectives and metaphorical flourish; prefer concrete facts and processes.`;

/** Editable instruction/style block for definitions. */
export const DEFAULT_DEFINE_STYLE = `Define the selected word or phrase for an intelligent general reader. One or two short sentences. Plain language only — no jargon unless you immediately explain it.`;

export const ESSAY_JSON_FOOTER = `Respond in JSON: { "essay": "..." }`;
export const DEFINE_JSON_FOOTER = `Respond in JSON: { "definition": "..." }`;

export function essayContextBlock(node: HistoryNode): string {
  return `Topic: ${node.title}
Time period: ${node.timeRange.start} to ${node.timeRange.end}
Geographic scope: ${node.geographicScope}
Context: ${node.summary}`;
}

export function defineContextBlock(term: string, context: string, topic: string): string {
  return `Term: "${term}"
Topic context: ${topic}
Surrounding text: ${context.slice(0, 800)}`;
}

export function buildEssayPrompt(
  node: HistoryNode,
  language = "English",
  style = DEFAULT_ESSAY_STYLE
): string {
  return `${style}

${essayContextBlock(node)}

${ESSAY_JSON_FOOTER}${langInstruction(language)}`;
}

export function buildDefinePrompt(
  term: string,
  context: string,
  topic: string,
  language = "English",
  style = DEFAULT_DEFINE_STYLE
): string {
  return `${style}

${defineContextBlock(term, context, topic)}

${DEFINE_JSON_FOOTER}${langInstruction(language)}`;
}

/** Sample node for prompt preview when explorer has no useful current node. */
export const SAMPLE_PROMPT_NODE: HistoryNode = {
  id: "sample-prompt-node",
  title: "The Age of Mammals",
  summary:
    "From the extinction of non-avian dinosaurs to the rise of human civilization — sixty-six million years of mammalian diversification.",
  timeRange: { start: "66 million years ago", end: "Present" },
  geographicScope: "Global",
  parentId: null,
  children: [],
  splitAxis: null,
  depth: 1,
};

export const SAMPLE_DEFINE_TERM = "orogen";
export const SAMPLE_DEFINE_CONTEXT =
  "The Himalayan orogen rose as the Indian Plate collided with Eurasia, driving crustal thickening and uplift.";
export const SAMPLE_DEFINE_TOPIC = "The Age of Mammals";
