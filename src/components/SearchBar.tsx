"use client";

import { useState } from "react";
import { useHistorianStore } from "@/lib/store";
import { ApiResult, HistoryNode, JumpToTopicResponse } from "@/lib/types";
import { v4 } from "@/lib/uuid";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { setTree } = useHistorianStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    const store = useHistorianStore.getState();
    const debugId = store.startDebugEntry({ action: "jump-to-topic", model: store.selectedModel, prompt: `Search: ${query.trim()}`, nodeTitle: query.trim(), nodeDepth: 0 });
    try {
      const res = await fetch("/api/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "jump-to-topic", query: query.trim(), model: store.selectedModel, language: store.selectedLanguage }),
      });
      const data = (await res.json()) as ApiResult<JumpToTopicResponse>;
      if (data.error) throw new Error(data.error);

      useHistorianStore.getState().completeDebugEntry(debugId, data);

      // Create a new root node from the search result
      const newRoot: HistoryNode = {
        id: v4(),
        title: data.title,
        summary: data.summary,
        timeRange: { start: data.start, end: data.end },
        geographicScope: data.geographicScope,
        parentId: null,
        children: [],
        splitAxis: null,
        depth: 0,
      };

      // Replace the tree with this new root
      setTree(newRoot);
      setQuery("");
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSearch(e)} className="relative">
      <div className="flex items-center bg-white/80 backdrop-blur border-2 border-sepia/20 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow focus-within:border-sepia/50 focus-within:shadow-md">
        <span className="pl-4 text-sepia/60 text-lg">&#x1F50D;</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Jump to a topic... (e.g. "Roman Empire", "Silk Road")'
          className="w-full px-3 py-3 bg-transparent outline-none text-ink font-serif placeholder:text-sepia/40 text-sm sm:text-base"
        />
        <button
          type="submit"
          disabled={!query.trim() || isSearching}
          className="px-5 py-3 bg-sepia text-parchment font-serif font-semibold text-sm hover:bg-brass transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isSearching ? "Searching..." : "Explore"}
        </button>
      </div>
    </form>
  );
}
