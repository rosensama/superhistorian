import { NextRequest, NextResponse } from "next/server";
import { ExploreRequest } from "@/lib/types";
import {
  splitByTime,
  splitByGeo,
  jumpToTopic,
  generateEssay,
  generateDefinition,
} from "@/lib/openrouter";

const MAX_STYLE_CHARS = 16_384;

function sanitizeStyle(style: unknown): string | undefined | { error: string } {
  if (style === undefined || style === null) return undefined;
  if (typeof style !== "string") return { error: "Style must be a string" };
  if (style.length > MAX_STYLE_CHARS) return { error: `Style exceeds ${MAX_STYLE_CHARS} characters` };
  return style;
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
        return NextResponse.json(result);
      }
      case "split-geography": {
        if (!body.node) return NextResponse.json({ error: "Node required" }, { status: 400 });
        const result = await splitByGeo(body.node, model, language);
        return NextResponse.json(result);
      }
      case "jump-to-topic": {
        if (!body.query) return NextResponse.json({ error: "Query required" }, { status: 400 });
        const result = await jumpToTopic(body.query, model, language);
        return NextResponse.json(result);
      }
      case "essay": {
        if (!body.node) return NextResponse.json({ error: "Node required" }, { status: 400 });
        const essayStyle = sanitizeStyle(body.essayStyle);
        if (essayStyle && typeof essayStyle === "object") {
          return NextResponse.json({ error: essayStyle.error }, { status: 400 });
        }
        const result = await generateEssay(body.node, model, language, essayStyle);
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
