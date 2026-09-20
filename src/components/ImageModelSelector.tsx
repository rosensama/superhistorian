"use client";

import { useState, useEffect, useRef } from "react";
import { useHistorianStore } from "@/lib/store";
import { isOverride } from "@/lib/client-prefs";
import { PrefOverrideCue, prefTriggerClass } from "./PrefOverrideCue";

interface Model {
  id: string;
  name: string;
  created: number;
  contextLength: number;
  promptPrice: string;
  completionPrice: string;
}

const TRIGGER_BASE =
  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-sepia border border-sepia/30 rounded-lg hover:bg-sepia/10 transition-colors truncate max-w-[240px]";

export default function ImageModelSelector() {
  const { selectedImageModel, setSelectedImageModel } = useHistorianStore();
  const [models, setModels] = useState<Model[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const overridden = isOverride("selectedImageModel", selectedImageModel);

  const fetchModels = async () => {
    if (models.length > 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/models?type=image");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setModels(data.models);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load models");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) fetchModels();
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayName =
    models.find((m) => m.id === selectedImageModel)?.name ||
    selectedImageModel.split("/").pop() ||
    "Select image model";

  return (
    <div className="relative inline-flex items-center gap-1" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className={prefTriggerClass(overridden, TRIGGER_BASE)}
        title={selectedImageModel}
      >
        <span className="text-xs">🎨</span>
        <span className="truncate">{displayName}</span>
        <span className="text-[10px] ml-1">{isOpen ? "▲" : "▼"}</span>
      </button>
      <PrefOverrideCue prefKey="selectedImageModel" />

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-80 max-h-96 overflow-y-auto bg-white border border-sepia/20 rounded-xl shadow-xl z-50">
          {isLoading && (
            <div className="p-4 text-center text-sm text-sepia/60 font-serif">Loading models...</div>
          )}
          {error && (
            <div className="p-4 text-center text-sm text-crimson font-serif">{error}</div>
          )}
          {(() => {
            const maxPrice = Math.max(...models.map((m) => parseFloat(m.completionPrice) * 1e6), 0.01);

            return models.map((model) => {
              const outPrice = parseFloat(model.completionPrice) * 1e6;
              const barWidth = Math.max(2, (outPrice / maxPrice) * 100);

              return (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedImageModel(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-sepia/5 transition-colors border-b border-sepia/5 last:border-0 ${
                    model.id === selectedImageModel ? "bg-sepia/10" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-serif text-sm text-ink font-medium truncate">{model.name}</span>
                    {model.id === selectedImageModel && <span className="text-xs text-navy">✓</span>}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-3 bg-sepia/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-400 to-pink-400 rounded-full"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-sepia/50 shrink-0 w-16 text-right">
                      ${outPrice < 1 ? outPrice.toFixed(2) : outPrice.toFixed(1)}/M
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-sepia/40 font-mono">
                    <span>{new Date(model.created * 1000).toLocaleDateString()}</span>
                  </div>
                </button>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
