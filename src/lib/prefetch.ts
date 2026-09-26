// Turbo mode prefetching: fire time + geo splits for a node in the background
// Uses a concurrency queue with AbortController support to cancel stale requests.
import { useHistorianStore } from "./store";
import { HistoryNode, SplitResult } from "./types";
import { v4 } from "./uuid";
import { slimNode } from "./slim-node";

const MAX_CONCURRENT = 6;
let activeCount = 0;
const queue: (() => void)[] = [];
const activeControllers = new Map<string, AbortController>(); // key → controller

// Timing stats
const recentDurations: number[] = []; // last N response times in ms
const MAX_DURATION_SAMPLES = 20;

export function getAvgDurationMs(): number {
  if (recentDurations.length === 0) return 3000; // default estimate
  return recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length;
}

function recordDuration(ms: number) {
  recentDurations.push(ms);
  if (recentDurations.length > MAX_DURATION_SAMPLES) recentDurations.shift();
}

function jobKey(nodeId: string, axis: string) {
  return `${nodeId}:${axis}`;
}

function enqueue(key: string, fn: (signal: AbortSignal) => Promise<void>) {
  // If already has a controller for this key, skip (already in-flight)
  if (activeControllers.has(key)) return;

  const controller = new AbortController();
  activeControllers.set(key, controller);

  const run = () => {
    // Check if cancelled before starting
    if (controller.signal.aborted) {
      activeControllers.delete(key);
      const next = queue.shift();
      if (next) next();
      return;
    }

    activeCount++;
    void fn(controller.signal).finally(() => {
      activeCount = Math.max(0, activeCount - 1);
      activeControllers.delete(key);
      const next = queue.shift();
      if (next) next();
    });
  };

  if (activeCount < MAX_CONCURRENT) {
    run();
  } else {
    queue.push(run);
  }
}

// Cancel all in-flight and queued prefetches, optionally keeping specific node IDs
export function cancelPrefetches(keepNodeIds?: Set<string>) {
  // Abort all active controllers except those for kept nodes
  const keys = Array.from(activeControllers.keys());
  let keptCount = 0;
  for (const key of keys) {
    const [nodeId = ""] = key.split(":");
    if (keepNodeIds?.has(nodeId)) {
      keptCount++;
    } else {
      activeControllers.get(key)?.abort();
      activeControllers.delete(key);
    }
  }

  // Reset activeCount to only reflect kept in-flight requests
  activeCount = keptCount;

  // Clear the queue (queued items will check aborted before running)
  queue.length = 0;

  // Clear prefetching flags for cancelled nodes and mark them as cancelled
  const state = useHistorianStore.getState();
  const cancelledIds: string[] = [];
  for (const nodeId of Object.keys(state.prefetchingNodes)) {
    if (!keepNodeIds?.has(nodeId)) {
      state.setPrefetching(nodeId, "time", false);
      state.setPrefetching(nodeId, "geo", false);
      cancelledIds.push(nodeId);
    }
  }
  if (cancelledIds.length > 0) {
    state.setCancelled(cancelledIds);
  }
}

function prefetchSplit(node: HistoryNode, axis: "time" | "geo") {
  const store = useHistorianStore.getState();

  // Skip if already prefetched or prefetching
  if (store.prefetchedSplits[node.id]?.[axis]) return;
  if (store.prefetchingNodes[node.id]?.[axis]) return;

  store.setPrefetching(node.id, axis, true);

  const action = axis === "time" ? "split-time" : "split-geography";
  const key = jobKey(node.id, axis);
  const resolvedModel = store.selectedModel;
  const debugId = store.startDebugEntry({
    action: `prefetch-${action}`,
    model: resolvedModel,
    prompt: `Prefetch ${axis}: ${node.title}`,
    nodeTitle: node.title,
    nodeDepth: node.depth,
  });

  const startTime = Date.now();
  const CLIENT_TIMEOUT_MS = 95_000; // slightly longer than server's 90s to let server timeout first

  enqueue(key, (cancelSignal: AbortSignal) => {
    // Compose cancellation signal with a timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    // If the cancellation signal fires, also abort
    const onCancel = () => controller.abort();
    cancelSignal.addEventListener("abort", onCancel);

    return fetch("/api/explore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        node: slimNode(node),
        model: resolvedModel,
        language: useHistorianStore.getState().selectedLanguage,
      }),
      signal: controller.signal,
    })
      .then((res) => res.json() as Promise<SplitResult>)
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.error) throw new Error(data.error);

        useHistorianStore.getState().completeDebugEntry(debugId, data);

        let children: HistoryNode[];
        if (axis === "time" && data.phases) {
          children = data.phases.map((phase) => ({
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
        } else if (axis === "geo" && data.regions) {
          children = data.regions.map((region) => ({
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
        } else {
          throw new Error("Unexpected response shape");
        }

        recordDuration(Date.now() - startTime);
        useHistorianStore.getState().setPrefetchedSplit(node.id, axis, children);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Could be cancellation or timeout — check which
          const reason = cancelSignal.aborted ? "Cancelled" : `Timeout: no response within ${CLIENT_TIMEOUT_MS / 1000}s`;
          useHistorianStore.getState().completeDebugEntry(debugId, {}, reason);
          if (!cancelSignal.aborted) {
            useHistorianStore.getState().setPrefetching(node.id, axis, false);
          }
          return;
        }
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`Prefetch ${axis} failed for ${node.title}:`, err);
        useHistorianStore.getState().completeDebugEntry(debugId, {}, errMsg);
        useHistorianStore.getState().setPrefetching(node.id, axis, false);
      })
      .finally(() => {
        clearTimeout(timer);
        cancelSignal.removeEventListener("abort", onCancel);
      });
  });
}

export function prefetchForNode(node: HistoryNode) {
  prefetchSplit(node, "time");
  prefetchSplit(node, "geo");
}
