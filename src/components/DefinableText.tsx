"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HistoryNode } from "@/lib/types";
import { useHistorianStore } from "@/lib/store";
import { slimNode } from "@/lib/slim-node";
import { normalizeTerm, segmentDefinedTerms } from "@/lib/define-text";

interface DefinableTextProps {
  text: string;
  node: HistoryNode;
  className?: string;
}

export default function DefinableText({ text, node, className }: DefinableTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const definitions = useHistorianStore((s) => s.definitions[node.id]);
  const setDefinition = useHistorianStore((s) => s.setDefinition);
  const setDefinitionLoading = useHistorianStore((s) => s.setDefinitionLoading);
  const definitionLoading = useHistorianStore((s) => s.definitionLoading);

  const [pending, setPending] = useState<{
    term: string;
    context: string;
    x: number;
    y: number;
  } | null>(null);
  const [openNorm, setOpenNorm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const termList = useMemo(() => {
    if (!definitions) return [];
    return Object.entries(definitions).map(([norm, d]) => ({ norm, term: d.term }));
  }, [definitions]);

  const segments = useMemo(() => segmentDefinedTerms(text, termList), [text, termList]);

  const clearPending = useCallback(() => {
    setPending(null);
    setError(null);
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      clearPending();
      setOpenNorm(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [clearPending]);

  const onMouseUp = (e: React.MouseEvent) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) return;
    if (!containerRef.current.contains(sel.anchorNode) || !containerRef.current.contains(sel.focusNode)) {
      return;
    }
    const term = sel.toString().replace(/\s+/g, " ").trim();
    if (!term || term.length > 80 || term.split(/\s+/).length > 8) {
      clearPending();
      return;
    }
    e.stopPropagation();
    const norm = normalizeTerm(term);
    if (definitions?.[norm]) {
      setOpenNorm(norm);
      clearPending();
      sel.removeAllRanges();
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const parentRect = containerRef.current.getBoundingClientRect();
    setOpenNorm(null);
    setError(null);
    setPending({
      term,
      context: text,
      x: rect.left - parentRect.left + rect.width / 2,
      y: rect.bottom - parentRect.top + 6,
    });
  };

  const requestDefine = async () => {
    if (!pending) return;
    const term = pending.term;
    const norm = normalizeTerm(term);
    const loadKey = `${node.id}::${norm}`;
    if (definitions?.[norm] || definitionLoading[loadKey]) return;

    setDefinitionLoading(node.id, norm, true);
    const store = useHistorianStore.getState();
    const debugId = store.startDebugEntry({
      action: "define",
      model: store.selectedModel,
      prompt: `Define: ${term}`,
      nodeTitle: node.title,
      nodeDepth: node.depth,
    });
    try {
      const res = await fetch("/api/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "define",
          term,
          context: pending.context,
          node: slimNode(node),
          model: store.selectedModel,
          language: store.selectedLanguage,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      useHistorianStore.getState().completeDebugEntry(debugId, data);
      setDefinition(node.id, term, data.definition);
      setOpenNorm(norm);
      clearPending();
      window.getSelection()?.removeAllRanges();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Definition failed";
      useHistorianStore.getState().completeDebugEntry(debugId, {}, msg);
      setError(msg);
    } finally {
      setDefinitionLoading(node.id, norm, false);
    }
  };

  const openDef = openNorm && definitions?.[openNorm] ? definitions[openNorm] : null;
  const pendingLoading = pending
    ? definitionLoading[`${node.id}::${normalizeTerm(pending.term)}`]
    : false;

  return (
    <div
      ref={containerRef}
      className={`relative ${className || ""}`}
      onMouseUp={onMouseUp}
      onClick={(e) => {
        const sel = window.getSelection();
        if ((sel && !sel.isCollapsed) || pending || openNorm) e.stopPropagation();
      }}
    >
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenNorm(seg.norm);
              clearPending();
            }}
            className="defined-term bg-brass/15 border-b border-dotted border-brass/70 text-ink px-0.5 rounded-sm hover:bg-brass/25 cursor-pointer"
            title="Show definition"
          >
            {seg.value}
          </button>
        )
      )}

      {pending && (
        <div
          className="absolute z-20 -translate-x-1/2"
          style={{ left: pending.x, top: pending.y }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              requestDefine();
            }}
            disabled={pendingLoading}
            className="px-2.5 py-1 text-xs font-serif bg-navy text-white rounded-md shadow-md hover:bg-navy/80 disabled:opacity-50"
          >
            {pendingLoading
              ? "Defining…"
              : `Define “${pending.term.slice(0, 24)}${pending.term.length > 24 ? "…" : ""}”`}
          </button>
          {error && (
            <p className="mt-1 text-[11px] text-crimson font-serif bg-white/90 px-2 py-1 rounded">
              {error}
            </p>
          )}
        </div>
      )}

      {openDef && (
        <div
          className="mt-3 p-3 rounded-lg border border-brass/30 bg-amber-50/80 text-sm font-serif text-ink/85 leading-relaxed"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="text-[11px] uppercase tracking-wide text-sepia/70 mb-1">{openDef.term}</div>
          <p>{openDef.definition}</p>
          <button
            type="button"
            className="mt-2 text-[11px] text-sepia/60 hover:text-sepia"
            onClick={() => setOpenNorm(null)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
