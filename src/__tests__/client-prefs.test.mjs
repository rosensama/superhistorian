import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

const CLIENT_PREFS_STORAGE_KEY = "superhistorian.prefs.v1";

const CLIENT_PREF_DEFAULTS = {
  selectedModel: "openai/gpt-5-nano",
  selectedImageModel: "google/gemini-3.1-flash-image",
  selectedLanguage: "English",
  turboMode: false,
};

const PROMPT_STYLE_DEFAULTS = {
  essayStyle: "DEFAULT_ESSAY",
  defineStyle: "DEFAULT_DEFINE",
};

const KNOWN_KEYS = Object.keys(CLIENT_PREF_DEFAULTS);
const PROMPT_KEYS = Object.keys(PROMPT_STYLE_DEFAULTS);

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

function readBlob() {
  try {
    const raw = globalThis.localStorage.getItem(CLIENT_PREFS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeBlob(blob) {
  const flat = {};
  for (const key of KNOWN_KEYS) {
    if (key in blob && blob[key] !== undefined && blob[key] !== CLIENT_PREF_DEFAULTS[key]) {
      flat[key] = blob[key];
    }
  }
  const prompts = {};
  if (blob.prompts) {
    for (const key of PROMPT_KEYS) {
      const value = blob.prompts[key];
      if (typeof value === "string" && value !== PROMPT_STYLE_DEFAULTS[key]) {
        prompts[key] = value;
      }
    }
  }
  const out = { ...flat };
  if (Object.keys(prompts).length > 0) out.prompts = prompts;
  if (Object.keys(out).length === 0) {
    globalThis.localStorage.removeItem(CLIENT_PREFS_STORAGE_KEY);
    return;
  }
  globalThis.localStorage.setItem(CLIENT_PREFS_STORAGE_KEY, JSON.stringify(out));
}

function getOverrides() {
  const blob = readBlob();
  const out = {};
  for (const key of KNOWN_KEYS) {
    if (!(key in blob)) continue;
    const value = blob[key];
    if (key === "turboMode" ? typeof value !== "boolean" : typeof value !== "string") continue;
    if (value === CLIENT_PREF_DEFAULTS[key]) continue;
    out[key] = value;
  }
  return out;
}

function getPromptStyleOverrides() {
  const blob = readBlob();
  const out = {};
  if (!blob.prompts || typeof blob.prompts !== "object") return out;
  for (const key of PROMPT_KEYS) {
    const value = blob.prompts[key];
    if (typeof value !== "string") continue;
    if (value === PROMPT_STYLE_DEFAULTS[key]) continue;
    out[key] = value;
  }
  return out;
}

function omitKey(obj, key) {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));
}

function setPref(key, value) {
  const blob = readBlob();
  if (value === CLIENT_PREF_DEFAULTS[key]) {
    writeBlob(omitKey(blob, key));
  } else {
    blob[key] = value;
    writeBlob(blob);
  }
}

function setPromptStyle(key, value) {
  const blob = readBlob();
  const prompts = blob.prompts ?? {};
  blob.prompts =
    value === PROMPT_STYLE_DEFAULTS[key] ? omitKey(prompts, key) : { ...prompts, [key]: value };
  writeBlob(blob);
}

function clearPromptStyle(key) {
  const blob = readBlob();
  if (!blob.prompts) return;
  blob.prompts = omitKey(blob.prompts, key);
  writeBlob(blob);
}

function resolvePrefs() {
  return { ...CLIENT_PREF_DEFAULTS, ...getOverrides() };
}

function resolvePromptStyles() {
  return { ...PROMPT_STYLE_DEFAULTS, ...getPromptStyleOverrides() };
}

describe("client-prefs", () => {
  beforeEach(() => {
    globalThis.localStorage = createMemoryStorage();
  });

  it("resolves to defaults with empty storage", () => {
    assert.deepEqual(resolvePrefs(), { ...CLIENT_PREF_DEFAULTS });
    assert.equal(CLIENT_PREF_DEFAULTS.turboMode, false);
  });

  it("persists a non-default value", () => {
    setPref("selectedModel", "anthropic/claude-sonnet-4");
    assert.deepEqual(getOverrides(), { selectedModel: "anthropic/claude-sonnet-4" });
    assert.equal(resolvePrefs().selectedModel, "anthropic/claude-sonnet-4");
  });

  it("clears the key when set back to default", () => {
    setPref("selectedLanguage", "French");
    setPref("selectedLanguage", "English");
    assert.deepEqual(getOverrides(), {});
    assert.equal(globalThis.localStorage.getItem(CLIENT_PREFS_STORAGE_KEY), null);
  });

  it("stores prompt styles under prompts nest only when overridden", () => {
    setPref("turboMode", true);
    setPromptStyle("essayStyle", "CUSTOM_ESSAY");
    const raw = JSON.parse(globalThis.localStorage.getItem(CLIENT_PREFS_STORAGE_KEY));
    assert.equal(raw.turboMode, true);
    assert.deepEqual(raw.prompts, { essayStyle: "CUSTOM_ESSAY" });
    assert.equal(resolvePromptStyles().essayStyle, "CUSTOM_ESSAY");
    assert.equal(resolvePromptStyles().defineStyle, "DEFAULT_DEFINE");
  });

  it("clearPromptStyle removes one style and keeps other prefs", () => {
    setPromptStyle("essayStyle", "CUSTOM_ESSAY");
    setPromptStyle("defineStyle", "CUSTOM_DEFINE");
    clearPromptStyle("essayStyle");
    assert.deepEqual(getPromptStyleOverrides(), { defineStyle: "CUSTOM_DEFINE" });
  });

  it("ignores corrupt localStorage", () => {
    globalThis.localStorage.setItem(CLIENT_PREFS_STORAGE_KEY, "{not-json");
    assert.deepEqual(getOverrides(), {});
    assert.deepEqual(getPromptStyleOverrides(), {});
  });

  it("ignores unknown keys and invalid prompt types", () => {
    globalThis.localStorage.setItem(
      CLIENT_PREFS_STORAGE_KEY,
      JSON.stringify({
        prompts: { essayStyle: 99, defineStyle: "CUSTOM_DEFINE", other: "x" },
        selectedModel: 42,
        turboMode: true,
      })
    );
    assert.deepEqual(getOverrides(), { turboMode: true });
    assert.deepEqual(getPromptStyleOverrides(), { defineStyle: "CUSTOM_DEFINE" });
  });
});
