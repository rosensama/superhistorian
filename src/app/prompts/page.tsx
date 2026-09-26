"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useHistorianStore } from "@/lib/store";
import {
  isPromptStyleOverride,
  PROMPT_STYLE_DEFAULTS,
  type PromptStyleKey,
} from "@/lib/client-prefs";
import {
  buildDefinePrompt,
  buildEssayPrompt,
  DEFINE_JSON_FOOTER,
  defineContextBlock,
  ESSAY_JSON_FOOTER,
  essayContextBlock,
  SAMPLE_DEFINE_CONTEXT,
  SAMPLE_DEFINE_TERM,
  SAMPLE_DEFINE_TOPIC,
  SAMPLE_PROMPT_NODE,
} from "@/lib/prompts";

function PromptStyleEditor({
  title,
  prefKey,
  style,
  onChange,
  onReset,
  scaffolding,
  preview,
}: {
  title: string;
  prefKey: PromptStyleKey;
  style: string;
  onChange: (value: string) => void;
  onReset: () => void;
  scaffolding: string;
  preview: string;
}) {
  const overridden = isPromptStyleOverride(prefKey, style);
  const [draft, setDraft] = useState(style);
  const [syncedStyle, setSyncedStyle] = useState(style);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Adopt external changes (reset, hydration) — adjusted during render instead of in an effect
  if (style !== syncedStyle) {
    setSyncedStyle(style);
    setDraft(style);
  }

  useEffect(() => {
    if (draft === style) return;
    const timer = setTimeout(() => onChange(draft), 300);
    return () => clearTimeout(timer);
  }, [draft, style, onChange]);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
        {overridden && (
          <span className="inline-flex items-center gap-0.5 shrink-0">
            <span className="text-[10px] leading-none text-navy" aria-hidden>
              ✦
            </span>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm bg-red-600 text-white text-[9px] leading-none hover:bg-red-700"
              aria-label="Reset to default"
              title="Reset to default"
            >
              ×
            </button>
          </span>
        )}
      </div>

      <div>
        <p className="text-xs font-mono text-sepia/50 mb-1">Context (read-only)</p>
        <pre className="whitespace-pre-wrap rounded-lg border border-sepia/15 bg-sepia/5 px-3 py-2 text-xs font-mono text-sepia/70">
          {scaffolding}
        </pre>
      </div>

      <div>
        <label className="text-xs font-mono text-sepia/70 mb-1 block" htmlFor={`style-${prefKey}`}>
          Instruction / style (editable)
        </label>
        <textarea
          id={`style-${prefKey}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={`w-full min-h-[12rem] resize-y rounded-lg border px-3 py-2 text-sm font-mono text-ink bg-white ${
            overridden ? "border-navy/50 ring-1 ring-navy/25 bg-navy/5" : "border-sepia/30"
          }`}
          spellCheck={false}
        />
      </div>

      <div>
        <p className="text-xs font-mono text-sepia/50 mb-1">Response shape (read-only)</p>
        <pre className="whitespace-pre-wrap rounded-lg border border-sepia/15 bg-sepia/5 px-3 py-2 text-xs font-mono text-sepia/70">
          {prefKey === "essayStyle" ? ESSAY_JSON_FOOTER : DEFINE_JSON_FOOTER}
        </pre>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setPreviewOpen((o) => !o)}
          className="text-xs font-mono text-navy hover:underline"
        >
          {previewOpen ? "Hide" : "Show"} assembled preview
        </button>
        {previewOpen && (
          <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-sepia/20 bg-white px-3 py-2 text-xs font-mono text-ink/80 max-h-80 overflow-y-auto">
            {preview}
          </pre>
        )}
      </div>
    </section>
  );
}

export default function PromptsPage() {
  const hydrateClientPrefs = useHistorianStore((s) => s.hydrateClientPrefs);
  const currentNode = useHistorianStore((s) => s.currentNode);
  const selectedLanguage = useHistorianStore((s) => s.selectedLanguage);
  const essayStyle = useHistorianStore((s) => s.essayStyle);
  const defineStyle = useHistorianStore((s) => s.defineStyle);
  const setEssayStyle = useHistorianStore((s) => s.setEssayStyle);
  const setDefineStyle = useHistorianStore((s) => s.setDefineStyle);
  const resetPromptStyle = useHistorianStore((s) => s.resetPromptStyle);

  useEffect(() => {
    hydrateClientPrefs();
  }, [hydrateClientPrefs]);

  const previewNode = useMemo(() => {
    if (currentNode.id !== "root") return currentNode;
    return SAMPLE_PROMPT_NODE;
  }, [currentNode]);

  const essayPreview = useMemo(
    () => buildEssayPrompt(previewNode, selectedLanguage, essayStyle),
    [previewNode, selectedLanguage, essayStyle]
  );

  const definePreview = useMemo(
    () =>
      buildDefinePrompt(
        SAMPLE_DEFINE_TERM,
        SAMPLE_DEFINE_CONTEXT,
        previewNode.title || SAMPLE_DEFINE_TOPIC,
        selectedLanguage,
        defineStyle
      ),
    [previewNode, selectedLanguage, defineStyle]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-parchment via-parchment to-amber-50/50">
      <header className="border-b border-sepia/15 bg-parchment/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Prompt styles</h1>
            <p className="text-xs font-serif text-sepia/60">
              Edit instruction blocks for essay and define. Context and JSON shape stay fixed.
            </p>
          </div>
          <Link
            href="/"
            className="text-xs font-mono text-navy border border-navy/30 rounded-lg px-3 py-1.5 hover:bg-navy/5"
          >
            ← Explorer
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-12">
        <PromptStyleEditor
          title="Essay"
          prefKey="essayStyle"
          style={essayStyle}
          onChange={setEssayStyle}
          onReset={() => {
            resetPromptStyle("essayStyle");
          }}
          scaffolding={essayContextBlock(previewNode)}
          preview={essayPreview}
        />
        <PromptStyleEditor
          title="Define"
          prefKey="defineStyle"
          style={defineStyle}
          onChange={setDefineStyle}
          onReset={() => {
            resetPromptStyle("defineStyle");
          }}
          scaffolding={defineContextBlock(
            SAMPLE_DEFINE_TERM,
            SAMPLE_DEFINE_CONTEXT,
            previewNode.title || SAMPLE_DEFINE_TOPIC
          )}
          preview={definePreview}
        />
        <p className="text-xs font-serif text-sepia/50">
          Defaults match committed code
          {essayStyle === PROMPT_STYLE_DEFAULTS.essayStyle &&
          defineStyle === PROMPT_STYLE_DEFAULTS.defineStyle
            ? " (no overrides stored)"
            : " where not customized"}
          .
        </p>
      </main>
    </div>
  );
}
