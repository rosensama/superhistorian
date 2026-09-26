import { NextRequest, NextResponse } from "next/server";
import { ExploreRequest } from "@/lib/types";
import {
  splitByTime,
  splitByGeo,
  jumpToTopic,
  generateEssay,
  generateDefinition,
  LlmDebug,
} from "@/lib/openrouter";
import { isDbAvailable } from "@/lib/db/client";
import { logUsage } from "@/lib/db/usage";

const MAX_STYLE_CHARS = 16_384;

function sanitizeStyle(style: unknown): string | undefined | { error: string } {
  if (style === undefined || style === null) return undefined;
  if (typeof style !== "string") return { error: "Style must be a string" };
  if (style.length > MAX_STYLE_CHARS) return { error: `Style exceeds ${MAX_STYLE_CHARS} characters` };
  return style;
}

// Best-effort DB persistence — doesn't block the response
async function persistUsage(debug: LlmDebug, action: string, nodeId?: string) {
  try {
    if (!(await isDbAvailable())) return;
    await logUsage({
      nodeId: nodeId ?? null,
      action,
      model: debug.model,
      prompt_tokens: debug.usage.prompt_tokens,
      completion_tokens: debug.usage.completion_tokens,
      total_tokens: debug.usage.total_tokens,
      cost_usd: debug.cost ?? null,
    });
  } catch (err) {
    console.warn("[DB] Failed to persist usage:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExploreRequest;

    const model = body.model;
    const language = body.language;

    switch (body.action) {
      case "split-time": {
        if (!body.node) return NextResponse.json({ error: "Node required" }, { status: 400 });
        const result = await splitByTime(body.node, model, language);
        // Fire-and-forget persistence
        void persistUsage(result._debug, "split-time", body.node.id);
        return NextResponse.json(result);
      }
      case "split-geography": {
        if (!body.node) return NextResponse.json({ error: "Node required" }, { status: 400 });
        const result = await splitByGeo(body.node, model, language);
        void persistUsage(result._debug, "split-geography", body.node.id);
        return NextResponse.json(result);
      }
      case "jump-to-topic": {
        if (!body.query) return NextResponse.json({ error: "Query required" }, { status: 400 });
        const result = await jumpToTopic(body.query, model, language);
        void persistUsage(result._debug, "jump-to-topic");
        return NextResponse.json(result);
      }
      case "essay": {
        if (!body.node) return NextResponse.json({ error: "Node required" }, { status: 400 });
        const essayStyle = sanitizeStyle(body.essayStyle);
        if (essayStyle && typeof essayStyle === "object") {
          return NextResponse.json({ error: essayStyle.error }, { status: 400 });
        }
        const result = await generateEssay(body.node, model, language, essayStyle);
        void persistUsage(result._debug, "essay", body.node.id);
        // Persist essay to node if DB available
        void persistEssay(body.node.id, result.essay, result._debug);
        return NextResponse.json(result);
      }
      case "define": {
        if (!body.term?.trim()) return NextResponse.json({ error: "Term required" }, { status: 400 });
        const defineStyle = sanitizeStyle(body.defineStyle);
        if (defineStyle && typeof defineStyle === "object") {
          return NextResponse.json({ error: defineStyle.error }, { status: 400 });
        }
        const topic = body.node?.title || body.query || "history";
        const result = await generateDefinition(
          body.term.trim(),
          body.context || "",
          topic,
          model,
          language,
          defineStyle
        );
        void persistUsage(result._debug, "define", body.node?.id);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Explore API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

async function persistEssay(nodeId: string, essay: string, debug: LlmDebug) {
  try {
    if (!(await isDbAvailable())) return;
    const { saveEssay } = await import("@/lib/db/nodes");
    await saveEssay(nodeId, essay, debug.model, debug.usage);
  } catch (err) {
    console.warn("[DB] Failed to persist essay:", err);
  }
}
