"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useHistorianStore } from "@/lib/store";
import { DebugEntry } from "@/lib/types";

const TIMEOUT_MS = 90_000; // 90s = 100% of progress bar

const ACTION_STYLES: Record<string, { bg: string; text: string; barColor: string; label: string }> = {
  "split-time":                { bg: "bg-blue-600",   text: "text-blue-100",   barColor: "from-blue-500/50 to-blue-400/30",     label: "TIME" },
  "split-geography":           { bg: "bg-orange-600", text: "text-orange-100", barColor: "from-orange-500/50 to-orange-400/30", label: "GEO" },
  "jump-to-topic":             { bg: "bg-green-600",  text: "text-green-100",  barColor: "from-green-500/50 to-green-400/30",   label: "SEARCH" },
  "essay":                     { bg: "bg-yellow-600", text: "text-yellow-100", barColor: "from-yellow-500/50 to-yellow-400/30", label: "ESSAY" },
  "define":                    { bg: "bg-teal-700",   text: "text-teal-100",   barColor: "from-teal-500/50 to-teal-400/30",     label: "DEFINE" },
  "generate-image":            { bg: "bg-purple-600", text: "text-purple-100", barColor: "from-purple-500/50 to-purple-400/30", label: "IMAGE" },
  "prefetch-split-time":       { bg: "bg-blue-800",   text: "text-blue-200",   barColor: "from-blue-600/40 to-blue-500/20",     label: "PRE-TIME" },
  "prefetch-split-geography":  { bg: "bg-orange-800", text: "text-orange-200", barColor: "from-orange-600/40 to-orange-500/20", label: "PRE-GEO" },
};

function getStyle(action: string) {
  return ACTION_STYLES[action] ?? { bg: "bg-gray-600", text: "text-gray-100", barColor: "from-gray-500/50 to-gray-400/30", label: action.slice(0, 8).toUpperCase() };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function DebugRow({ entry }: { entry: DebugEntry }) {
  const [, setTick] = useState(0);
  const isInFlight = !entry.completedAt && !entry.error;

  // Tick every 200ms to animate progress bar
  useEffect(() => {
    if (!isInFlight) return;
    const timer = setInterval(() => setTick((t) => t + 1), 200);
    return () => clearInterval(timer);
  }, [isInFlight]);

  const style = getStyle(entry.action);
  const elapsed = (entry.completedAt ?? Date.now()) - entry.timestamp;
  const progress = Math.min(100, (elapsed / TIMEOUT_MS) * 100);
  const duration = entry.completedAt ? entry.completedAt - entry.timestamp : elapsed;

  // Token info from response
  const usage = entry.response?._debug as Record<string, unknown> | undefined;
  const tokens = (usage?.usage as Record<string, number> | undefined)?.total_tokens;

  return (
    <details className="group">
      <summary className="flex items-center gap-1.5 px-3 py-1 cursor-pointer hover:bg-white/5 text-[12px] font-mono leading-relaxed">
        {/* Level + Action badge */}
        <span className="text-[10px] font-mono text-white/30 shrink-0 w-[26px] text-right tabular-nums">
          {entry.nodeDepth >= 0 ? `L${String(entry.nodeDepth).padStart(2, "0")}` : ""}
        </span>
        <span className={`${style.bg} ${style.text} px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 min-w-[52px] text-center`}>
          {style.label}
        </span>

        {/* Progress bar — fixed scale: 0 to 90s, always proportional */}
        <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden relative min-w-[120px]">
          {/* Scale markers at 30s and 60s */}
          <div className="absolute top-0 bottom-0 left-[33.3%] w-px bg-white/5" />
          <div className="absolute top-0 bottom-0 left-[66.6%] w-px bg-white/5" />
          <div
            className={`h-full transition-all duration-200 bg-gradient-to-r ${
              entry.error ? "from-red-500/50 to-red-400/30" :
              isInFlight ? style.barColor :
              "from-emerald-500/40 to-emerald-400/20"
            }`}
            style={{ width: `${progress}%` }}
          />
          {/* Node title + model printed over the bar */}
          <span className="absolute inset-0 flex items-center px-2 gap-1.5 text-[11px] truncate">
            <span className="text-white/90 font-medium truncate">
              {entry.nodeTitle || "..."}
            </span>
            <span className="text-white/40 shrink-0">
              {entry.model.split("/").pop()}
            </span>
          </span>
        </div>

        {/* Duration */}
        <span className={`shrink-0 tabular-nums text-[11px] min-w-[42px] text-right ${
          isInFlight ? "text-sky-300" : entry.error ? "text-red-300" : "text-emerald-300"
        }`}>
          {formatDuration(duration)}
        </span>

        {/* Tokens */}
        {tokens ? (
          <span className="shrink-0 text-[10px] text-white/40 min-w-[35px] text-right">
            {tokens > 1000 ? `${(tokens / 1000).toFixed(1)}k` : tokens}t
          </span>
        ) : (
          <span className="shrink-0 min-w-[35px]" />
        )}

        {/* Status indicator */}
        <span className="shrink-0 text-[11px]">
          {isInFlight ? "⏳" : entry.error ? "❌" : "✅"}
        </span>
      </summary>

      {/* Expandable details */}
      <div className="px-3 pb-2 space-y-1.5">
        {/* Prompt */}
        <div>
          <div className="text-[10px] font-bold text-white/30 uppercase mb-0.5">Prompt</div>
          <pre className="text-[11px] text-white/70 whitespace-pre-wrap bg-white/5 rounded p-2 max-h-32 overflow-y-auto">
            {entry.prompt}
          </pre>
        </div>

        {/* Response */}
        {entry.response && (
          <div>
            <div className="text-[10px] font-bold text-white/30 uppercase mb-0.5">Response</div>
            <div className="bg-white/5 rounded p-2 overflow-x-auto">
              <ResponseTable response={entry.response} />
            </div>
          </div>
        )}

        {/* Error */}
        {entry.error && (
          <div className="text-[11px] text-red-300 bg-red-500/10 rounded p-2">
            {entry.error}
          </div>
        )}
      </div>
    </details>
  );
}

function ResponseTable({ response }: { response: Record<string, unknown> }) {
  // Phases (split-time)
  if ("phases" in response && Array.isArray(response.phases)) {
    return (
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-0.5 pr-2 font-semibold text-white/60">Title</th>
            <th className="text-left py-0.5 pr-2 font-semibold text-white/60">Start</th>
            <th className="text-left py-0.5 pr-2 font-semibold text-white/60">End</th>
            <th className="text-left py-0.5 font-semibold text-white/60">Summary</th>
          </tr>
        </thead>
        <tbody>
          {(response.phases as { title: string; start: string; end: string; summary: string }[]).map((p, i) => (
            <tr key={i} className="border-b border-white/5">
              <td className="py-0.5 pr-2 text-white/80 font-medium">{p.title}</td>
              <td className="py-0.5 pr-2 text-white/50">{p.start}</td>
              <td className="py-0.5 pr-2 text-white/50">{p.end}</td>
              <td className="py-0.5 text-white/50">{p.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // Regions
  if ("regions" in response && Array.isArray(response.regions)) {
    return (
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-0.5 pr-2 font-semibold text-white/60">Region</th>
            <th className="text-left py-0.5 font-semibold text-white/60">Summary</th>
          </tr>
        </thead>
        <tbody>
          {(response.regions as { regionName: string; summary: string }[]).map((r, i) => (
            <tr key={i} className="border-b border-white/5">
              <td className="py-0.5 pr-2 text-white/80 font-medium">{r.regionName}</td>
              <td className="py-0.5 text-white/50">{r.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // Essay
  if ("essay" in response) {
    return (
      <p className="text-[11px] text-white/50 max-h-24 overflow-y-auto">
        {String(response.essay).slice(0, 400)}...
      </p>
    );
  }

  // Fallback
  return <pre className="text-[11px] text-white/50 overflow-x-auto">{JSON.stringify(response, null, 2).slice(0, 500)}</pre>;
}

const MIN_HEIGHT = 240;
const MAX_HEIGHT_RATIO = 0.8;

export default function DebugPanel() {
  const { debugLog, showDebug, toggleDebug, debugPanelHeight, setDebugPanelHeight } = useHistorianStore();
  const panelHeight = debugPanelHeight;
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = panelHeight;
    e.preventDefault();
  }, [panelHeight]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startY.current - e.clientY;
      const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO;
      const newHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, startHeight.current + delta));
      setDebugPanelHeight(newHeight);
    };
    const handleMouseUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setDebugPanelHeight]);

  const inFlightCount = debugLog.filter((e) => !e.completedAt && !e.error).length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <button
        onClick={toggleDebug}
        className={`absolute -top-8 right-4 px-3 py-1 text-xs font-mono rounded-t-lg transition-colors ${
          inFlightCount > 0
            ? "bg-sky-700 text-white"
            : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
        }`}
      >
        {showDebug ? "▼ Debug" : "▲ Debug"} ({debugLog.length}{inFlightCount > 0 ? ` / ${inFlightCount} active` : ""})
      </button>

      {showDebug && (
        <div className="bg-neutral-900 text-white border-t border-neutral-700 flex flex-col" style={{ height: panelHeight }}>
          {/* Drag handle */}
          <div
            onMouseDown={handleMouseDown}
            className="h-2 cursor-ns-resize flex items-center justify-center shrink-0 hover:bg-white/10 transition-colors"
          >
            <div className="w-12 h-0.5 bg-neutral-600 rounded-full" />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {debugLog.length === 0 ? (
              <div className="p-4 text-center text-sm text-neutral-500 font-mono">
                No API calls yet.
              </div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {debugLog.map((entry) => (
                  <DebugRow key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
