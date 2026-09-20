export const CLIENT_PREFS_STORAGE_KEY = "superhistorian.prefs.v1";

export const CLIENT_PREF_DEFAULTS = {
  selectedModel: "openai/gpt-5-nano",
  selectedImageModel: "google/gemini-3.1-flash-image",
  selectedLanguage: "English",
  turboMode: false,
} as const;

export type ClientPrefKey = keyof typeof CLIENT_PREF_DEFAULTS;

export type ClientPrefValues = {
  selectedModel: string;
  selectedImageModel: string;
  selectedLanguage: string;
  turboMode: boolean;
};

export type ClientPrefOverrides = Partial<ClientPrefValues>;

const KNOWN_KEYS = Object.keys(CLIENT_PREF_DEFAULTS) as ClientPrefKey[];

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isValidOverrideValue(key: ClientPrefKey, value: unknown): value is ClientPrefValues[ClientPrefKey] {
  if (key === "turboMode") return typeof value === "boolean";
  return typeof value === "string";
}

/** Read override-only blob from localStorage. Corrupt or unknown data is ignored. */
export function getOverrides(): ClientPrefOverrides {
  if (!canUseLocalStorage()) return {};
  try {
    const raw = window.localStorage.getItem(CLIENT_PREFS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const record = parsed as Record<string, unknown>;
    const out: ClientPrefOverrides = {};
    for (const key of KNOWN_KEYS) {
      if (!(key in record)) continue;
      const value = record[key];
      if (!isValidOverrideValue(key, value)) continue;
      if (value === CLIENT_PREF_DEFAULTS[key]) continue;
      (out as Record<string, unknown>)[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function writeOverrides(overrides: ClientPrefOverrides): void {
  if (!canUseLocalStorage()) return;
  if (Object.keys(overrides).length === 0) {
    window.localStorage.removeItem(CLIENT_PREFS_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(CLIENT_PREFS_STORAGE_KEY, JSON.stringify(overrides));
}

export function setPref<K extends ClientPrefKey>(key: K, value: ClientPrefValues[K]): void {
  const overrides = getOverrides();
  if (value === CLIENT_PREF_DEFAULTS[key]) {
    delete overrides[key];
  } else {
    overrides[key] = value;
  }
  writeOverrides(overrides);
}

export function clearPref(key: ClientPrefKey): void {
  const overrides = getOverrides();
  delete overrides[key];
  writeOverrides(overrides);
}

export function isOverride<K extends ClientPrefKey>(key: K, value: ClientPrefValues[K]): boolean {
  return value !== CLIENT_PREF_DEFAULTS[key];
}

export function resolvePrefs(): ClientPrefValues {
  return { ...CLIENT_PREF_DEFAULTS, ...getOverrides() };
}
