import { DEFAULT_DEFINE_STYLE, DEFAULT_ESSAY_STYLE } from "./prompts";

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

export const PROMPT_STYLE_DEFAULTS = {
  essayStyle: DEFAULT_ESSAY_STYLE,
  defineStyle: DEFAULT_DEFINE_STYLE,
} as const;

export type PromptStyleKey = keyof typeof PROMPT_STYLE_DEFAULTS;

export type PromptStyleValues = {
  essayStyle: string;
  defineStyle: string;
};

export type PromptStyleOverrides = Partial<PromptStyleValues>;

type PrefsBlob = ClientPrefOverrides & {
  prompts?: PromptStyleOverrides;
};

const KNOWN_KEYS = Object.keys(CLIENT_PREF_DEFAULTS) as ClientPrefKey[];
const PROMPT_KEYS = Object.keys(PROMPT_STYLE_DEFAULTS) as PromptStyleKey[];

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isValidOverrideValue(key: ClientPrefKey, value: unknown): value is ClientPrefValues[ClientPrefKey] {
  if (key === "turboMode") return typeof value === "boolean";
  return typeof value === "string";
}

function readBlob(): PrefsBlob {
  if (!canUseLocalStorage()) return {};
  try {
    const raw = window.localStorage.getItem(CLIENT_PREFS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as PrefsBlob;
  } catch {
    return {};
  }
}

function writeBlob(blob: PrefsBlob): void {
  if (!canUseLocalStorage()) return;
  const flat: ClientPrefOverrides = {};
  for (const key of KNOWN_KEYS) {
    if (key in blob && blob[key] !== undefined && blob[key] !== CLIENT_PREF_DEFAULTS[key]) {
      (flat as Record<string, unknown>)[key] = blob[key];
    }
  }
  const prompts: PromptStyleOverrides = {};
  if (blob.prompts) {
    for (const key of PROMPT_KEYS) {
      const value = blob.prompts[key];
      if (typeof value === "string" && value !== PROMPT_STYLE_DEFAULTS[key]) {
        prompts[key] = value;
      }
    }
  }
  const out: PrefsBlob = { ...flat };
  if (Object.keys(prompts).length > 0) out.prompts = prompts;
  if (Object.keys(out).length === 0) {
    window.localStorage.removeItem(CLIENT_PREFS_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(CLIENT_PREFS_STORAGE_KEY, JSON.stringify(out));
}

/** Read override-only blob from localStorage. Corrupt or unknown data is ignored. */
export function getOverrides(): ClientPrefOverrides {
  const blob = readBlob();
  const out: ClientPrefOverrides = {};
  for (const key of KNOWN_KEYS) {
    if (!(key in blob)) continue;
    const value = blob[key];
    if (!isValidOverrideValue(key, value)) continue;
    if (value === CLIENT_PREF_DEFAULTS[key]) continue;
    (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

export function getPromptStyleOverrides(): PromptStyleOverrides {
  const blob = readBlob();
  const out: PromptStyleOverrides = {};
  if (!blob.prompts || typeof blob.prompts !== "object") return out;
  for (const key of PROMPT_KEYS) {
    const value = blob.prompts[key];
    if (typeof value !== "string") continue;
    if (value === PROMPT_STYLE_DEFAULTS[key]) continue;
    out[key] = value;
  }
  return out;
}

export function setPref<K extends ClientPrefKey>(key: K, value: ClientPrefValues[K]): void {
  const blob = readBlob();
  if (value === CLIENT_PREF_DEFAULTS[key]) {
    delete blob[key];
  } else {
    blob[key] = value;
  }
  writeBlob(blob);
}

export function clearPref(key: ClientPrefKey): void {
  const blob = readBlob();
  delete blob[key];
  writeBlob(blob);
}

export function setPromptStyle(key: PromptStyleKey, value: string): void {
  const blob = readBlob();
  const prompts = { ...(blob.prompts || {}) };
  if (value === PROMPT_STYLE_DEFAULTS[key]) {
    delete prompts[key];
  } else {
    prompts[key] = value;
  }
  blob.prompts = prompts;
  writeBlob(blob);
}

export function clearPromptStyle(key: PromptStyleKey): void {
  const blob = readBlob();
  if (!blob.prompts) return;
  const prompts = { ...blob.prompts };
  delete prompts[key];
  blob.prompts = prompts;
  writeBlob(blob);
}

export function isOverride<K extends ClientPrefKey>(key: K, value: ClientPrefValues[K]): boolean {
  return value !== CLIENT_PREF_DEFAULTS[key];
}

export function isPromptStyleOverride(key: PromptStyleKey, value: string): boolean {
  return value !== PROMPT_STYLE_DEFAULTS[key];
}

export function resolvePrefs(): ClientPrefValues {
  return { ...CLIENT_PREF_DEFAULTS, ...getOverrides() };
}

export function resolvePromptStyles(): PromptStyleValues {
  return { ...PROMPT_STYLE_DEFAULTS, ...getPromptStyleOverrides() };
}
