# Editable Prompt Styles — Design

Date: 2026-09-20  
Status: Approved  
Depends on: Client prefs (localStorage) Phase 1

## Goal

Let power users edit the **instruction/style** segment of the essay and define prompts without redeploying. Fixed scaffolding (context fields, JSON response shape, language instruction) stays in code and is shown read-only. Overrides persist via the existing override-only prefs blob.

## Scope

**In:** essay + define style overrides; `/prompts` editor; API optional style fields; assembled preview.

**Out:** named presets; time/geo/jump/map/image prompts; freeform full-prompt override.

## Architecture

Refactor [`src/lib/prompts.ts`](src/lib/prompts.ts):

- Export `DEFAULT_ESSAY_STYLE` and `DEFAULT_DEFINE_STYLE`
- `buildEssayPrompt(node, language, style?)` / `buildDefinePrompt(..., style?)` inject style into fixed scaffolding

Prefs blob (`superhistorian.prefs.v1`) may include:

```json
{ "prompts": { "essayStyle": "...", "defineStyle": "..." } }
```

Store a style key only when ≠ committed default; reset deletes that key. Extend [`client-prefs.ts`](src/lib/client-prefs.ts) accordingly.

Zustand holds effective `essayStyle` / `defineStyle`, hydrated with other prefs.

## UI (`/prompts`)

- Header link from Explorer; back link to `/`
- Centered `max-w-3xl` column
- Per prompt (Essay, Define): override `✦` + red `×`; read-only scaffolding; large vertically resizable style textarea (debounce ~300ms persist); collapsible assembled preview using current explorer node or a sample node + `selectedLanguage`
- Site password middleware gates `/prompts` like `/`

## API

`ExploreRequest` optional `essayStyle` / `defineStyle`. Client sends only when overridden. Server passes into builders; reject oversized styles (e.g. >16KB) with 400. `_debug.prompt` is the fully assembled prompt.

## Testing

Unit: default assembly matches prior behavior; custom style injected; prefs nest override-only; corrupt/partial blob safe.
