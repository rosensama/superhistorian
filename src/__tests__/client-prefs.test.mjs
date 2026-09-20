import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Mirrors src/lib/client-prefs.ts — override-only localStorage prefs.
const CLIENT_PREFS_STORAGE_KEY = "superhistorian.prefs.v1";

const CLIENT_PREF_DEFAULTS = {
  selectedModel: "openai/gpt-5-nano",
  selectedImageModel: "google/gemini-3.1-flash-image",
  selectedLanguage: "English",
  turboMode: false,
};

const KNOWN_KEYS = Object.keys(CLIENT_PREF_DEFAULTS);

function isValidOverrideValue(key, value) {
  if (key === "turboMode") return typeof value === "boolean";
  return typeof value === "string";
}

function getOverrides() {
  try {
    const raw = globalThis.localStorage.getItem(CLIENT_PREFS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out = {};
    for (const key of KNOWN_KEYS) {
      if (!(key in parsed)) continue;
      const value = parsed[key];
      if (!isValidOverrideValue(key, value)) continue;
      if (value === CLIENT_PREF_DEFAULTS[key]) continue;
      out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function writeOverrides(overrides) {
  if (Object.keys(overrides).length === 0) {
    globalThis.localStorage.removeItem(CLIENT_PREFS_STORAGE_KEY);
    return;
  }
  globalThis.localStorage.setItem(CLIENT_PREFS_STORAGE_KEY, JSON.stringify(overrides));
}

function setPref(key, value) {
  const overrides = getOverrides();
  if (value === CLIENT_PREF_DEFAULTS[key]) {
    delete overrides[key];
  } else {
    overrides[key] = value;
  }
  writeOverrides(overrides);
}

function clearPref(key) {
  const overrides = getOverrides();
  delete overrides[key];
  writeOverrides(overrides);
}

function isOverride(key, value) {
  return value !== CLIENT_PREF_DEFAULTS[key];
}

function resolvePrefs() {
  return { ...CLIENT_PREF_DEFAULTS, ...getOverrides() };
}

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
    assert.equal(isOverride("selectedModel", resolvePrefs().selectedModel), true);
  });

  it("clears the key when set back to default", () => {
    setPref("selectedLanguage", "French");
    setPref("selectedLanguage", "English");
    assert.deepEqual(getOverrides(), {});
    assert.equal(globalThis.localStorage.getItem(CLIENT_PREFS_STORAGE_KEY), null);
  });

  it("clearPref removes one override", () => {
    setPref("turboMode", true);
    setPref("selectedLanguage", "German");
    clearPref("turboMode");
    assert.deepEqual(getOverrides(), { selectedLanguage: "German" });
    assert.equal(isOverride("turboMode", false), false);
  });

  it("ignores corrupt localStorage", () => {
    globalThis.localStorage.setItem(CLIENT_PREFS_STORAGE_KEY, "{not-json");
    assert.deepEqual(getOverrides(), {});
    assert.deepEqual(resolvePrefs(), { ...CLIENT_PREF_DEFAULTS });
  });

  it("ignores unknown keys and invalid types", () => {
    globalThis.localStorage.setItem(
      CLIENT_PREFS_STORAGE_KEY,
      JSON.stringify({
        prompts: { essay: "x" },
        selectedModel: 42,
        turboMode: true,
      })
    );
    assert.deepEqual(getOverrides(), { turboMode: true });
  });

  it("isOverride compares against defaults", () => {
    assert.equal(isOverride("turboMode", false), false);
    assert.equal(isOverride("turboMode", true), true);
    assert.equal(isOverride("selectedLanguage", "English"), false);
    assert.equal(isOverride("selectedLanguage", "Spanish"), true);
  });
});
