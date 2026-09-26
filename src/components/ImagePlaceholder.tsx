"use client";

import { useState } from "react";
import { useHistorianStore } from "@/lib/store";
import { motion } from "framer-motion";
import ImageLightbox from "./ImageLightbox";
import { ApiResult, GenerateImageResponse } from "@/lib/types";

interface ImagePlaceholderProps {
  contextText: string;
  cacheKey: string;
  compact?: boolean;
  title?: string;
  timeRange?: { start: string; end: string };
  geographicScope?: string;
  summary?: string;
}

// Client-side timeout must match server-side (90s)
const IMAGE_TIMEOUT_MS = 90_000;

// Concurrency limit for image generation (separate from text prefetch queue)
const MAX_IMAGE_CONCURRENT = 2;
let imageActiveCount = 0;
const imageQueue: (() => void)[] = [];

function enqueueImage(fn: () => Promise<void>) {
  const run = () => {
    imageActiveCount++;
    void fn().finally(() => {
      imageActiveCount--;
      const next = imageQueue.shift();
      if (next) next();
    });
  };
  if (imageActiveCount < MAX_IMAGE_CONCURRENT) {
    run();
  } else {
    imageQueue.push(run);
  }
}

// Fire-and-forget image generation that writes results to the store
export function generateImage(cacheKey: string, contextText: string) {
  const store = useHistorianStore.getState();

  // Don't start if already generating
  if (store.generatingImages[cacheKey]) return;

  store.setGeneratingImage(cacheKey, true);
  const debugId = store.startDebugEntry({
    action: "generate-image",
    model: store.selectedImageModel,
    prompt: contextText.slice(0, 100),
    nodeTitle: contextText.split(".")[0] || cacheKey,
    nodeDepth: -1,
  });

  enqueueImage(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: contextText,
          model: useHistorianStore.getState().selectedImageModel,
          nodeId: cacheKey.replace(/^node-/, ""),
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const data = (await res.json()) as ApiResult<GenerateImageResponse>;
      useHistorianStore.getState().completeDebugEntry(debugId, data);
      if (data.error) throw new Error(data.error);
      useHistorianStore.getState().setGeneratedImage(cacheKey, data.imageUrl);
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      const errMsg = isTimeout
        ? `Image timeout: no response within ${IMAGE_TIMEOUT_MS / 1000}s`
        : err instanceof Error ? err.message : "Failed to generate image";
      useHistorianStore.getState().completeDebugEntry(debugId, {}, errMsg);
      useHistorianStore.getState().setImageError(cacheKey, errMsg);
    }
  });
}

export default function ImagePlaceholder({ contextText, cacheKey, compact, title, timeRange, geographicScope, summary }: ImagePlaceholderProps) {
  const existingImage = useHistorianStore((s) => s.generatedImages[cacheKey]);
  const isGenerating = useHistorianStore((s) => s.generatingImages[cacheKey]);
  const error = useHistorianStore((s) => s.imageErrors[cacheKey]);
  const clearGeneratedImage = useHistorianStore((s) => s.clearGeneratedImage);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (existingImage) {
    return (
      <>
        <div
          className={`relative rounded-xl overflow-hidden border border-sepia/20 shadow-xs cursor-pointer hover:shadow-md transition-shadow group ${compact ? "my-4" : "my-3"}`}
          onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- generated data URLs; next/image optimization does not apply */}
          <img
            src={existingImage}
            alt={title || `Historical illustration: ${contextText.slice(0, 80)}...`}
            className="w-full h-auto"
          />
          <button
            onClick={(e) => { e.stopPropagation(); clearGeneratedImage(cacheKey); }}
            className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white/80 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            title="Remove image"
          >
            ×
          </button>
        </div>
        <ImageLightbox
          imageUrl={lightboxOpen ? existingImage : null}
          title={title}
          timeRange={timeRange}
          geographicScope={geographicScope}
          summary={summary}
          onClose={() => setLightboxOpen(false)}
        />
      </>
    );
  }

  return (
    <div
      className={`rounded-xl border-2 border-dashed border-sepia/20 bg-sepia/5 flex flex-col items-center justify-center gap-2 transition-colors hover:border-sepia/40 hover:bg-sepia/10 ${
        compact ? "my-4 py-6" : "my-3 py-8"
      }`}
    >
      {isGenerating ? (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="text-2xl"
          >
            🎨
          </motion.div>
          <span className="text-xs font-serif text-sepia/60 italic">Painting the scene...</span>
        </>
      ) : error ? (
        <>
          <span className="text-xs text-crimson font-serif">{error}</span>
          <button
            onClick={() => generateImage(cacheKey, contextText)}
            className="px-3 py-1.5 text-xs font-serif bg-sepia/10 text-sepia rounded-lg hover:bg-sepia/20 transition-colors"
          >
            Retry
          </button>
        </>
      ) : (
        <button
          onClick={() => generateImage(cacheKey, contextText)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-serif text-sepia border border-sepia/30 rounded-lg hover:bg-sepia/10 transition-colors"
        >
          <span>🎨</span> Generate Illustration
        </button>
      )}
    </div>
  );
}
