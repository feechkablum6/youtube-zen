# YouTube Zen

Chrome Extension для очистки интерфейса YouTube через CSS-injection.

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

## Structure

- `src/shared/` — types and defaults (shared between all components)
- `src/content/` — content script (CSS injection, selectors mapping)
- `src/background/` — service worker (minimal, sets defaults on install)
- `src/popup/` — popup UI (toggles, Dark Zen theme)
- `tests/` — unit tests (pure functions only, no browser)

## Conventions

- Content script format: IIFE. Background: ESM.
- `popup.html` lives at project root (Vite HTML entry point), references `src/popup/` via imports.
- Adding a new hideable element: one entry in `HIDE_RULES` in `src/content/selectors.ts` — popup and CSS injector derive from it automatically.
- CSS selectors target YouTube Web Components (`ytd-*` tags) which are stable across updates.
- All settings stored in `chrome.storage.sync`.

## Anti-Patterns

- Do NOT use `document_idle` for content script — must be `document_start` for flash-free hiding.
- Do NOT remove DOM elements — only hide via CSS `display: none !important`.
- Do NOT hardcode toggle lists in popup HTML — generate from HIDE_RULES.
- [2026-04-16] `ytd-guide-section-renderer` не имеет дочернего элемента `#header` — `has(> #header a[href="..."])` никогда не матчит. Правильно: `has(ytd-guide-entry-renderer a[href="..."])` (искать ссылку внутри записей секции).
- [2026-04-16] `ytd-guide-section-renderer:first-child` скрывает главную навигацию (Home/Subscriptions), а не секцию «Навигатор». Навигатор идентифицируется по `a[href="/gaming"]` внутри записей.
- [2026-04-16] «Плейлисты» — НЕ отдельная секция, а `ytd-guide-entry-renderer` внутри `ytd-guide-collapsible-section-entry-renderer` раздела «Вы». Таргетировать: `ytd-guide-entry-renderer:has(a[href="/feed/playlists"])`.
- [2026-04-16] Секция «Подписки (список)» идентифицируется по `a[href="/feed/subscriptions"]` внутри `ytd-guide-entry-renderer` — ссылка `/feed/channels` не существует нигде в guide.
- [2026-04-16] fixUblock таргетирует: ytd-rich-item-renderer/ytd-rich-section-renderer с ytd-ad-slot-renderer и ytd-in-feed-ad-layout-renderer — пустые контейнеры после uBlock + видимые in-feed рекламы.
- [2026-04-16] Новые CSS-селекторы для YouTube верифицировать через Claude-in-Chrome MCP на залогиненном браузере пользователя, а не через отдельный DevTools (там нет сессии).
