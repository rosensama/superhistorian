"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ImageLightboxProps {
  imageUrl: string | null;
  title?: string;
  timeRange?: { start: string; end: string };
  geographicScope?: string;
  summary?: string;
  onClose: () => void;
}

export default function ImageLightbox({ imageUrl, title, timeRange, geographicScope, summary, onClose }: ImageLightboxProps) {
  return (
    <AnimatePresence>
      {imageUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs cursor-pointer"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="max-w-4xl w-full max-h-[90vh] flex flex-col cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="rounded-t-2xl overflow-hidden bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- generated data URLs; next/image optimization does not apply */}
              <img
                src={imageUrl}
                alt={title || "Historical illustration"}
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>

            {/* Caption */}
            <div className="bg-parchment rounded-b-2xl p-5 border-t-0">
              {title && (
                <h3 className="font-display text-xl font-bold text-ink mb-1">
                  {title}
                </h3>
              )}
              {timeRange && (
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-sepia/10 rounded-full text-[11px] font-mono text-ink/70">
                    {timeRange.start}
                  </span>
                  <span className="text-ink/30 text-xs">&rarr;</span>
                  <span className="px-2 py-0.5 bg-sepia/10 rounded-full text-[11px] font-mono text-ink/70">
                    {timeRange.end}
                  </span>
                  {geographicScope && (
                    <span className="px-2 py-0.5 bg-crimson/10 text-crimson rounded-full text-[11px] font-mono">
                      {geographicScope}
                    </span>
                  )}
                </div>
              )}
              {summary && (
                <p className="font-serif text-sm text-ink/70 leading-relaxed">
                  {summary}
                </p>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white/80 hover:bg-black/70 hover:text-white text-lg transition-colors"
            >
              &times;
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
