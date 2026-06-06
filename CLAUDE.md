# YouTube Zen

Chrome Extension для очистки интерфейса YouTube через CSS-injection.

> История изменений, DOM-находки и разбор конкретных YouTube-селекторов по датам — в [`journal.md`](./journal.md), а не здесь. `CLAUDE.md` держим как правила, не как склад истории.

## Stack

- TypeScript (strict), Manifest V3
- Vite + esbuild plugin (content/background compiled separately)
- Vitest for unit tests
- No frameworks — vanilla DOM

## Commands

- `npm run build` — production build to `dist/`
- `npm run dev` — watch mode build
- `npm test` — run all tests
- `npm run test:watch` — tests in watch mode
- `npm run typecheck` — `tsc --noEmit` (тип-чек, не входит в `build`)

**ОБЯЗАТЕЛЬНО:** после любого изменения в `src/` запускать `npm run build` перед перезагрузкой расширения — Chrome грузит `dist/`, а не исходники. Без пересборки правки не попадают в браузер и проверка идёт на старом коде. (Либо держать запущенным `npm run dev` в watch-режиме.)

## Structure

- `src/shared/` — types and defaults (shared between all components)
- `src/content/` — content script (CSS injection, selectors mapping)
  - `filters/` — client-side feed filters (`watched.ts` chip + scan, `observer.ts` generic MutationObserver wrapper, `inline-ui.ts` chip rendered next to YouTube search bar, `bootstrap.ts` orchestrator)
- `src/background/` — service worker (minimal, sets defaults on install)
- `src/popup/` — popup UI (rail + content architecture, dark theme with red accent `#FF2D2D`)
  - `popup.ts` — orchestrator (reads storage, mounts sections)
  - `popup.css` — 360px dark theme, CSS custom properties in `:root`
  - `sections.ts` — declarative `SECTIONS` registry
  - `sections/` — per-section render functions (`cleaner`, `filters`, `settings`, `stub`)
  - `storage.ts` — typed wrapper over `chrome.storage.sync`
  - `utils.ts` — pure helpers (`resolveActiveSection`, `countActiveRules`, `groupRulesByGroup`)
- `tests/` — unit tests (Vitest with jsdom)
  - `tests/content/` — content-script filter tests (DOM-based)
  - `tests/popup/` — popup helpers, registry, and section tests

## Conventions

- Content script format: IIFE. Background: ESM.
- `popup.html` lives at project root (Vite HTML entry point), references `src/popup/` via imports.
- Adding a new popup section: one entry in `SECTIONS` in `src/popup/sections.ts` + a `render(container, settings)` function in `src/popup/sections/`. No changes to `popup.ts` or `popup.html`.
- Adding a new hideable element (Очистка UI): one entry in `HIDE_RULES` in `src/content/selectors.ts` + ключ в `ZenSettings`/`DEFAULT_SETTINGS` + ключ в `ALL_KEYS` (`cleaner.ts`) — popup cleaner section и CSS injector выводят остальное автоматически. Новая группа правил = запись в `GROUP_LABELS` (`types.ts`) + в `GROUP_ORDER` (`cleaner.ts`).
- Adding a new feed filter (Фильтры ленты): new pure function + test under `src/content/filters/`, registered from `bootstrap.ts`. Use a marker class on the card (e.g. `yz-watched`) plus a CSS rule in `css-injector.ts` gated by a feature flag in `ZenSettings`.
- CSS selectors target YouTube Web Components (`ytd-*` tags) which are stable across updates.
- All settings stored in `chrome.storage.sync`. `activeSection` key persists the last opened rail section.
- Popup font: system stack (`-apple-system, system-ui, …`) — no Google Fonts, works offline.

## Anti-Patterns

- Do NOT use `document_idle` for content script — must be `document_start` for flash-free hiding.
- Do NOT remove DOM elements — hide via CSS. Hiding uses `animation: yz-vanish forwards` which collapses max-height to 0 at the end frame (equivalent to `display: none` for layout). First-load gets instant-hide via `html.yz-initial` override (dropped after 800ms) to prevent flash.
- Do NOT hardcode toggle lists or section lists in popup HTML — popup.ts generates rail from `SECTIONS` and toggles from `HIDE_RULES`.
- Новые CSS-селекторы для YouTube верифицировать на залогиненном браузере пользователя (Chrome DevTools / Claude-in-Chrome MCP), а не на отдельном DevTools без сессии.
