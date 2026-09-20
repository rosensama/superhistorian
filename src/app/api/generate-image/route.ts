import { NextRequest, NextResponse } from "next/server";
import { saveImage } from "@/lib/db/images";
import { isDbAvailable } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  try {
    const { context, model, nodeId } = await req.json();

    if (!context) {
      return NextResponse.json({ error: "Context required" }, { status: 400 });
    }

    const imageModel = model || process.env.OPENROUTER_IMAGE_MODEL || "google/gemini-3.1-flash-image";

    const prompt = `Create a vivid, historically accurate illustration for the following historical context. The image should look like a high-quality textbook illustration or historical painting. No text or labels in the image.

Context: ${context}

Generate a single image that captures the essence of this historical moment.`;

    const TIMEOUT_MS = 90_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://superhistorian.vercel.app",
          "X-Title": "Super Historian",
        },
        body: JSON.stringify({
          model: imageModel,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`Image generation timeout: no response within ${TIMEOUT_MS / 1000}s`);
      }
      throw err;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter API error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    const message = data.choices?.[0]?.message;
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const debugInfo = { prompt, model: imageModel, usage };

    // Extract image URL from various response formats
    let imageUrl: string | null = null;

    // OpenAI-style: images array on the message object
    if (message?.images && Array.isArray(message.images)) {
      const imagePart = message.images.find(
        (part: { type: string }) => part.type === "image_url" || part.type === "image"
      );
      if (imagePart) {
        imageUrl = imagePart.image_url?.url || imagePart.url;
      }
    }

    // Content as array with image parts
    if (!imageUrl && message?.content && Array.isArray(message.content)) {
      const imagePart = message.content.find(
        (part: { type: string }) => part.type === "image_url" || part.type === "image"
      );
      if (imagePart) {
        imageUrl = imagePart.image_url?.url || imagePart.url;
      }
    }

    // Content as a base64 data URL string
    if (!imageUrl && message?.content && typeof message.content === "string" && message.content.startsWith("data:image")) {
      imageUrl = message.content;
    }

    if (!imageUrl) {
      return NextResponse.json({
        error: "Unexpected response format",
        rawResponse: data,
        _debug: debugInfo,
      }, { status: 500 });
    }

    // Return image to client immediately — save to disk/DB in background
    // (don't block the response on persistence)
    if (imageUrl.startsWith("data:image") && nodeId) {
      // Fire-and-forget: save to disk + DB
      saveImage(nodeId, imageUrl)
        .then(async (saved) => {
          try {
            if (await isDbAvailable()) {
              const { saveImagePath } = await import("@/lib/db/nodes");
              const { logUsage } = await import("@/lib/db/usage");
              await saveImagePath(nodeId, saved.relativePath, imageModel);
              await logUsage({
                nodeId,
                action: "generate-image",
                model: imageModel,
                prompt_tokens: usage.prompt_tokens,
                completion_tokens: usage.completion_tokens,
                total_tokens: usage.total_tokens,
              });
            }
          } catch (err) {
            console.warn("[DB] Failed to persist image metadata:", err);
          }
        })
        .catch((err) => console.warn("[Image] Failed to save to disk:", err));
    }

    return NextResponse.json({ imageUrl, _debug: debugInfo });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate image" },
      { status: 500 }
    );
  }
}
