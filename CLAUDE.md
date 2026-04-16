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
  - `filters/` — client-side feed filters (`watched.ts` chip + scan, `observer.ts` generic MutationObserver wrapper, `inline-ui.ts` chip rendered next to YouTube search bar, `bootstrap.ts` orchestrator)
- `src/background/` — service worker (minimal, sets defaults on install)
- `src/popup/` — popup UI (rail + content architecture, Paper light theme)
  - `popup.ts` — orchestrator (reads storage, mounts sections)
  - `popup.css` — 320px Paper theme
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
- Adding a new hideable element (Очистка UI): one entry in `HIDE_RULES` in `src/content/selectors.ts` — popup cleaner section and CSS injector derive from it automatically.
- Adding a new feed filter (Фильтры ленты): new pure function + test under `src/content/filters/`, registered from `bootstrap.ts`. Use a marker class on the card (e.g. `yz-watched`) plus a CSS rule in `css-injector.ts` gated by a feature flag in `ZenSettings`.
- CSS selectors target YouTube Web Components (`ytd-*` tags) which are stable across updates.
- All settings stored in `chrome.storage.sync`. `activeSection` key persists the last opened rail section.
- Popup font: system stack (`-apple-system, system-ui, …`) — no Google Fonts, works offline.

## Anti-Patterns

- Do NOT use `document_idle` for content script — must be `document_start` for flash-free hiding.
- Do NOT remove DOM elements — hide via CSS. Hiding uses `animation: yz-vanish forwards` which collapses max-height to 0 at the end frame (equivalent to `display: none` for layout). First-load gets instant-hide via `html.yz-initial` override (dropped after 800ms) to prevent flash.
- Do NOT hardcode toggle lists or section lists in popup HTML — popup.ts generates rail from `SECTIONS` and toggles from `HIDE_RULES`.
- [2026-04-16] `ytd-guide-section-renderer` не имеет дочернего элемента `#header` — `has(> #header a[href="..."])` никогда не матчит. Правильно: `has(ytd-guide-entry-renderer a[href="..."])` (искать ссылку внутри записей секции).
- [2026-04-16] `ytd-guide-section-renderer:first-child` скрывает главную навигацию (Home/Subscriptions), а не секцию «Навигатор». Навигатор идентифицируется по `a[href="/gaming"]` внутри записей.
- [2026-04-16] «Плейлисты» — НЕ отдельная секция, а `ytd-guide-entry-renderer` внутри `ytd-guide-collapsible-section-entry-renderer` раздела «Вы». Таргетировать: `ytd-guide-entry-renderer:has(a[href="/feed/playlists"])`.
- [2026-04-16] Секция «Подписки (список)» идентифицируется по `a[href="/feed/subscriptions"]` внутри `ytd-guide-entry-renderer` — ссылка `/feed/channels` не существует нигде в guide.
- [2026-04-16] fixUblock таргетирует: ytd-rich-item-renderer/ytd-rich-section-renderer с ytd-ad-slot-renderer и ytd-in-feed-ad-layout-renderer — пустые контейнеры после uBlock + видимые in-feed рекламы.
- [2026-04-16] Новые CSS-селекторы для YouTube верифицировать через Claude-in-Chrome MCP на залогиненном браузере пользователя, а не через отдельный DevTools (там нет сессии).
- [2026-04-17] `element.querySelector('descendant #progress')` в jsdom (и в некоторых случаях в живом DOM) может матчить элемент за пределами subtree, когда `id="progress"` дублируется в других карточках. Правильно: two-step lookup — сначала найти контейнер (`overlay = card.querySelector('ytd-thumbnail-overlay-resume-playback-renderer')`), потом `overlay.querySelector('#progress')`. Применено в `src/content/filters/watched.ts`.
- [2026-04-17] На странице `/watch` sidebar YouTube использует новую разметку `yt-lockup-view-model`, а не `ytd-compact-video-renderer`. Обновлять `CARD_SELECTORS` при добавлении поддержки.
- [2026-04-17] YouTube мигрировал progress-overlay карточек с `ytd-thumbnail-overlay-resume-playback-renderer #progress[style=width]` на Material `yt-thumbnail-overlay-progress-bar-view-model` с потомком `.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment[style=width]`. `parseProgressPercent` должен поддерживать оба варианта (Material first, legacy fallback).
- [2026-04-17] Shorts едут в двух раскладках одновременно (A/B): старая — `ytd-rich-shelf-renderer[is-shorts]` / `ytd-reel-shelf-renderer`; новая — индивидуальные `ytd-rich-item-renderer` в общей ленте с `ytm-shorts-lockup-view-model-v2` внутри и БЕЗ атрибута `is-shorts`. Правило `shorts` должно содержать оба варианта.
- [2026-04-17] Эвристика «пустая ячейка = `ytd-rich-item-renderer` без `ytd-rich-grid-media`» даёт false positive — YouTube перевёл превью на `yt-lockup-view-model` / `ytm-shorts-lockup-view-model-v2`. Для диагностики пустоты проверять отсутствие всего набора: `yt-lockup-view-model, ytm-shorts-lockup-view-model-v2, ytd-rich-grid-media, ytd-video-renderer, ytd-compact-video-renderer`.
- [2026-04-17] CSS-правило `ytd-rich-item-renderer:has(ytd-ad-slot-renderer)` ломается когда uBlock физически удаляет ad-slot из DOM — пустой рекламный враппер снова «виден». Fix uBlock требует JS-наблюдателя (`src/content/ublock-cleaner.ts`): ждать попадания ячейки в viewport, через 1.5s проверить наличие `img[src*="ytimg"]`, если нет — скрыть. Отличает пустышки от lazy-load (lazy грузят thumbnail почти сразу).
- [2026-04-17] В `@keyframes yz-vanish` финальный кадр должен зануллять не только `max-height`, но и `width` / `max-width` / `min-width` / `flex-basis`. Без этого скрытый `ytd-rich-section-renderer` (Shorts shelf новой раскладки) сохраняет 100% ширину flex-контейнера `#contents` (`display: flex; flex-wrap: wrap`) и переносится flex-wrap на новый row, оставляя видимый пустой слот в предыдущем row. Подтверждено Claude-in-Chrome DOM-инспекцией.
- [2026-04-17] Для карточек в CSS-Grid ленте (`ytd-rich-grid-renderer`) max-height:0 в финальном кадре анимации НЕ освобождает grid-ячейку — она всё равно занимает слот. Для watched-фильтра используем отдельный `@keyframes yz-vanish-collapse` с `display: none` в финальном кадре (Chrome 120+ поддерживает анимацию discrete display). Применено в `src/content/css-injector.ts`.
- [2026-04-17] MutationObserver, наблюдающий за появлением новых карточек, должен также пересканировать существующую карточку когда внутри неё добавляются потомки (`closest(selector)` от `m.target`). YouTube часто рендерит пустую `ytd-rich-item-renderer` и только потом инжектит thumbnail overlay внутрь — без второго прохода watched-фильтр пропускает эти карточки до первого toggle'а. Применено в `src/content/filters/observer.ts`.
