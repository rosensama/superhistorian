"use client";

import { CLIENT_PREF_DEFAULTS, isOverride, type ClientPrefKey } from "@/lib/client-prefs";
import { useHistorianStore } from "@/lib/store";

export type ChromePrefKey = Exclude<ClientPrefKey, "turboMode">;

const OVERRIDE_BADGE = "✦";

export function prefTriggerClass(overridden: boolean, base: string): string {
  if (!overridden) return base;
  return `${base} border-navy/50 bg-navy/5 ring-1 ring-navy/25`;
}

export function PrefOverrideCue({ prefKey }: { prefKey: ChromePrefKey }) {
  const value = useHistorianStore((s) => s[prefKey]);
  const resetClientPref = useHistorianStore((s) => s.resetClientPref);
  const overridden = isOverride(prefKey, value);

  if (!overridden) return null;

  return (
    <span className="inline-flex items-center gap-0.5 shrink-0">
      <span
        className="text-[10px] leading-none text-navy"
        title={`Custom ${prefKey} (not default: ${CLIENT_PREF_DEFAULTS[prefKey]})`}
        aria-hidden
      >
        {OVERRIDE_BADGE}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          resetClientPref(prefKey);
        }}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-xs bg-red-600 text-white text-[9px] leading-none hover:bg-red-700"
        aria-label="Reset to default"
        title="Reset to default"
      >
        ×
      </button>
    </span>
  );
}
