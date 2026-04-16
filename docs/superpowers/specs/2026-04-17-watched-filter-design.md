# Фильтр «скрыть просмотренные видео» — дизайн

**Дата:** 2026-04-17
**Статус:** draft
**Автор:** совместный brainstorming
**Контекст:** первая подсистема крупной фичи «Фильтры ленты». Остальные подсистемы (дополнительные client-side фильтры, автоприменение серверных `sp=`, замена нативного chip-bar) — отдельными спеками.

## 1. Цель

Дать пользователю возможность скрывать из лент YouTube карточки видео, которые он уже смотрел выше настраиваемого порога прогресса. Порог по умолчанию — 20%.

Управление функцией — inline-чип рядом с полем поиска YouTube (быстрый on/off). Настройка порога — в popup расширения, в секции «Фильтры ленты» (заменяет текущий stub).

## 2. Scope

**Страницы, где фильтр работает**:
- `/` — главная (home feed)
- `/results` — результаты поиска
- `/watch` — sidebar «Далее»

**Страницы, где фильтр отключён** (UI-чип скрыт, фильтрация не запускается):
- `/shorts`, `/playlist`, `/channel/*`, `/feed/subscriptions` и прочее.

**Что явно вне этого спека**:
- Другие client-side фильтры (длительность, просмотры, блок-лист каналов, regex по заголовкам).
- Автоприменение серверных фильтров к URL `/results`.
- Замена нативного chip-bar поиска.
- Собственные фильтры на странице подписок.

## 3. Архитектура и границы модулей

```
src/content/
  index.ts                      # точка входа, уже есть
  css-injector.ts               # CSS-инжектор (существующий), здесь же объявлен @keyframes yz-vanish
  selectors.ts                  # HIDE_RULES, уже есть
  filters/                      # NEW
    watched.ts                  # parseProgressPercent, shouldHide, applyWatchedClass, scanCard
    observer.ts                 # generic MutationObserver wrapper
    inline-ui.ts                # chip рядом с search bar + storage bindings
    bootstrap.ts                # связывание модулей + SPA-nav listener

src/shared/
  types.ts                      # +filterWatchedEnabled, +filterWatchedThreshold в ZenSettings
  defaults.ts                   # дефолты для этих ключей

src/popup/sections/
  filters.ts                    # render секции «Фильтры ленты» (заменяет stub)
```

**Границы**:

- `watched.ts` содержит чистые функции. Не знает про storage, observer, UI — только про DOM карточки и порог.
  - `parseProgressPercent(el: Element | null): number | null`
  - `shouldHide(card: Element, threshold: number): boolean`
  - `applyWatchedClass(card: Element, threshold: number): void` (ставит/снимает класс `yz-watched`)
  - `scanCard(card: Element, threshold: number): void` (обёртка, вызываемая извне)
  - `CARD_SELECTORS: string[]` — `['ytd-rich-item-renderer', 'ytd-video-renderer', 'yt-lockup-view-model']`

- `observer.ts` — generic. Принимает список селекторов и callback, возвращает `dispose`. Без знания про watched.

- `inline-ui.ts` — отвечает за DOM-чип и его взаимодействие со storage. Не знает про фильтрацию карточек.

- `bootstrap.ts` — единственная точка, знающая про все три модуля сразу: инициализация, `yt-navigate-finish` listener, подписка на `chrome.storage.onChanged`.

- `popup/sections/filters.ts` — UI слайдера порога + hint. Не знает о toggle функции (его нет в popup).

## 4. Data flow

**Чтение (реагирование на изменения)**:

```
chrome.storage.sync
  ├── filterWatchedEnabled  ──► bootstrap ──► html.yz-watched-filter-on toggle
  │                              └─ inline-ui chip data-active
  └── filterWatchedThreshold ──► bootstrap ──► re-scan всех видимых карточек
                                 └─ popup slider value
```

**Запись (источники)**:

- Inline chip click → `chrome.storage.sync.set({ filterWatchedEnabled: !current })`.
- Popup slider input (debounce 150 ms) → `chrome.storage.sync.set({ filterWatchedThreshold: value })`.

**Единый источник правды для on/off** — chip на YouTube. Popup не содержит второго переключателя enabled.

## 5. DOM-селекторы и верификация

Подтверждено через Chrome DevTools MCP (2026-04-17):

| Элемент | Селектор | Верификация |
|---|---|---|
| Карточка на `/results` | `ytd-video-renderer` | ✅ 19 экземпляров |
| Карточка на `/` | `ytd-rich-item-renderer` | ⏸ без логина главная пуста, финализировать при impl |
| Карточка в sidebar `/watch` | `yt-lockup-view-model` | ✅ **новая Material-разметка**, не `ytd-compact-video-renderer` |
| Якорь для chip | `ytd-masthead #end > #buttons` (вставить перед) | ✅ структура подтверждена |
| Event SPA-навигации | `yt-navigate-finish` на `window` | ✅ документирован, стабилен |

**Open questions, финализируемые на первом TDD-цикле в залогиненной сессии:**

1. Progress ribbon внутри `ytd-video-renderer` и `ytd-rich-item-renderer`: ожидается `ytd-thumbnail-overlay-resume-playback-renderer #progress[style*="width"]`. Без логина overlay не рендерится — верифицируем на живой залогиненной странице в рамках первого red-теста (не блокирует написание тестов, т. к. фикстуры статичны).
2. Progress ribbon внутри `yt-lockup-view-model` (новая разметка) — структура отличается. Кандидат: `yt-thumbnail-view-model [class*="progress"]` или data-атрибут. Адаптер `parseProgressPercent` должен уметь обе формы — реализуем через two-branch lookup.

Если YouTube поменял структуру полностью — фикс точечный, в `parseProgressPercent` и списке селекторов, остальная архитектура стабильна.

## 6. Inline chip (UI на YouTube)

**Якорь:** внутри `ytd-masthead #end`, вставляем элемент **перед** `#buttons` (после `#masthead-skeleton-icons`) — chip оказывается левее стандартных кнопок (логин/создать/аватар), ближе к полю поиска. `#masthead-skeleton-icons` — плейсхолдер YouTube, скрывается после прогрузки кнопок.

**HTML:**
```html
<button id="yz-chip-watched" class="yz-chip" data-active="false" aria-pressed="false">
  <span class="yz-chip__icon">◑</span>
  <span class="yz-chip__label">Просмотренные</span>
</button>
```

**Стили** — в новом `src/content/inline-ui.css`, инжектится тем же механизмом, что и остальные стили:
- Высота ~32 px, padding ~0 12 px, border-radius 16 px.
- Фон и цвет следуют YouTube-теме (CSS-переменные YT `--yt-spec-*` доступны на `:root`).
- `data-active="false"` → тусклый (`opacity .65`, фон нейтральный).
- `data-active="true"` → акцентный фон, полная непрозрачность.
- `:hover`, `:focus-visible` — подсветка рамки.

**Поведение:**
- Click → тоглим `filterWatchedEnabled` в storage.
- На `chrome.storage.onChanged` → обновляем `data-active` и `aria-pressed`.
- На `yt-navigate-finish` → пересчитываем видимость: `display: none` если `pathname` не в allowlist, иначе показываем.
- Allowlist pathname: `/`, `/results`, `/watch`.

## 7. MutationObserver, сканирование, SPA

**Observer** (`observer.ts`):
- Один наблюдатель на `document.documentElement`, `childList: true, subtree: true`.
- Для каждой добавленной Element-ноды: если сама матчится одному из `CARD_SELECTORS` или содержит такую внутри — callback с найденной карточкой.
- Dispose через возвращаемую функцию.

**Начальное сканирование:**
- После `DOMContentLoaded` (или сразу, если скрипт стартовал позже): `requestIdleCallback(scanAllVisible)`.
- `scanAllVisible()` = `document.querySelectorAll(CARD_SELECTORS.join(','))` → `scanCard` для каждой.

**SPA-навигация:**
- `window.addEventListener('yt-navigate-finish', onNav)`.
- `onNav` → (а) обновить видимость chip, (б) запустить `scanAllVisible`.

**Observer живёт всё время жизни content script** — не пересоздаётся между SPA-переходами.

**Реакция на storage change:**
- `filterWatchedEnabled: false` → снимаем класс `yz-watched-filter-on` с `<html>`. Карточки мгновенно возвращаются (CSS-правило больше не активно). Классы `yz-watched` на карточках НЕ трогаем — при последующем `true` они активируются без re-scan.
- `filterWatchedEnabled: true` → ставим класс `yz-watched-filter-on` + `scanAllVisible` (на случай, если карточки пришли при выключенном фильтре).
- `filterWatchedThreshold: X` → `scanAllVisible` (пересчитываем `yz-watched` для всех).

## 8. CSS

Дополняем существующий `src/content/css-injector.ts` новым правилом (отдельный файл не создаём — держим один источник injected-стилей):

```css
html.yz-watched-filter-on .yz-watched {
  animation: yz-vanish 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
}

@media (prefers-reduced-motion: reduce) {
  html.yz-watched-filter-on .yz-watched {
    animation: none;
    display: none;
  }
}
```

Длительность и easing — те же, что у существующего применения `yz-vanish`, для визуальной консистентности. `@keyframes yz-vanish` уже определён в `css-injector.ts` и переиспользуется.

`html.yz-watched-filter-on` добавляется/убирается из JS при изменении `filterWatchedEnabled`.

## 9. Popup — секция «Фильтры ленты»

Заменяем `makeStub('Фильтры ленты', '◎')` в `src/popup/sections.ts:28` на `renderFilters` из нового файла `src/popup/sections/filters.ts`.

**Layout:**

```
┌─────────────────────────────────┐
│ ◎ Фильтры ленты                 │   breadcrumb (как в других секциях)
├─────────────────────────────────┤
│   Просмотренные видео           │   group header
│                                 │
│   Порог «просмотрено»           │
│   ├─────●──────────────┤ 20%   │   input[type=range], 0..100, step 5
│   Видео с прогрессом ≥ 20%      │
│   считается просмотренным       │   live-hint
│                                 │
│   Управление on/off — чип       │   footnote (ссылка на YouTube)
│   рядом с полем поиска YouTube  │
└─────────────────────────────────┘
```

**Детали:**
- Нет отдельного toggle enabled — on/off делегирован inline chip'у.
- Slider — нативный `<input type="range" min="0" max="100" step="5">`, стилизованный под Paper-тему.
- Hint-текст обновляется реактивно (как `<p>` с `textContent`), без отдельного рендера.
- `storage.set` с debounce 150 ms на `input` event.

## 10. Типы и настройки

В `src/shared/types.ts`:

```ts
export interface ZenSettings {
  // существующие поля…
  filterWatchedEnabled: boolean;
  filterWatchedThreshold: number; // 0..100
}
```

В `src/shared/defaults.ts`:

```ts
export const DEFAULTS: ZenSettings = {
  // существующие…
  filterWatchedEnabled: false,
  filterWatchedThreshold: 20,
};
```

Дефолты не пишутся в storage автоматически — читаются как fallback при отсутствии ключа (существующий паттерн проекта).

## 11. Тестирование

**Юнит (Vitest, jsdom):**
- `tests/content/watched.test.ts`
  - `parseProgressPercent`: `null` на отсутствующем элементе; `null` на невалидном `width` (`auto`, пусто); корректные `0`, `100`, `73`, дроби, пробелы.
  - `shouldHide`: карточка без overlay → `false`; с `width < threshold` → `false`; с `width >= threshold` → `true`; threshold edge cases 0, 100.
  - `applyWatchedClass`: ставит класс когда нужно, снимает когда нет.
- `tests/content/observer.test.ts`
  - Callback вызывается для добавленных карточек; не вызывается после `dispose`; фильтрация по селекторам работает.
- `tests/popup/filters-section.test.ts`
  - Рендер: порог 20 → hint «≥ 20%».
  - Drag slider → через debounce происходит `storage.set` с новым значением.
- `tests/fixtures/cards.ts` — builders для трёх типов карточек (старая разметка + `yt-lockup-view-model`).

**TDD-порядок**: `parseProgressPercent` → `shouldHide` → `applyWatchedClass` → `scanCard` → `observer callback` → UI поверх.

**Ручная верификация** — чеклист в PR:
- [ ] Chip виден на `/`, `/results`, `/watch`; скрыт на `/shorts`, `/playlist`.
- [ ] Click по chip моментально скрывает/показывает карточки.
- [ ] Изменение порога в popup перестраивает ленту.
- [ ] Нет flash при первом рендере страницы.
- [ ] `prefers-reduced-motion: reduce` — без анимации, скрытие мгновенное.
- [ ] Клавиатурная навигация: chip фокусируется, активируется Enter/Space.

**Что НЕ покрываем автотестами:** живой YouTube DOM (ложная уверенность), инжекцию CSS (консистентно с существующим кодом), полный жизненный цикл content script (нет e2e-фреймворка).

## 12. Edge cases

- **Нет `#progress`** → watched% = `null` → не скрываем.
- **`style="width: —"`, пусто, auto** → `parseProgressPercent` возвращает `null` → не скрываем.
- **Live-видео** — обычно без resume-playback overlay; не трогаем. Если случайно найдётся — работает общий алгоритм.
- **Shorts** (`ytd-rich-shelf-renderer[is-shorts]`) — не в `CARD_SELECTORS`, не фильтруются этим модулем.
- **Карточка скрыта через существующий cleaner (`fixUblock` и т. п.)** — наш класс `yz-watched` независим, коллизий нет.
- **Порог = 0** — скрывать любое начатое видео (включая 0.1%). Допустимо.
- **Порог = 100** — скрывать только полностью просмотренные. Допустимо.
- **YouTube поменял разметку, селекторы не находят ничего** — тихо ничего не делаем. Ни `console.warn`, ни fallback'ов. Пользователь заметит → issue → фиксим DOM-селектор.

## 13. Accessibility

- Chip: `<button aria-pressed="true|false">`, лейбл «Скрыть просмотренные».
- Slider: `<input type="range">` с `aria-valuetext="Порог 20%"` и связанным `<label>`.
- Keyboard: Enter/Space на chip, стрелки на slider.
- Respect `prefers-reduced-motion: reduce`.

## 14. Невошедшее / отложенное

- **Блок-лист каналов, regex по заголовкам, фильтр по длительности и просмотрам** — отдельные фичи, но архитектура (`observer.ts` + список `filters/*.ts`) готова их принимать.
- **Собственный chip-bar поверх нативного** — отдельная подсистема.
- **Автоприменение серверных фильтров `sp=`** — отдельная подсистема.
- **Синхронизация состояния между несколькими открытыми вкладками** — обеспечивается автоматически через `chrome.storage.sync` + `onChanged`.
- **Persist состояния toggle на уровне отдельных категорий страниц** — сейчас один глобальный enabled, этого достаточно для MVP.
