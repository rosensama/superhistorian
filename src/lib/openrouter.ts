import { HistoryNode } from "./types";
import { mockSplitByTime, mockSplitByGeo, mockJumpToTopic, mockEssay } from "./mock-data";

const USE_MOCK = !process.env.OPENROUTER_API_KEY;

interface OpenRouterResult {
  content: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  model: string;
  cost?: number;
}

// Hard ceiling: 90s total for any LLM call, no retries.
// If it doesn't respond in 90s, it fails.
const TIMEOUT_MS = 90_000;

async function callOpenRouter(prompt: string, model?: string): Promise<OpenRouterResult> {
  const resolvedModel = model || process.env.OPENROUTER_MODEL || "openai/gpt-5-nano";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://superhistorian.vercel.app",
        "X-Title": "Super Historian",
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`OpenRouter API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    let content = data.choices[0].message.content;
    // Strip markdown code fences if the model wraps JSON in ```json ... ```
    content = content.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const cost = usage.cost ?? data.usage?.cost ?? null;

    return { content, usage, model: resolvedModel, cost };
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`OpenRouter timeout: no response within ${TIMEOUT_MS / 1000}s`);
    }
    throw err;
  }
}

const MOCK_USAGE = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

export async function splitByTime(node: HistoryNode, model?: string, language?: string) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));
    return { ...mockSplitByTime(node), _debug: { prompt: "(mock mode)", model: "mock", usage: MOCK_USAGE } };
  }

  const { buildSplitByTimePrompt } = await import("./prompts");
  const prompt = buildSplitByTimePrompt(node, language);
  const { content, usage, model: resolvedModel, cost } = await callOpenRouter(prompt, model);
  return { ...JSON.parse(content), _debug: { prompt, model: resolvedModel, usage, cost } };
}

export async function splitByGeo(node: HistoryNode, model?: string, language?: string) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));
    return { ...mockSplitByGeo(node), _debug: { prompt: "(mock mode)", model: "mock", usage: MOCK_USAGE } };
  }

  const { buildSplitByGeoPrompt } = await import("./prompts");
  const prompt = buildSplitByGeoPrompt(node, language);
  const { content, usage, model: resolvedModel, cost } = await callOpenRouter(prompt, model);
  return { ...JSON.parse(content), _debug: { prompt, model: resolvedModel, usage, cost } };
}

export async function jumpToTopic(query: string, model?: string, language?: string) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
    return { ...mockJumpToTopic(query), _debug: { prompt: "(mock mode)", model: "mock", usage: MOCK_USAGE } };
  }

  const { buildJumpToTopicPrompt } = await import("./prompts");
  const prompt = buildJumpToTopicPrompt(query, language);
  const { content, usage, model: resolvedModel, cost } = await callOpenRouter(prompt, model);
  return { ...JSON.parse(content), _debug: { prompt, model: resolvedModel, usage, cost } };
}

export async function generateEssay(node: HistoryNode, model?: string, language?: string) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
    return { ...mockEssay(node), _debug: { prompt: "(mock mode)", model: "mock", usage: MOCK_USAGE } };
  }

  const { buildEssayPrompt } = await import("./prompts");
  const prompt = buildEssayPrompt(node, language);
  const { content, usage, model: resolvedModel, cost } = await callOpenRouter(prompt, model);
  return { ...JSON.parse(content), _debug: { prompt, model: resolvedModel, usage, cost } };
}

export async function generateDefinition(
  term: string,
  context: string,
  topic: string,
  model?: string,
  language?: string
) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 200));
    return {
      definition: `"${term}" — (mock) a term used in the context of ${topic}.`,
      _debug: { prompt: "(mock mode)", model: "mock", usage: MOCK_USAGE },
    };
  }

  const { buildDefinePrompt } = await import("./prompts");
  const prompt = buildDefinePrompt(term, context, topic, language);
  const { content, usage, model: resolvedModel, cost } = await callOpenRouter(prompt, model);
  return { ...JSON.parse(content), _debug: { prompt, model: resolvedModel, usage, cost } };
}
