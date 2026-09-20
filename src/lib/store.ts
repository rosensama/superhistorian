"use client";

import { create } from "zustand";
import { HistoryNode, DebugEntry } from "./types";
import { normalizeTerm } from "./define-text";

interface HistorianState {
  // The entire exploration tree
  tree: HistoryNode;
  // Path from root to currently viewed node (array of IDs)
  currentPath: string[];
  // Currently selected node
  currentNode: HistoryNode;
  // Loading state
  isLoading: boolean;
  // Essay state (per-node)
  essays: Record<string, string>;       // nodeId → essay text
  essayLoading: Record<string, boolean>; // nodeId → loading
  // Definitions for selected phrases (per-node, survives while session/content in memory)
  definitions: Record<string, Record<string, { term: string; definition: string }>>; // nodeId → normTerm → def
  definitionLoading: Record<string, boolean>; // `${nodeId}::${normTerm}` → loading
  // Search state
  searchNode: HistoryNode | null;
  // Model selection
  selectedModel: string;
  selectedImageModel: string;
  selectedLanguage: string;
  // Turbo mode
  turboMode: boolean;
  lastSplitAxis: "time" | "geography";
  // Prefetched splits: nodeId → { time: HistoryNode[], geo: HistoryNode[] }
  prefetchedSplits: Record<string, { time?: HistoryNode[]; geo?: HistoryNode[] }>;
  prefetchingNodes: Record<string, { time?: boolean; geo?: boolean; startedAt?: number }>;
  cancelledNodes: Record<string, boolean>;
  // Debug log
  debugLog: DebugEntry[];
  showDebug: boolean;
  debugPanelHeight: number;
  // Generated images cache & state
  generatedImages: Record<string, string>; // key → data URL or base64
  generatingImages: Record<string, boolean>; // key → currently generating
  imageErrors: Record<string, string>; // key → error message

  // Actions
  setChildren: (nodeId: string, children: HistoryNode[], splitAxis: "time" | "geography") => void;
  navigateTo: (nodeId: string) => void;
  navigateToPath: (path: string[]) => void;
  goBack: () => void;
  setLoading: (loading: boolean) => void;
  setEssay: (nodeId: string, essay: string | null) => void;
  setEssayLoading: (nodeId: string, loading: boolean) => void;
  setDefinition: (nodeId: string, term: string, definition: string) => void;
  setDefinitionLoading: (nodeId: string, normTerm: string, loading: boolean) => void;
  setSearchNode: (node: HistoryNode | null) => void;
  setTree: (node: HistoryNode) => void;
  setSelectedModel: (model: string) => void;
  setSelectedImageModel: (model: string) => void;
  setSelectedLanguage: (lang: string) => void;
  setGeneratedImage: (key: string, url: string) => void;
  clearGeneratedImage: (key: string) => void;
  setGeneratingImage: (key: string, generating: boolean) => void;
  setImageError: (key: string, error: string | null) => void;
  toggleTurbo: () => void;
  setLastSplitAxis: (axis: "time" | "geography") => void;
  setPrefetchedSplit: (nodeId: string, axis: "time" | "geo", nodes: HistoryNode[]) => void;
  setPrefetching: (nodeId: string, axis: "time" | "geo", loading: boolean) => void;
  setCancelled: (nodeIds: string[]) => void;
  addDebugEntry: (entry: Omit<DebugEntry, "id" | "timestamp" | "completedAt" | "error"> & { response: Record<string, unknown> | null }) => string;
  startDebugEntry: (entry: { action: string; model: string; prompt: string; nodeTitle?: string; nodeDepth?: number }) => string;
  completeDebugEntry: (id: string, response: Record<string, unknown>, error?: string) => void;
  toggleDebug: () => void;
  setDebugPanelHeight: (height: number) => void;
  findNode: (nodeId: string) => HistoryNode | null;
}

const ROOT_NODE: HistoryNode = {
  id: "root",
  title: "History of Earth",
  summary:
    "From a molten ball of rock to a pale blue dot teeming with life and civilization — 4.5 billion years of drama, evolution, and human ambition.",
  timeRange: { start: "4.5 billion years ago", end: "Present" },
  geographicScope: "Global",
  parentId: null,
  children: [],
  splitAxis: null,
  depth: 0,
};

function findNodeInTree(node: HistoryNode, id: string): HistoryNode | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNodeInTree(child, id);
    if (found) return found;
  }
  return null;
}

function findPathToNode(node: HistoryNode, id: string, path: string[] = []): string[] | null {
  const newPath = [...path, node.id];
  if (node.id === id) return newPath;
  for (const child of node.children) {
    const found = findPathToNode(child, id, newPath);
    if (found) return found;
  }
  return null;
}

function updateNodeInTree(tree: HistoryNode, nodeId: string, updater: (n: HistoryNode) => HistoryNode): HistoryNode {
  if (tree.id === nodeId) return updater(tree);
  return {
    ...tree,
    children: tree.children.map((child) => updateNodeInTree(child, nodeId, updater)),
  };
}

export const useHistorianStore = create<HistorianState>((set, get) => ({
  tree: ROOT_NODE,
  currentPath: ["root"],
  currentNode: ROOT_NODE,
  isLoading: false,
  essays: {},
  essayLoading: {},
  definitions: {},
  definitionLoading: {},
  searchNode: null,
  selectedModel: "openai/gpt-5-nano",
  selectedImageModel: "google/gemini-3.1-flash-image",
  selectedLanguage: "English",
  turboMode: true,
  lastSplitAxis: "time" as "time" | "geography",
  prefetchedSplits: {},
  prefetchingNodes: {},
  cancelledNodes: {},
  debugLog: [],
  showDebug: false,
  debugPanelHeight: 320,
  generatedImages: {},
  generatingImages: {},
  imageErrors: {},

  setChildren: (nodeId, children, splitAxis) => {
    set((state) => {
      const newTree = updateNodeInTree(state.tree, nodeId, (n) => ({
        ...n,
        children,
        splitAxis,
      }));
      const currentNode = findNodeInTree(newTree, state.currentNode.id) || newTree;
      return { tree: newTree, currentNode };
    });
  },

  navigateTo: (nodeId) => {
    const state = get();
    const node = findNodeInTree(state.tree, nodeId);
    if (!node) return;
    const path = findPathToNode(state.tree, nodeId);
    if (!path) return;
    set({ currentNode: node, currentPath: path });
  },

  navigateToPath: (path) => {
    const state = get();
    const nodeId = path[path.length - 1];
    const node = findNodeInTree(state.tree, nodeId);
    if (!node) return;
    set({ currentNode: node, currentPath: path });
  },

  goBack: () => {
    const state = get();
    if (state.currentPath.length <= 1) return;
    const parentPath = state.currentPath.slice(0, -1);
    const parentId = parentPath[parentPath.length - 1];
    const parent = findNodeInTree(state.tree, parentId);
    if (parent) {
      set({ currentNode: parent, currentPath: parentPath });
    }
  },

  setLoading: (isLoading) => set({ isLoading }),
  setEssay: (nodeId, essay) =>
    set((state) => ({
      essays: { ...state.essays, [nodeId]: essay || "" },
    })),
  setEssayLoading: (nodeId, loading) =>
    set((state) => ({
      essayLoading: { ...state.essayLoading, [nodeId]: loading },
    })),
  setDefinition: (nodeId, term, definition) => {
    const norm = normalizeTerm(term);
    if (!norm) return;
    set((state) => ({
      definitions: {
        ...state.definitions,
        [nodeId]: {
          ...state.definitions[nodeId],
          [norm]: { term: term.trim().replace(/\s+/g, " "), definition },
        },
      },
    }));
  },
  setDefinitionLoading: (nodeId, normTerm, loading) =>
    set((state) => ({
      definitionLoading: {
        ...state.definitionLoading,
        [`${nodeId}::${normTerm}`]: loading,
      },
    })),
  setSearchNode: (searchNode) => set({ searchNode }),
  setTree: (node) => set({ tree: node, currentNode: node, currentPath: [node.id] }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setSelectedImageModel: (selectedImageModel) => set({ selectedImageModel }),
  setSelectedLanguage: (selectedLanguage) => set({ selectedLanguage }),
  setGeneratedImage: (key, url) =>
    set((state) => ({
      generatedImages: { ...state.generatedImages, [key]: url },
      generatingImages: { ...state.generatingImages, [key]: false },
      imageErrors: { ...state.imageErrors, [key]: undefined as unknown as string },
    })),
  clearGeneratedImage: (key) =>
    set((state) => {
      const generatedImages = { ...state.generatedImages };
      delete generatedImages[key];
      return { generatedImages };
    }),
  setGeneratingImage: (key, generating) =>
    set((state) => ({
      generatingImages: { ...state.generatingImages, [key]: generating },
      ...(generating ? { imageErrors: { ...state.imageErrors, [key]: undefined as unknown as string } } : {}),
    })),
  setImageError: (key, error) =>
    set((state) => ({
      imageErrors: { ...state.imageErrors, [key]: error || (undefined as unknown as string) },
      generatingImages: { ...state.generatingImages, [key]: false },
    })),
  toggleTurbo: () => set((state) => ({ turboMode: !state.turboMode })),
  setLastSplitAxis: (lastSplitAxis) => set({ lastSplitAxis }),
  setPrefetchedSplit: (nodeId, axis, nodes) =>
    set((state) => ({
      prefetchedSplits: {
        ...state.prefetchedSplits,
        [nodeId]: { ...state.prefetchedSplits[nodeId], [axis]: nodes },
      },
      prefetchingNodes: {
        ...state.prefetchingNodes,
        [nodeId]: { ...state.prefetchingNodes[nodeId], [axis]: false },
      },
    })),
  setPrefetching: (nodeId, axis, loading) =>
    set((state) => {
      const existing = state.prefetchingNodes[nodeId];
      return {
        prefetchingNodes: {
          ...state.prefetchingNodes,
          [nodeId]: {
            ...existing,
            [axis]: loading,
            startedAt: loading && !existing?.startedAt ? Date.now() : existing?.startedAt,
          },
        },
      };
    }),
  setCancelled: (nodeIds) =>
    set((state) => {
      const updated = { ...state.cancelledNodes };
      for (const id of nodeIds) updated[id] = true;
      return { cancelledNodes: updated };
    }),
  addDebugEntry: (entry) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({
      debugLog: [
        { ...entry, id, timestamp: Date.now(), completedAt: entry.response ? Date.now() : null, error: null, nodeTitle: entry.nodeTitle || "", nodeDepth: entry.nodeDepth ?? -1 },
        ...state.debugLog,
      ].slice(0, 50),
    }));
    return id;
  },
  startDebugEntry: (entry) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({
      debugLog: [
        { ...entry, id, timestamp: Date.now(), response: null, completedAt: null, error: null, nodeTitle: entry.nodeTitle || "", nodeDepth: entry.nodeDepth ?? -1 },
        ...state.debugLog,
      ].slice(0, 50),
    }));
    return id;
  },
  completeDebugEntry: (id, response, error) =>
    set((state) => ({
      debugLog: state.debugLog.map((e) =>
        e.id === id ? { ...e, response, completedAt: Date.now(), error: error || null } : e
      ),
    })),
  toggleDebug: () => set((state) => ({ showDebug: !state.showDebug })),
  setDebugPanelHeight: (debugPanelHeight) => set({ debugPanelHeight }),

  findNode: (nodeId) => {
    return findNodeInTree(get().tree, nodeId);
  },
}));
