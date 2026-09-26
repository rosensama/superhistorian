"use client";

import { useCallback, useEffect, useRef } from "react";
import { useHistorianStore } from "@/lib/store";
import { ApiResult, EssayResponse, HistoryNode, SplitByGeoResponse, SplitByTimeResponse } from "@/lib/types";
import { v4 } from "@/lib/uuid";
import { slimNode } from "@/lib/slim-node";
import { needsExpandForAction } from "@/lib/path";
import SearchBar from "./SearchBar";
import NodeGrid from "./NodeGrid";
import LoadingSkeleton from "./LoadingSkeleton";
import ImagePlaceholder, { generateImage } from "./ImagePlaceholder";
import ModelSelector from "./ModelSelector";
import ImageModelSelector from "./ImageModelSelector";
import LanguageSelector from "./LanguageSelector";
import DebugPanel from "./DebugPanel";
import DefinableText from "./DefinableText";
import Link from "next/link";
import { initialSplits } from "@/lib/initial-splits";
import { prefetchForNode, cancelPrefetches } from "@/lib/prefetch";
import { buildMapContext } from "@/lib/map-context";
import { isPromptStyleOverride } from "@/lib/client-prefs";
import { APP_VERSION } from "@/lib/running-version";
import { motion } from "framer-motion";

// A single level in the vertical exploration thread
function ExplorationLevel({
  node,
  selectedChildId,
  depth,
  onSplitTime,
  onSplitGeo,
  onSelectChild,
  onEssay,
  onEnsureSelected,
  isLoading,
  isDeepest,
}: {
  node: HistoryNode;
  selectedChildId: string | null;
  depth: number;
  onSplitTime: (node: HistoryNode) => void;
  onSplitGeo: (node: HistoryNode) => void;
  onSelectChild: (node: HistoryNode) => void;
  onEssay: (node: HistoryNode) => void;
  onEnsureSelected: (node: HistoryNode) => void;
  isLoading: boolean;
  isDeepest: boolean;
}) {
  const hasChildren = node.children.length > 0;
  const isSearchResult = depth === 0 && node.id !== "root";
  const showHeader = depth > 0 || isSearchResult;
  const turboMode = useHistorianStore((s) => s.turboMode);
  const lastSplitAxis = useHistorianStore((s) => s.lastSplitAxis);
  const prefetched = useHistorianStore((s) => s.prefetchedSplits[node.id]);
  const prefetching = useHistorianStore((s) => s.prefetchingNodes[node.id]);

  // Reactive state for the expanded card
  const essayText = useHistorianStore((s) => s.essays[node.id]);
  const essayIsLoading = useHistorianStore((s) => s.essayLoading[node.id]);
  const nodeImage = useHistorianStore((s) => s.generatedImages[`node-${node.id}`]);
  const nodeImageLoading = useHistorianStore((s) => s.generatingImages[`node-${node.id}`]);
  const nodeMap = useHistorianStore((s) => s.generatedImages[`map-${node.id}`]);
  const nodeMapLoading = useHistorianStore((s) => s.generatingImages[`map-${node.id}`]);

  // In turbo mode, prefetch both splits for each child that's on the current path
  useEffect(() => {
    if (turboMode && isDeepest && hasChildren) {
      // Prefetch for all children at this level
      for (const child of node.children) {
        prefetchForNode(child);
      }
    }
  }, [turboMode, isDeepest, hasChildren, node.children]);

  // Also prefetch for the node itself when it's the deepest and has no children yet
  useEffect(() => {
    if (turboMode && isDeepest && !hasChildren && showHeader) {
      prefetchForNode(node);
    }
  }, [turboMode, isDeepest, hasChildren, showHeader, node]);

  // Prefetch for prefetched result cards (the cards shown in turbo preview)
  useEffect(() => {
    if (turboMode && isDeepest && !hasChildren && prefetched) {
      const allPrefetchedCards = [
        ...(prefetched.time ?? []),
        ...(prefetched.geo ?? []),
      ];
      for (const card of allPrefetchedCards) {
        prefetchForNode(card);
      }
    }
  }, [turboMode, isDeepest, hasChildren, prefetched]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      {/* Connector line from parent */}
      {depth > 0 && (
        <div className="absolute left-8 -top-6 w-0.5 h-6 bg-sepia/20" />
      )}

      {/* Expanded large card for the selected node */}
      {showHeader && (() => {
        const imageContext = `${node.title}. ${node.timeRange.start} to ${node.timeRange.end}, ${node.geographicScope}. ${node.summary}`;
        const mapContext = buildMapContext(node);

        return (
          <div className="mb-4">
            <div className="bg-white/70 backdrop-blur-sm border-2 border-sepia/20 rounded-2xl overflow-hidden shadow-xs">
              {/* Large image + map banners (if available) */}
              {(nodeImage || nodeMap) && (
                <div className={`flex gap-0 ${nodeImage && nodeMap ? "" : ""}`}>
                  {nodeImage && (
                    <div className="flex-1">
                      <ImagePlaceholder
                        contextText={imageContext}
                        cacheKey={`node-${node.id}`}
                        title={node.title}
                        timeRange={node.timeRange}
                        geographicScope={node.geographicScope}
                        summary={node.summary}
                      />
                    </div>
                  )}
                  {nodeMap && (
                    <div className="flex-1">
                      <ImagePlaceholder
                        contextText={mapContext}
                        cacheKey={`map-${node.id}`}
                        title={`Map: ${node.title}`}
                        timeRange={node.timeRange}
                        geographicScope={node.geographicScope}
                        summary={`Historical map of ${node.geographicScope}`}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="p-6">
                {/* Time range + scope badges */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-sepia/10 rounded-full text-[11px] font-mono text-ink/70">
                    {node.timeRange.start}
                  </span>
                  <span className="text-ink/30 text-xs">→</span>
                  <span className="px-2.5 py-0.5 bg-sepia/10 rounded-full text-[11px] font-mono text-ink/70">
                    {node.timeRange.end}
                  </span>
                  <span className="px-2.5 py-0.5 bg-crimson/10 text-crimson rounded-full text-[11px] font-mono">
                    📍 {node.geographicScope}
                  </span>
                  <span className="px-2 py-0.5 bg-ink/5 rounded-full text-[11px] font-mono text-ink/40">
                    Depth {node.depth}
                  </span>
                </div>

                {/* Title */}
                <h2 className="font-display text-2xl font-bold text-ink mb-2">
                  {node.title}
                </h2>

                {/* Summary */}
                <DefinableText
                  text={node.summary}
                  node={node}
                  className="font-serif text-sm text-ink/80 leading-relaxed"
                />

                {/* Essay (inline) — select a phrase to define */}
                {essayText && (
                  <div className="mt-4 pt-4 border-t border-sepia/15">
                    <DefinableText
                      text={essayText}
                      node={node}
                      className="font-serif text-sm text-ink/85 leading-relaxed whitespace-pre-wrap first-letter:text-4xl first-letter:font-display first-letter:text-sepia first-letter:float-left first-letter:mr-2 first-letter:mt-0.5"
                    />
                  </div>
                )}
                {essayIsLoading && (
                  <div className="mt-4 pt-4 border-t border-sepia/15 text-center">
                    <span className="text-sm text-sepia/60 font-serif italic">Writing essay...</span>
                  </div>
                )}

                {/* Action button grid */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4 pt-3 border-t border-sepia/10">
                  <button
                    onClick={() => onSplitTime(node)}
                    disabled={isLoading}
                    className="px-3 py-2 text-xs font-serif bg-navy text-white rounded-lg hover:bg-navy/80 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    ⏳ Time
                  </button>
                  <button
                    onClick={() => onSplitGeo(node)}
                    disabled={isLoading}
                    className="px-3 py-2 text-xs font-serif bg-crimson text-white rounded-lg hover:bg-crimson/80 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    🗺️ Geo
                  </button>
                  <button
                    onClick={() => generateImage(`node-${node.id}`, imageContext)}
                    disabled={isLoading || nodeImageLoading}
                    className="px-3 py-2 text-xs font-serif bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    {nodeImageLoading ? "🎨 ..." : nodeImage ? "🎨 Redo" : "🎨 Image"}
                  </button>
                  <button
                    onClick={() => generateImage(`map-${node.id}`, mapContext)}
                    disabled={isLoading || nodeMapLoading}
                    className="px-3 py-2 text-xs font-serif bg-teal-700 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    {nodeMapLoading ? "🗺️ ..." : nodeMap ? "🗺️ Redo" : "🗺️ Map"}
                  </button>
                  {!essayText && !essayIsLoading ? (
                    <button
                      onClick={() => onEssay(node)}
                      disabled={isLoading}
                      className="px-3 py-2 text-xs font-serif bg-sepia text-parchment rounded-lg hover:bg-brass transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      📝 Write Essay
                    </button>
                  ) : essayIsLoading ? (
                    <button
                      disabled
                      className="px-3 py-2 text-xs font-serif bg-sepia/50 text-parchment rounded-lg flex items-center justify-center gap-1.5 opacity-60"
                    >
                      📝 Writing...
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-3 py-2 text-xs font-serif bg-sepia/50 text-parchment rounded-lg flex items-center justify-center gap-1.5 opacity-60"
                    >
                      📝 Essay Ready
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Children grid (normal mode or already-committed split) */}
      {hasChildren && (
        <div className="mb-6">
          <NodeGrid
            nodes={node.children}
            onSplitTime={onSplitTime}
            onSplitGeo={onSplitGeo}
            onDrillDown={onSelectChild}
            onEssay={onEssay}
            onEnsureSelected={onEnsureSelected}
            isLoading={isLoading}
            splitAxis={node.splitAxis}
            selectedChildId={selectedChildId}
          />
        </div>
      )}

      {/* Turbo mode: show prefetched time + geo splits */}
      {turboMode && isDeepest && !hasChildren && (() => {
        // Order: show the user's preferred axis first
        const preferTime = lastSplitAxis === "time";
        const axes: { axis: "time" | "geo"; splitAxis: "time" | "geography"; icon: string; label: string }[] = [
          { axis: "time", splitAxis: "time", icon: "⏳", label: "Time Periods" },
          { axis: "geo", splitAxis: "geography", icon: "🗺️", label: "Geographic Regions" },
        ];
        if (!preferTime) axes.reverse();

        return (
          <div className="space-y-4 mb-6">
            {axes.map(({ axis, splitAxis, icon, label }) => {
              const data = prefetched?.[axis];
              const loading = prefetching?.[axis];
              if (data) {
                return (
                  <NodeGrid
                    key={axis}
                    nodes={data}
                    onSplitTime={onSplitTime}
                    onSplitGeo={onSplitGeo}
                    onDrillDown={onSelectChild}
                    onEssay={onEssay}
                    onEnsureSelected={onEnsureSelected}
                    isLoading={isLoading}
                    splitAxis={splitAxis}
                    horizontal
                    label={`${icon} ${data.length} ${label}`}
                  />
                );
              }
              if (loading) {
                return (
                  <div key={axis} className="flex items-center gap-2 px-1 text-sm text-sepia/50 font-serif">
                    <span className="animate-pulse">{icon}</span> Loading {label.toLowerCase()}...
                  </div>
                );
              }
              return null;
            })}
          </div>
        );
      })()}

      {/* Loading skeleton at the deepest level (non-turbo) */}
      {isLoading && isDeepest && !hasChildren && !turboMode && (
        <div className="mb-6">
          <LoadingSkeleton />
        </div>
      )}
    </motion.div>
  );
}

export default function Explorer() {
  const {
    tree,
    currentPath,
    currentNode,
    isLoading,
    setLoading,
    setChildren,
    navigateTo,
    findNode,
    turboMode,
    toggleTurbo,
    showDebug,
    debugPanelHeight,
    hydrateClientPrefs,
  } = useHistorianStore();

  const bottomRef = useRef<HTMLDivElement>(null);
  // Abort controller for direct (non-prefetch) API calls — replaced on each navigation
  const directCallController = useRef<AbortController | null>(null);

  // Cancel any in-flight direct calls
  const cancelDirectCalls = useCallback(() => {
    if (directCallController.current) {
      directCallController.current.abort();
      directCallController.current = null;
    }
  }, []);

  // Get a fresh signal for a new direct call
  const newDirectSignal = useCallback(() => {
    cancelDirectCalls();
    directCallController.current = new AbortController();
    return directCallController.current.signal;
  }, [cancelDirectCalls]);

  // Hydrate prefs from localStorage, then auto-split root with effective language
  useEffect(() => {
    hydrateClientPrefs();
    const state = useHistorianStore.getState();
    if (state.tree.id === "root" && state.tree.children.length === 0) {
      const lang = state.selectedLanguage;
      const phases = initialSplits[lang] ?? initialSplits.English;
      const children: HistoryNode[] = phases.map((phase) => ({
        id: v4(),
        title: phase.title,
        summary: phase.summary,
        timeRange: { start: phase.start, end: phase.end },
        geographicScope: state.tree.geographicScope,
        parentId: state.tree.id,
        children: [],
        splitAxis: null,
        depth: 1,
      }));
      setChildren(state.tree.id, children, "time");
    }
  }, [hydrateClientPrefs, setChildren]);

  // Auto-scroll to bottom when path changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [currentPath]);

  const handleSelectChild = useCallback(
    (childNode: HistoryNode) => {
      // Cancel ALL in-flight work — both prefetches and direct API calls
      cancelPrefetches(new Set([childNode.id]));
      cancelDirectCalls();

      // If this child is from a prefetched result (not yet in the tree),
      // we need to commit the prefetched split to the tree first
      const existingNode = findNode(childNode.id);
      if (!existingNode && childNode.parentId) {
        // This is a prefetched card — figure out which axis it came from
        const prefetched = useHistorianStore.getState().prefetchedSplits[childNode.parentId];
        if (prefetched) {
          const isTimeSplit = prefetched.time?.some((n) => n.id === childNode.id);
          const isGeoSplit = prefetched.geo?.some((n) => n.id === childNode.id);
          const axis = isTimeSplit ? "time" : isGeoSplit ? "geography" : null;
          const nodes = isTimeSplit ? prefetched.time : isGeoSplit ? prefetched.geo : null;
          if (axis && nodes) {
            setChildren(childNode.parentId, nodes, axis);
            // Remember which axis the user preferred
            useHistorianStore.getState().setLastSplitAxis(axis);
          }
        }
      }
      navigateTo(childNode.id);
    },
    [navigateTo, findNode, setChildren, cancelDirectCalls]
  );

  // Select (and commit prefetch into the tree) before card actions whose UI
  // lives on the expanded path node — or that call setChildren/navigateTo.
  const ensureNodeSelected = useCallback(
    (node: HistoryNode) => {
      if (needsExpandForAction(node.id, useHistorianStore.getState().currentPath)) {
        handleSelectChild(node);
      }
    },
    [handleSelectChild]
  );

  const handleSplitTime = useCallback(
    async (node: HistoryNode) => {
      ensureNodeSelected(node);
      // Re-read after possible prefetch commit
      node = useHistorianStore.getState().findNode(node.id) ?? node;

      if (node.children.length > 0 && node.splitAxis === "time") {
        navigateTo(node.id);
        return;
      }

      // In turbo mode: cancel all prefetches and use cached result if available
      if (turboMode) {
        cancelPrefetches(new Set([node.id]));
        const prefetched = useHistorianStore.getState().prefetchedSplits[node.id];
        if (prefetched?.time) {
          setChildren(node.id, prefetched.time, "time");
          useHistorianStore.getState().setLastSplitAxis("time");
          navigateTo(node.id);
          return;
        }
      }

      setLoading(true);
      const signal = newDirectSignal();
      const store = useHistorianStore.getState();
      const debugId = store.startDebugEntry({ action: "split-time", model: store.selectedModel, prompt: `Split by time: ${node.title}`, nodeTitle: node.title, nodeDepth: node.depth });
      try {
        const res = await fetch("/api/explore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "split-time", node: slimNode(node), model: store.selectedModel, language: store.selectedLanguage }),
          signal,
        });
        const data = (await res.json()) as ApiResult<SplitByTimeResponse>;
        if (data.error) throw new Error(data.error);

        useHistorianStore.getState().completeDebugEntry(debugId, data);

        const children: HistoryNode[] = data.phases.map((phase) => ({
          id: v4(),
          title: phase.title,
          summary: phase.summary,
          timeRange: { start: phase.start, end: phase.end },
          geographicScope: node.geographicScope,
          parentId: node.id,
          children: [],
          splitAxis: null,
          depth: node.depth + 1,
        }));

        setChildren(node.id, children, "time");
        useHistorianStore.getState().setLastSplitAxis("time");
        navigateTo(node.id);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          useHistorianStore.getState().completeDebugEntry(debugId, {}, "Cancelled — user navigated away");
          return;
        }
        console.error("Split by time failed:", err);
        useHistorianStore.getState().completeDebugEntry(debugId, {}, err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setChildren, navigateTo, turboMode, newDirectSignal, ensureNodeSelected]
  );

  const handleSplitGeo = useCallback(
    async (node: HistoryNode) => {
      ensureNodeSelected(node);
      node = useHistorianStore.getState().findNode(node.id) ?? node;

      if (node.children.length > 0 && node.splitAxis === "geography") {
        navigateTo(node.id);
        return;
      }

      if (turboMode) {
        cancelPrefetches(new Set([node.id]));
        const prefetched = useHistorianStore.getState().prefetchedSplits[node.id];
        if (prefetched?.geo) {
          setChildren(node.id, prefetched.geo, "geography");
          useHistorianStore.getState().setLastSplitAxis("geography");
          navigateTo(node.id);
          return;
        }
      }

      setLoading(true);
      const signal = newDirectSignal();
      const store = useHistorianStore.getState();
      const debugId = store.startDebugEntry({ action: "split-geography", model: store.selectedModel, prompt: `Split by geo: ${node.title}`, nodeTitle: node.title, nodeDepth: node.depth });
      try {
        const res = await fetch("/api/explore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "split-geography", node: slimNode(node), model: store.selectedModel, language: store.selectedLanguage }),
          signal,
        });
        const data = (await res.json()) as ApiResult<SplitByGeoResponse>;
        if (data.error) throw new Error(data.error);

        useHistorianStore.getState().completeDebugEntry(debugId, data);

        const children: HistoryNode[] = data.regions.map((region) => ({
          id: v4(),
          title: region.regionName,
          summary: region.summary,
          timeRange: { ...node.timeRange },
          geographicScope: region.regionName,
          parentId: node.id,
          children: [],
          splitAxis: null,
          depth: node.depth + 1,
        }));

        setChildren(node.id, children, "geography");
        useHistorianStore.getState().setLastSplitAxis("geography");
        navigateTo(node.id);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          useHistorianStore.getState().completeDebugEntry(debugId, {}, "Cancelled — user navigated away");
          return;
        }
        console.error("Split by geo failed:", err);
        useHistorianStore.getState().completeDebugEntry(debugId, {}, err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setChildren, navigateTo, turboMode, newDirectSignal, ensureNodeSelected]
  );

  const handleEssay = useCallback(
    async (node: HistoryNode) => {
      ensureNodeSelected(node);

      const store = useHistorianStore.getState();
      if (store.essays[node.id] || store.essayLoading[node.id]) return;
      store.setEssayLoading(node.id, true);
      const debugId = store.startDebugEntry({ action: "essay", model: store.selectedModel, prompt: `Essay: ${node.title}`, nodeTitle: node.title, nodeDepth: node.depth });
      try {
        const res = await fetch("/api/explore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "essay",
            node: slimNode(node),
            model: store.selectedModel,
            language: store.selectedLanguage,
            ...(isPromptStyleOverride("essayStyle", store.essayStyle)
              ? { essayStyle: store.essayStyle }
              : {}),
          }),
        });
        const data = (await res.json()) as ApiResult<EssayResponse>;
        if (data.error) throw new Error(data.error);

        useHistorianStore.getState().completeDebugEntry(debugId, data);
        useHistorianStore.getState().setEssay(node.id, data.essay);
      } catch (err) {
        console.error("Essay generation failed:", err);
        useHistorianStore.getState().completeDebugEntry(debugId, {}, err instanceof Error ? err.message : "Unknown error");
        useHistorianStore.getState().setEssay(node.id, "Failed to generate essay. Please try again.");
      } finally {
        useHistorianStore.getState().setEssayLoading(node.id, false);
      }
    },
    [ensureNodeSelected]
  );

  // Build the vertical thread: walk the currentPath and resolve each node
  const levels: { node: HistoryNode; selectedChildId: string | null }[] = [];
  for (let i = 0; i < currentPath.length; i++) {
    const nodeId = currentPath[i];
    const node = nodeId === undefined ? null : findNode(nodeId);
    if (!node) break;
    const selectedChildId = currentPath[i + 1] ?? null;
    levels.push({ node, selectedChildId });
  }

  return (
    <div
      className="min-h-screen bg-linear-to-b from-parchment via-parchment to-amber-50/50"
      style={{ paddingBottom: showDebug ? debugPanelHeight + 40 : 0 }}
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-parchment/90 backdrop-blur-md border-b border-sepia/10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h1
              className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight flex items-center gap-2 cursor-pointer"
              onClick={() => navigateTo("root")}
            >
              <span className="text-3xl">📚</span>
              <span className="bg-linear-to-r from-ink to-sepia bg-clip-text text-transparent">
                Super Historian
              </span>
            </h1>
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-xs text-sepia/60 font-serif">
                Depth: {currentNode.depth} | Nodes: {countNodes(tree)}
              </span>
              <ModelSelector />
              <ImageModelSelector />
              <LanguageSelector />
              <Link
                href="/prompts"
                className="px-3 py-1.5 text-xs font-mono text-sepia border border-sepia/30 rounded-lg hover:bg-sepia/10 transition-colors"
              >
                Prompts
              </Link>
              <button
                onClick={toggleTurbo}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors ${
                  turboMode
                    ? "bg-navy text-white border-navy"
                    : "text-sepia border-sepia/30 hover:bg-sepia/10"
                }`}
              >
                {turboMode ? "TURBO ON" : "TURBO"}
              </button>
            </div>
          </div>
          <SearchBar />
          {/* Breadcrumb trail - compact */}
          {currentPath.length > 1 && (
            <div className="flex items-center gap-1 mt-2 overflow-x-auto text-xs font-serif text-sepia/60 pb-1">
              {levels.map((level, i) => (
                <span key={level.node.id} className="flex items-center gap-1 shrink-0">
                  {i > 0 && <span className="text-sepia/30">›</span>}
                  <button
                    onClick={() => navigateTo(level.node.id)}
                    className={`hover:text-ink transition-colors truncate max-w-[150px] ${
                      i === levels.length - 1 ? "text-ink font-semibold" : ""
                    }`}
                  >
                    {level.node.title}
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main content — vertical exploration thread */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Root hero — only for the original "History of Earth" root before it has children */}
        {tree.id === "root" && tree.children.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-8xl mb-6"
            >
              🌍
            </motion.div>
            <h2 className="font-display text-3xl font-bold text-ink mb-4">
              {tree.title}
            </h2>
            <DefinableText
              text={tree.summary}
              node={tree}
              className="font-serif text-ink/70 max-w-lg mb-8 text-lg leading-relaxed"
            />
            <button
              onClick={() => void handleSplitTime(tree)}
              className="px-8 py-4 bg-navy text-white font-display text-lg rounded-2xl hover:bg-navy/80 transition-all hover:scale-105 shadow-lg"
            >
              ⏳ Begin the Journey
            </button>
          </div>
        )}

        {/* Vertical thread of exploration levels */}
        {levels.map((level, i) => {
          // Only show levels that have children (or are loading at the deepest)
          const hasContent = level.node.children.length > 0;
          const isDeepest = i === levels.length - 1;
          if (!hasContent && !isDeepest) return null;

          return (
            <ExplorationLevel
              key={level.node.id}
              node={level.node}
              selectedChildId={level.selectedChildId}
              depth={i}
              onSplitTime={(n) => void handleSplitTime(n)}
              onSplitGeo={(n) => void handleSplitGeo(n)}
              onSelectChild={handleSelectChild}
              onEssay={(n) => void handleEssay(n)}
              onEnsureSelected={ensureNodeSelected}
              isLoading={isLoading}
              isDeepest={isDeepest}
            />
          );
        })}

        <div ref={bottomRef} />
      </main>


      {/* Debug Panel */}
      <DebugPanel />

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-sepia/40 font-serif">
        Super Historian — Explore the infinite depth of history
        <span className="ml-2 font-mono" title="Running version">· {APP_VERSION}</span>
      </footer>
    </div>
  );
}

function countNodes(node: HistoryNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}
