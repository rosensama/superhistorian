# Client Prefs (localStorage) — Design

Date: 2026-09-20  
Status: Approved  
Phase: 1 (prefs framework); prompts editor deferred

## Goal

Persist client preferences to `localStorage` as **override-only** keys so non-default choices survive reloads. Committed code remains the source of defaults. This is the foundation for a later prompt-template editor on the same contract.

## Audience

Power-user / developer tooling first. Shared site password already gates the app.

## Persisted preferences (Phase 1)

| Key | Code default |
|-----|----------------|
| `selectedModel` | `openai/gpt-5-nano` |
| `selectedImageModel` | `google/gemini-3.1-flash-image` |
| `selectedLanguage` | `English` |
| `turboMode` | `false` (changed from previous `true`) |

Not persisted: exploration tree, essays, images, definitions, debug log, `lastSplitAxis`, debug panel chrome.

## Storage semantics

- Storage key: `superhistorian.prefs.v1`
- Blob contains **only** keys whose value differs from the current code default
- Setting a value equal to the default **deletes** that key
- Empty overrides → remove the storage key entirely
- Corrupt / non-JSON / non-object → treat as no overrides
- Unknown keys in the blob → ignore (forward-compat for prompts)

When a committed default changes, users with no stored override for that key automatically receive the new default. Users who customized keep their override until they reset.

## Architecture

Dedicated module `src/lib/client-prefs.ts`:

- `CLIENT_PREF_DEFAULTS`
- `getOverrides()` / `setPref(key, value)` / `clearPref(key)` / `isOverride(key, value)` / `resolvePrefs()`
- SSR-safe: no `localStorage` access on the server

Zustand (`src/lib/store.ts`) holds **effective** values. Client hydrate applies `resolvePrefs()` once on mount. Pref setters and `toggleTurbo` call `setPref` so storage stays in sync. `resetClientPref(key)` clears storage and restores the code default in Zustand.

## Override UX

Applies to **text model, image model, and language** only:

- Stronger accent border / background when overridden
- Compact single-glyph badge (not the word “custom”)
- Tiny × on a red chip; accessible name “Reset to default”; resets that one pref only

**Turbo:** persist via the prefs module; **no** badge or reset chrome. Keep existing on/off button styling. Default is `false`; turning turbo on stores `{ turboMode: true }`.

Brief default flash before client hydrate is acceptable.

## Prompts extension (out of scope for Phase 1)

Same module and blob. Nested `prompts` map of template overrides (only non-default templates). Later: named presets. Client would send optional template overrides to `/api/explore`; server fills placeholders or falls back to `src/lib/prompts.ts`.

## Testing

Unit tests cover: empty LS → defaults; set non-default persists; set-to-default clears key; `isOverride`; corrupt LS; turbo default `false`.
