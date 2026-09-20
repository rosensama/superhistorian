"use client";

import { useHistorianStore } from "@/lib/store";
import { isOverride } from "@/lib/client-prefs";
import { PrefOverrideCue, prefTriggerClass } from "./PrefOverrideCue";

const LANGUAGES = [
  { code: "English", label: "English", flag: "🇬🇧" },
  { code: "French", label: "Français", flag: "🇫🇷" },
  { code: "German", label: "Deutsch", flag: "🇩🇪" },
  { code: "Spanish", label: "Español", flag: "🇪🇸" },
  { code: "Bahasa Indonesia", label: "Bahasa", flag: "🇮🇩" },
];

const SELECT_BASE =
  "px-3 py-1.5 text-xs font-mono text-sepia border border-sepia/30 rounded-lg hover:bg-sepia/10 transition-colors bg-transparent cursor-pointer appearance-none";

export default function LanguageSelector() {
  const { selectedLanguage, setSelectedLanguage } = useHistorianStore();
  const overridden = isOverride("selectedLanguage", selectedLanguage);

  return (
    <div className="inline-flex items-center gap-1">
      <select
        value={selectedLanguage}
        onChange={(e) => setSelectedLanguage(e.target.value)}
        className={prefTriggerClass(overridden, SELECT_BASE)}
        style={{ backgroundImage: "none" }}
        title="Output language"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>
      <PrefOverrideCue prefKey="selectedLanguage" />
    </div>
  );
}
