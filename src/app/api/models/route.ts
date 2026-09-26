import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface OpenRouterModel {
  id: string;
  name: string;
  created: number;
  description: string;
  context_length: number;
  architecture?: {
    output_modalities?: string[];
  };
  pricing?: {
    prompt: string;
    completion: string;
  };
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

// Preferred text models in display order
const PREFERRED_TEXT_MODELS = [
  "google/gemini-3-flash-preview",
  "deepseek/deepseek-v4-pro",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5.4-mini",
  "openai/gpt-5-nano",
  "deepseek/deepseek-v4-flash",
  "anthropic/claude-sonnet-4.6",
  "moonshotai/kimi-k2.6",
];

export async function GET(req: NextRequest) {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      next: { revalidate: 3600 }, // cache for 1 hour
    });

    if (!res.ok) {
      throw new Error(`OpenRouter API error: ${res.status}`);
    }

    const { data } = (await res.json()) as OpenRouterModelsResponse;
    const type = req.nextUrl.searchParams.get("type");

    // Filter by type if specified
    let filtered = data.filter((m) => m.created && m.name);
    if (type === "image") {
      filtered = filtered.filter((m) =>
        m.architecture?.output_modalities?.includes("image")
      );
    } else {
      // For text models, use the curated list
      const modelMap = new Map(filtered.map((m) => [m.id, m]));
      filtered = PREFERRED_TEXT_MODELS
        .map((id) => modelMap.get(id))
        .filter((m): m is OpenRouterModel => m !== undefined);
    }

    // Return in preferred order (text) or created-descending (image)
    const sorted =
      type === "image"
        ? filtered
            .sort((a, b) => b.created - a.created)
            .slice(0, 20)
        : filtered;

    const result = sorted.map((m) => ({
      id: m.id,
      name: m.name,
      created: m.created,
      contextLength: m.context_length,
      promptPrice: m.pricing?.prompt,
      completionPrice: m.pricing?.completion,
    }));

    return NextResponse.json({ models: result });
  } catch (error) {
    console.error("Models API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch models" },
      { status: 500 }
    );
  }
}
