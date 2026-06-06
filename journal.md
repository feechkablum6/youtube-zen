# YouTube Zen — Journal

Хронологический журнал работы: изменения, DOM-находки и разбор конкретных YouTube-селекторов.
Здесь — **история**; правила проекта живут в [`CLAUDE.md`](./CLAUDE.md). Новейшее — сверху.

## 2026-06-06

- Гамбургер (троеполосие) — `ytd-masthead #guide-button`, стоит в `#start` первым видимым элементом (x=16, ширина 40), сразу за ним без отступа — логотип `#logo` (x=56, `margin:0`). Скрытие кнопки правилом `yz-vanish` (финальный кадр обнуляет width/flex-basis/min-width/margin) само сдвигает логотип на x=16 — ровно на место гамбургера, отдельный repositioning-CSS НЕ нужен. Тумблер `headerMenuButton` в группе `header` («Хедер»). Подтверждено DOM-инспекцией залогиненного YouTube через Chrome DevTools MCP.

## 2026-06-03

- YouTube заменил в секции «Навигатор» пункт «Видеоигры» (`/gaming`) на «Фильмы» (`/feed/storefront`), а в «Другие возможности» убрал Premium (`/premium`), оставив YouTube Music (`https://music.youtube.com`) и YouTube Детям (`youtubekids.com`). Секции теперь идентифицируются по этим ссылкам; `/gaming` и `/premium` оставлены как A/B fallback.
- Списки сайдбара «Вы»/«Навигатор»/«Другие возможности» — вложенные тумблеры (`SIDEBAR_LISTS` в `selectors.ts`), а не плоские правила: master-ключ + дети. Семантика в `buildCss`: master OFF → ничего; все дети ON → `sectionSelectors` (вся секция с заголовком); частично → селекторы включённых детей. Ключи `playlists/liked/yourVideos/downloads` (дети «Вы») и `navigator/explore` (master) переиспользованы из старой плоской схемы — миграции storage нет.

## 2026-04-21

- В обработчике `yt-navigate-start` `window.location.href` ещё указывает на СТАРЫЙ URL — целевой URL приходит в `event.detail.url` (относительный путь). И `history.replaceState` после события YouTube перезаписывает своим навигатором (Navigation API, без pushState). Чтобы подменить URL до навигации — мутировать `event.detail.url` (и `event.detail.endpoint.commandMetadata.webCommandMetadata.url` для симметрии). Применено в `src/content/filters/search-url-rewriter.ts`.

## 2026-04-17

- `element.querySelector('descendant #progress')` в jsdom (и в некоторых случаях в живом DOM) может матчить элемент за пределами subtree, когда `id="progress"` дублируется в других карточках. Правильно: two-step lookup — сначала найти контейнер (`overlay = card.querySelector('ytd-thumbnail-overlay-resume-playback-renderer')`), потом `overlay.querySelector('#progress')`. Применено в `src/content/filters/watched.ts`.
- На странице `/watch` sidebar YouTube использует новую разметку `yt-lockup-view-model`, а не `ytd-compact-video-renderer`. Обновлять `CARD_SELECTORS` при добавлении поддержки.
- YouTube мигрировал progress-overlay карточек с `ytd-thumbnail-overlay-resume-playback-renderer #progress[style=width]` на Material `yt-thumbnail-overlay-progress-bar-view-model` с потомком `.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment[style=width]`. `parseProgressPercent` должен поддерживать оба варианта (Material first, legacy fallback).
- Shorts едут в двух раскладках одновременно (A/B): старая — `ytd-rich-shelf-renderer[is-shorts]` / `ytd-reel-shelf-renderer`; новая — индивидуальные `ytd-rich-item-renderer` в общей ленте с `ytm-shorts-lockup-view-model-v2` внутри и БЕЗ атрибута `is-shorts`. Правило `shorts` должно содержать оба варианта.
- Эвристика «пустая ячейка = `ytd-rich-item-renderer` без `ytd-rich-grid-media`» даёт false positive — YouTube перевёл превью на `yt-lockup-view-model` / `ytm-shorts-lockup-view-model-v2`. Для диагностики пустоты проверять отсутствие всего набора: `yt-lockup-view-model, ytm-shorts-lockup-view-model-v2, ytd-rich-grid-media, ytd-video-renderer, ytd-compact-video-renderer`.
- CSS-правило `ytd-rich-item-renderer:has(ytd-ad-slot-renderer)` ломается когда uBlock физически удаляет ad-slot из DOM — пустой рекламный враппер снова «виден». Fix uBlock требует JS-наблюдателя (`src/content/ublock-cleaner.ts`): ждать попадания ячейки в viewport, через 1.5s проверить наличие `img[src*="ytimg"]`, если нет — скрыть. Отличает пустышки от lazy-load (lazy грузят thumbnail почти сразу).
- В `@keyframes yz-vanish` финальный кадр должен зануллять не только `max-height`, но и `width` / `max-width` / `min-width` / `flex-basis`. Без этого скрытый `ytd-rich-section-renderer` (Shorts shelf новой раскладки) сохраняет 100% ширину flex-контейнера `#contents` (`display: flex; flex-wrap: wrap`) и переносится flex-wrap на новый row, оставляя видимый пустой слот в предыдущем row. Подтверждено Claude-in-Chrome DOM-инспекцией.
- Для карточек в CSS-Grid ленте (`ytd-rich-grid-renderer`) max-height:0 в финальном кадре анимации НЕ освобождает grid-ячейку — она всё равно занимает слот. Для watched-фильтра используем отдельный `@keyframes yz-vanish-collapse` с `display: none` в финальном кадре (Chrome 120+ поддерживает анимацию discrete display). Применено в `src/content/css-injector.ts`.
- MutationObserver, наблюдающий за появлением новых карточек, должен также пересканировать существующую карточку когда внутри неё добавляются потомки (`closest(selector)` от `m.target`). YouTube часто рендерит пустую `ytd-rich-item-renderer` и только потом инжектит thumbnail overlay внутрь — без второго прохода watched-фильтр пропускает эти карточки до первого toggle'а. Применено в `src/content/filters/observer.ts`.

## 2026-04-16

- `ytd-guide-section-renderer` не имеет дочернего элемента `#header` — `has(> #header a[href="..."])` никогда не матчит. Правильно: `has(ytd-guide-entry-renderer a[href="..."])` (искать ссылку внутри записей секции).
- `ytd-guide-section-renderer:first-child` скрывает главную навигацию (Home/Subscriptions), а не секцию «Навигатор». Навигатор идентифицируется по `a[href="/gaming"]` внутри записей.
- «Плейлисты» — НЕ отдельная секция, а `ytd-guide-entry-renderer` внутри `ytd-guide-collapsible-section-entry-renderer` раздела «Вы». Таргетировать: `ytd-guide-entry-renderer:has(a[href="/feed/playlists"])`.
- Секция «Подписки (список)» идентифицируется по `a[href="/feed/subscriptions"]` внутри `ytd-guide-entry-renderer` — ссылка `/feed/channels` не существует нигде в guide.
- fixUblock таргетирует: ytd-rich-item-renderer/ytd-rich-section-renderer с ytd-ad-slot-renderer и ytd-in-feed-ad-layout-renderer — пустые контейнеры после uBlock + видимые in-feed рекламы.
