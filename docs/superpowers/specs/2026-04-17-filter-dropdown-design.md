# Фильтры: кнопка «Фильтры» с выпадающей панелью (Фаза 1)

**Дата:** 2026-04-17
**Статус:** draft
**Автор:** совместный brainstorming
**Контекст:** вторая подсистема крупной фичи «Фильтры ленты». Первая подсистема («скрыть просмотренные») уже в main. Эта Фаза 1 объединяет существующий watched-toggle и все 4 группы нативных YT-фильтров поиска в единый inline-UI. Фаза 2 (отдельный спек) — применение этих же фильтров на главной ленте через client-side парсинг метаданных.

## 1. Цель

Дать пользователю возможность настроить фильтры поиска YouTube **заранее, один раз**, так, чтобы они применялись автоматически при каждом запросе и не сбрасывались между сессиями. Решается исходная проблема: «фильтры поиска YT включаются только после первого поиска и каждый раз с нуля».

Одновременно — единый UI (рядом с полем поиска YouTube) для всех наших фильтров. Сейчас там отдельный chip «Просмотренные»; заменяем на кнопку «Фильтры» с выпадающей панелью, внутри которой:

- наш client-side фильтр «Просмотренные» (применяется к ленте мгновенно),
- 4 группы нативных YT-фильтров поиска (применяются к `/results` через URL-параметр `sp`).

## 2. Scope

**Входит:**
- Кнопка «Фильтры» в `ytd-masthead #end`, заменяет старый chip «Просмотренные».
- Выпадающая панель с двумя секциями: «Фильтры ленты» (watched) и «Фильтры поиска» (4 нативные группы).
- Storage-ключи для 4 новых параметров (Upload date / Duration / Sort / Type).
- Автоматическое дописывание `sp=<value>` к URL при SPA-навигации на `/results`.
- Миграция существующего chip «Просмотренные» внутрь панели (chip из masthead удаляется).
- Обновление popup-секции «Фильтры ленты» — оставляем слайдер порога watched, дополняем текстом про то что on/off и YT-фильтры настраиваются в inline-панели на YouTube.

**Явно вне этой фазы:**
- Применение YT-фильтров на `/` (home) и `/watch` — требует client-side парсинг длительности, даты, типа, фич с учётом локализации. Отдельный спек Фазы 2.
- Новые client-side фильтры (duration, views, блок-лист каналов, regex по заголовкам) — отдельный спек Фазы 3.
- Чекбоксы для features (Live / 4K / HD / Субтитры / Creative Commons). Пользователь явно не запросил — не делаем.
- Авто-применение `sp=` при вводе запроса через URL-bar Chrome (минуя search box YouTube) — требует `declarativeNetRequest` правил, откладываем.

## 3. Архитектура и границы модулей

```
src/content/filters/
  bootstrap.ts               # существующий — оркестратор; обновляем
  observer.ts                # существующий — generic card observer, без изменений
  watched.ts                 # существующий — pure функции, без изменений
  inline-ui.ts               # ПЕРЕПИСЫВАЕМ: chip → кнопка + панель
  sp-encoder.ts              # NEW — pure encoder настроек → sp= значение
  search-url-rewriter.ts     # NEW — hook на SPA-nav, подмена URL для /results

src/popup/sections/
  filters.ts                 # обновляем — дополнение к существующему слайдеру

src/shared/
  types.ts                   # +4 новых ключа ZenSettings
  defaults.ts                # дефолты 'any' / 'relevance'
```

**Границы**:

- `sp-encoder.ts` — чистые функции, не знает про DOM, storage, URL.
  - `encodeSp(filters: SearchFilters): string | null` — собирает base64-закодированную protobuf-структуру из 4 параметров; возвращает `null` если все значения по умолчанию.
- `search-url-rewriter.ts`
  - `rewriteIfNeeded(url: URL, filters: SearchFilters): URL` — чистая функция-декоратор URL.
  - `installNavListener(): void` — регистрирует слушатель `yt-navigate-start` (idempotent).
  - Не знает про UI, не вызывается из панели напрямую, читает storage только при инициализации + на `onChanged`.
- `inline-ui.ts` — рендер кнопки и панели, event-wiring на select/toggle, запись в storage. Не знает про URL-rewriting.
- `bootstrap.ts` — единственная точка связывающая modules: init всего, подписка на storage, монтирование кнопки.

## 4. Типы и новые поля ZenSettings

Добавляем в `src/shared/types.ts`:

```ts
export type UploadDateOpt =
  | 'any' | 'hour' | 'today' | 'week' | 'month' | 'year';

export type DurationOpt =
  | 'any' | 'short' | 'medium' | 'long';
  // short: <4 мин, medium: 4–20 мин, long: >20 мин

export type SortOpt =
  | 'relevance' | 'date' | 'views' | 'rating';

export type TypeOpt =
  | 'any' | 'video' | 'channel' | 'playlist' | 'movie';

export interface SearchFilters {
  uploadDate: UploadDateOpt;
  duration: DurationOpt;
  sort: SortOpt;
  type: TypeOpt;
}

export interface ZenSettings {
  // …существующие поля (enabled, cleaner toggles, filterWatchedEnabled, filterWatchedThreshold)…
  filterSearchUploadDate: UploadDateOpt;
  filterSearchDuration:   DurationOpt;
  filterSearchSort:       SortOpt;
  filterSearchType:       TypeOpt;
}
```

В `SettingsKey` и `ToggleKey`-союзы — исключаем новые ключи из `ToggleKey` (они не булевы cleaner-тоглы).

Дефолты в `src/shared/defaults.ts`:

```ts
filterSearchUploadDate: 'any',
filterSearchDuration:   'any',
filterSearchSort:       'relevance',
filterSearchType:       'any',
```

## 5. Data flow

**Read-path** (реакция на изменения):

```
chrome.storage.sync
  ├── filterWatchedEnabled / Threshold ── bootstrap ── inline-ui panel row
  ├── filterSearchUploadDate ─────────── bootstrap ── inline-ui select
  ├── filterSearchDuration   ─────────── bootstrap ── inline-ui select
  ├── filterSearchSort       ─────────── bootstrap ── inline-ui select
  ├── filterSearchType       ─────────── bootstrap ── inline-ui select
  └── (любое из Search*) ── search-url-rewriter ── обновление закэшированной sp-строки
```

**Write-path**:

```
Пользователь меняет <select> или <toggle> в панели на YouTube
      ──► chrome.storage.sync.set({ [key]: value })

Пользователь двигает слайдер порога в popup
      ──► chrome.storage.sync.set({ filterWatchedThreshold: value })
```

**Применение к поиску**:

```
Пользователь вводит запрос → YouTube dispatches `yt-navigate-start`
      │
      ▼
search-url-rewriter перехватывает:
  targetUrl = new URL(event.detail.url)   // или как YT прокинет
  if (targetUrl.pathname === '/results' && !targetUrl.searchParams.has('sp'))
      const sp = encodeSp(currentFilters)
      if (sp) targetUrl.searchParams.set('sp', sp)
      // YT уже уходит на URL, подменить можно через
      // history.replaceState + event.preventDefault при необходимости.
```

Точная реализация — `history.replaceState` после того как YouTube запустил навигацию, + проверка в `yt-navigate-finish` что URL стоит правильный (fallback на `location.replace` если не стоит).

## 6. sp-encoder: как кодируется `sp=`

YouTube `sp=` — это base64url-кодированное protobuf-сообщение, в котором каждый фильтр — отдельное поле. Структура реверс-инженерена в opensource-клиентах (invidious, ytdl-org) и документирована годами.

Примеры известных значений:

| Параметр | Значение | `sp=` |
|---|---|---|
| Upload date = Hour | — | `EgIIAQ%3D%3D` |
| Upload date = Today | — | `EgIIAg%3D%3D` |
| Upload date = Week | — | `EgIIAw%3D%3D` |
| Duration = Short (<4 min) | — | `EgIYAQ%3D%3D` |
| Sort = Upload date | — | `CAI%3D` |
| Type = Video | — | `EgIQAQ%3D%3D` |

Для комбинаций (несколько фильтров одновременно) нужно корректно собрать protobuf: message содержит nested fields, порядок байтов важен.

**Реализация** (`src/content/filters/sp-encoder.ts`):

- Два уровня полей: `sort` — top-level protobuf (field 1), остальные фильтры упаковываются в nested `filter` (field 2, содержит свои sub-fields).
- Pure JS функция `encodeProtobuf(fields)` на ~40 строк (varint encoding + length-prefix для nested).
- `encodeSp(filters)` вызывает `encodeProtobuf` с правильно разложенными полями, делает `btoa` + URL-escape.
- Если все значения по умолчанию → возвращает `null` (не дописываем `sp` вовсе, чтобы не триггерить YT-фильтрацию).

**Юнит-тесты** покрывают все 5 известных одиночных значений + ≥5 комбинаций, сверяя с reference-строками из живых URL YouTube.

## 7. Search URL rewriter

`src/content/filters/search-url-rewriter.ts`:

```ts
export function rewriteIfNeeded(url: URL, filters: SearchFilters): URL {
  if (url.pathname !== '/results') return url;
  if (url.searchParams.has('sp')) return url;  // пользователь явно выставил
  const sp = encodeSp(filters);
  if (!sp) return url;
  const next = new URL(url.toString());
  next.searchParams.set('sp', sp);
  return next;
}

export function installNavListener(getFilters: () => SearchFilters): () => void {
  const onNavStart = (e: Event) => { /* … replaceState with rewritten URL … */ };
  window.addEventListener('yt-navigate-start', onNavStart);
  return () => window.removeEventListener('yt-navigate-start', onNavStart);
}
```

`getFilters` — фабрика, вызывается в момент события (читает закэшированное состояние). Хранение состояния и подписка на `chrome.storage.onChanged` — в `bootstrap.ts`.

**Поведение при прямом открытии `/results`** (из истории/закладки — `yt-navigate-start` не срабатывает):

- В `yt-navigate-finish` или `DOMContentLoaded` (что раньше) → проверяем: `location.pathname === '/results'`, нет `sp` в URL, есть активные фильтры → делаем `history.replaceState` с новым URL. YouTube при наличии `sp` в URL сам перечитает параметры в search-results-renderer'е.
- Если перечитать не успевает — однократный `location.reload()` с `sessionStorage`-флагом `yz-sp-applied`, чтобы не зациклиться.

## 8. Inline UI: кнопка + панель

### 8.1 Кнопка

- **Якорь**: `ytd-masthead #end`, перед `#buttons` (та же позиция что была у chip `yz-chip-watched`, теперь заменяется кнопкой).
- **DOM**:
  ```html
  <button id="yz-filters-btn" class="yz-btn" type="button"
          aria-haspopup="dialog" aria-expanded="false"
          aria-label="Фильтры">
    <span class="yz-btn__icon">⚙</span>
    <span class="yz-btn__label">Фильтры</span>
    <span class="yz-btn__badge" hidden>•</span>
  </button>
  ```
- **Бейдж** `•` показывается через атрибут `data-has-active="true"` (и `hidden` снимается) когда хотя бы один из следующих не в дефолте:
  - `filterWatchedEnabled === true`
  - `filterSearchUploadDate !== 'any'`
  - `filterSearchDuration !== 'any'`
  - `filterSearchSort !== 'relevance'`
  - `filterSearchType !== 'any'`
- **Click** → `togglePanel(btn)`.
- **Visibility**: кнопка видна на всех страницах YouTube (не прячется на `/shorts` и т.д., YT-фильтры всё равно можно настроить заранее для следующего поиска).

### 8.2 Панель

- **Монтирование**: `document.body.appendChild(panel)` (не внутрь masthead, чтобы overflow/clip masthead не обрезал панель).
- **Позиционирование**: `position: fixed; top: <btn.bottom+8>; right: <viewport.right - btn.right>`. Привязка через `getBoundingClientRect` при открытии. На resize/scroll — перерасчёт или закрытие (проще закрыть).
- **DOM**:
  ```html
  <div id="yz-filters-panel" class="yz-panel" role="dialog"
       aria-label="Фильтры" aria-modal="false">
    <section class="yz-group">
      <h3 class="yz-group__title">Фильтры ленты</h3>
      <label class="yz-row yz-row--toggle">
        <span class="yz-row__label">Просмотренные</span>
        <span class="toggle">
          <input type="checkbox" data-key="filterWatchedEnabled">
          <span class="toggle-slider"></span>
        </span>
      </label>
    </section>
    <section class="yz-group">
      <h3 class="yz-group__title">Фильтры поиска</h3>
      <label class="yz-row yz-row--select">
        <span class="yz-row__label">Дата загрузки</span>
        <select data-key="filterSearchUploadDate">
          <option value="any">Любая</option>
          <option value="hour">За час</option>
          <option value="today">Сегодня</option>
          <option value="week">За неделю</option>
          <option value="month">За месяц</option>
          <option value="year">За год</option>
        </select>
      </label>
      <!-- аналогичные row'ы для Длительность / Сортировка / Тип -->
    </section>
  </div>
  ```
- **Event-wiring**:
  - `change` на любом `[data-key]` → `chrome.storage.sync.set({ [key]: value })`.
  - `click` вне панели/кнопки → `closePanel`.
  - `Escape` → `closePanel` + фокус возвращается на кнопку.
  - `storage.onChanged` → обновляет `.checked` / `.value` входов в панели (если открыта), пересчитывает бейдж.
- **Accessibility**:
  - `role="dialog"`, `aria-label="Фильтры"`.
  - Focus trap: Tab циклит только внутри панели. Простой вариант — первый fокусируемый элемент при открытии, listener на `keydown` Tab/Shift+Tab.
  - Нативные `<select>` и `<input type="checkbox">` — клавиатура работает из коробки.

### 8.3 Стили

CSS добавляется в тот же `src/content/css-injector.ts` (в ветке `if (hasWatched || hasAnySearchFilter)` — т. е. кнопка и панель инжектятся всегда пока включён хотя бы один фильтр из «Фильтры ленты» или ключ `filterSearch*` не 'any'). Проще: инжектим CSS безусловно (если `settings.enabled`), накладных расходов ~2 KB.

Стиль — следует YouTube-темам: использует `var(--yt-spec-*, fallback)` для background, border, text-colors. Работает и в тёмной, и в светлой теме.

### 8.4 Удаление старого chip'а

- Удалить из `inline-ui.ts`: `CHIP_ID`, `createChip`, `mountChip`, `syncChipState`, `applyChipVisibility`, `isPathVisible`, `VISIBLE_PATHS`.
- Удалить из `bootstrap.ts`: `wireChip`, `tryMountChip`, mount-observer для chip'а.
- Заменить импорты на новые (`BTN_ID`, `createFiltersButton`, `mountFiltersButton`, `openPanel`, `closePanel`, `syncButtonBadge`).
- Удалить из `css-injector.ts` блок `#yz-chip-watched {...}` и `.yz-chip__*`, заменить новым `#yz-filters-btn`, `#yz-filters-panel`, `.yz-group`, `.yz-row` и т. д.
- Удалить `tests/content/inline-ui.test.ts` в текущем виде, переписать под новые API.

## 9. Popup-секция «Фильтры ленты»

Существующая `src/popup/sections/filters.ts` — оставляем слайдер порога watched (это тонкая настройка, не помещается в toggle-row). Дополняем:

- Заголовок секции «Фильтры ленты».
- Группа «Просмотренные видео»: слайдер порога (без изменений).
- Подсказка в конце секции: «Включение/выключение и фильтры поиска — на YouTube, кнопка ‘Фильтры’ рядом с поиском». (Это уже есть, оставляем.)
- Место для будущих тонких настроек (регекс, блок-листы) — оставляем пустым, без заглушек.

YT-фильтры (Дата/Длительность/Сортировка/Тип) **не дублируются в popup**. Эти выборы — быстрые, делаются раз в жизни, под рукой на YouTube. Дублировать нет смысла.

## 10. Тестирование

### 10.1 Юнит

- `tests/content/sp-encoder.test.ts` (новый)
  - `encodeSp` с все-`any` → `null`.
  - Table-driven: ≥5 одиночных значений против reference-строк из живых YT URL.
  - ≥3 комбинации (Sort+Date, Date+Duration, Sort+Duration+Type).
  - Граничные enum'ы (первый и последний вариант каждого).

- `tests/content/search-url-rewriter.test.ts` (новый)
  - `rewriteIfNeeded`:
    - not `/results` → URL не меняется.
    - `/results` без `sp`, `any`-filters → URL не меняется.
    - `/results` без `sp`, есть не-`any` → URL получает `sp`.
    - `/results` с существующим `sp` → URL не меняется.
  - SPA-integration тест: monkey-patch `history.replaceState`, dispatch'им `yt-navigate-start`, проверяем вызов `replaceState` с правильным URL.

- `tests/content/inline-ui.test.ts` (переписан)
  - `createFiltersButton` — DOM, aria, текст, бейдж скрыт по умолчанию.
  - `mountFiltersButton` — idempotent, вставляется перед `#buttons`.
  - `syncButtonBadge(true)` — атрибут + видимость бейджа.
  - `openPanel(btn)` — панель появляется в body, все 4 select'а и 1 toggle рендерятся с правильными value из settings.
  - `closePanel()` — панель удаляется.
  - Change на `<select>` внутри панели → мок `chrome.storage.sync.set` вызван с правильным ключом и значением.
  - Change на toggle внутри панели → аналогично.

- `tests/popup/filters-section.test.ts` (дополняем)
  - Проверка: в popup-секции НЕТ `<select>` (YT-фильтры не дублируются).
  - Существующие тесты слайдера порога — без изменений.

- `tests/defaults.test.ts` (дополняем)
  - Новые 4 ключа присутствуют с правильными дефолтами.

### 10.2 TDD-порядок

1. `sp-encoder.ts` — pure функция, table-driven тесты. Самодостаточна.
2. `search-url-rewriter.ts` — pure `rewriteIfNeeded` сначала, затем SPA listener.
3. `inline-ui.ts` — снизу вверх: `createFiltersButton` → `mountFiltersButton` → `createPanel` → `openPanel/closePanel` → wiring на storage.
4. `bootstrap.ts` — рефакторинг: удаление chip-логики, подключение `installNavListener`, mount `mountFiltersButton`.
5. Popup-секция — assertion о отсутствии дубликатов.
6. Удаление старых тестов chip'а (после того как новые полностью покрывают функциональность).

### 10.3 Ручная верификация (чеклист в PR)

- [ ] Кнопка «Фильтры» видна на `/`, `/results`, `/watch`, `/shorts`.
- [ ] Клик открывает панель; повторный клик / клик вне / Esc закрывают.
- [ ] Бейдж появляется когда любой фильтр активен.
- [ ] Toggle «Просмотренные» работает — карточки скрываются мгновенно.
- [ ] Изменение порога watched в popup — карточки перестраиваются.
- [ ] Настройка всех 4 YT-фильтров, затем ввод запроса → URL содержит `&sp=...` → результаты отфильтрованы.
- [ ] Повторный поиск (новый запрос) — `sp=` снова дописывается.
- [ ] Открытие `/results?search_query=X` напрямую (из истории) — фильтры применяются через replaceState.
- [ ] Пользователь вручную кликает встроенный YT-фильтр («Upload date → this hour») — наш rewriter не перетирает его `sp=`.
- [ ] Все настройки пережили перезагрузку страницы.
- [ ] Темизация: кнопка и панель читабельны и в тёмной, и в светлой теме YT.
- [ ] Keyboard: Tab доходит до кнопки, Enter открывает, Tab циклит внутри панели, Esc закрывает.

## 11. Edge cases и ошибки

- **Пользователь открыл `/results?search_query=X` напрямую**: `yt-navigate-start` не срабатывает. Fallback — `replaceState` в `yt-navigate-finish`/`DOMContentLoaded`, проверка `!url.searchParams.has('sp')` + флаг `sessionStorage['yz-sp-applied']=timestamp` против циклов.
- **Пользователь вручную кликнул нативный YT-фильтр**: URL получает свой `sp=` от YT; `rewriteIfNeeded` видит уже существующий `sp`, не трогает. Пользовательский выбор побеждает наши defaults.
- **Все фильтры в дефолте**: `encodeSp` возвращает `null`, rewriter не пишет `sp`. Поведение YT — как без расширения.
- **Панель открыта во время SPA-навигации**: `closePanel()` вызывается из `yt-navigate-start` listener'а до `rewriteIfNeeded`.
- **Storage недоступен** (редко, private mode, quota): читаем `DEFAULT_SETTINGS`, rewriter работает с дефолтами (т.е. не пишет `sp`). UI — все поля в `any`.
- **YouTube поменял разметку masthead**: `mountFiltersButton` возвращает `null` → mount-observer продолжает пытаться на каждой мутации DOM (тот же паттерн что был у chip'а).
- **Пользователь внешне импортировал settings с невалидным enum-значением** (например, `filterSearchSort: 'invalid'`): `sp-encoder` получает неизвестное значение, возвращает `null` для этой группы. UI-select показывает `any`/дефолт (так как value не матчится ни одному `<option>`). Без краша.
- **sp-encoder падает** (не должен, но гипотетически): catch в rewriter'е → URL не трогаем, фильтры пропускаются. Не ломаем поиск.

## 12. Accessibility

- `<button aria-haspopup="dialog" aria-expanded="..." aria-label="Фильтры">`.
- Панель — `role="dialog"` с `aria-label="Фильтры"`, `aria-modal="false"` (клик вне закрывает, не modal в строгом смысле).
- Focus trap: простой цикл через keydown Tab/Shift+Tab.
- Esc закрывает, focus возвращается на кнопку.
- Нативные `<select>` и `<input type="checkbox">` — полностью клавиатурно доступны.

## 13. Что отложено на Фазу 2+

- Применение YT-фильтров на `/` (home feed) и `/watch` (sidebar) — client-side парсинг метаданных карточек (длительность, дата, тип, фичи) с учётом локализации.
- Новые client-side фильтры: по длительности, минимальным просмотрам, блок-листу каналов, регексу заголовков.
- Авто-применение `sp=` при вводе URL напрямую в адресную строку браузера (минуя YouTube search box) — требует `declarativeNetRequest`.
- Persistence на уровне аккаунта YouTube (через их API) — мы работаем чисто клиентски.
