# Popup UI — редизайн с заделом на рост

**Дата:** 2026-04-17
**Статус:** утверждён, готов к writing-plans

## Контекст

Текущий popup (`popup.html` + `src/popup/popup.ts` + `src/popup/popup.css`, 320px) — одноэкранный список тогглов с группами по `group` из `HIDE_RULES`. Всё на одном скролле, декоративный «Dark Zen» градиент, emoji-лого 🧘, мастер-свитч справа в хедере.

Пользователь: «всё сразу плохо» + в будущем popup будет обрастать фичами, **не относящимися к UX-cleaner**: персонализация (темы YouTube / кастомный CSS) и инструменты поверх видео (скорость, буфер, скачивание, транскрипты), плюс кастомная фильтрация ленты (скрывать просмотренное/начатое/по длительности и т.п.).

Значит текущая архитектура «один экран тогглов» не тянет — нужна структура, в которую **добавление нового раздела стоит одну запись в реестре**.

## Цели

1. Заменить одноэкранный popup на **rail + контент**: слева вертикальная колонка иконок разделов, справа — активный раздел.
2. Визуальный стиль: **светлый минимал** («Paper» — Linear/Raycast-like), компактные паддинги, ширина **320px**.
3. **Расширяемость**: добавление нового раздела = 1 запись в декларативном реестре + иконка в rail. Popup-каркас не переписывается.
4. Сохранить текущий функционал UX-cleaner: все 12 тогглов в `HIDE_RULES` остаются работающими через секцию «Очистка UI».
5. Заложить **5 разделов rail** (Очистка UI · Фильтры · Инструменты · Темы · Настройки), из которых сейчас функциональна только «Очистка UI» + «Настройки» (минимум — reset). Остальные 3 — видимые кнопки rail со стабом «скоро».

## Не-цели

- Реализация самих фич Фильтров / Инструментов / Тем. Только архитектурная точка входа.
- Поддержка тёмной темы popup (пока только светлая; `prefers-color-scheme` — в будущем).
- Хоткеи как отдельный раздел — пользователь отказался.
- Поиск по правилам внутри секции (пока правил мало — не нужен; 12 пунктов помещаются без скролла).
- Миграция/версионирование `chrome.storage.sync` (схема совместима — добавляем ключи, старые остаются).

## Архитектура

### Реестр разделов

Новый модуль `src/popup/sections.ts` экспортирует декларативный массив:

```ts
export interface PopupSection {
  id: string;              // stable id, напр. 'cleaner'
  label: string;           // 'Очистка UI' — для title и tooltip rail
  icon: string;            // unicode glyph / svg path
  position: 'top' | 'bottom'; // top — основная группа, bottom — настройки
  render(container: HTMLElement, settings: ZenSettings): void;
}

export const SECTIONS: PopupSection[] = [
  { id: 'cleaner', label: 'Очистка UI',      icon: '✦', position: 'top',    render: renderCleaner },
  { id: 'filters', label: 'Фильтры ленты',   icon: '◎', position: 'top',    render: renderStub   },
  { id: 'tools',   label: 'Инструменты',     icon: '▶', position: 'top',    render: renderStub   },
  { id: 'themes',  label: 'Темы',            icon: '◐', position: 'top',    render: renderStub   },
  { id: 'settings',label: 'Настройки',       icon: '⚙', position: 'bottom', render: renderSettings },
];
```

`renderStub` — одинаковая заглушка «Скоро. Следите за релизами» + кнопка-ссылка на github. Добавление новой фичи = замена `renderStub` на реальный `renderX` + опционально дополнительные блоки `group-label` внутри.

### Каркас popup

`popup.ts` стал orchestrator:

1. `init()` — читает `chrome.storage.sync`, монтирует каркас (header + body [rail, content] + опц. footer внутри «Настроек»).
2. Рендерит rail из `SECTIONS` (top-группа сверху, spacer, bottom-группа снизу). Каждая кнопка — `<button>` с aria-label = `label`, tooltip через `title`.
3. Выбранная секция хранится в `chrome.storage.sync` (ключ `activeSection`, дефолт `'cleaner'`) — чтобы при повторном открытии popup сохранялся раздел.
4. Клик по кнопке rail: обновляет active-класс, вызывает `section.render(contentEl, settings)`.
5. Изменения `chrome.storage.sync` снаружи (из другого окна popup или background): `storage.onChanged` триггерит перерендер **только активной секции**.

### Секция «Очистка UI»

`renderCleaner(container, settings)`:

1. Собирает `HIDE_RULES` → группирует по `rule.group` (`feed`, `sidebar`, `video`, `footer`) → использует `GROUP_LABELS`.
2. Для каждой группы — `.group-label` + `.group` со списком `.row` (label + toggle).
3. Клик по `.row` или toggle — пишет в `chrome.storage.sync` ключ `ToggleKey` → content script ловит через существующий `storage.onChanged` listener и обновляет CSS.
4. Сверху секции — `.section-head` с заголовком «Очистка UI» и счётчиком `N / M` (активных / всего).

### Секция «Настройки»

`renderSettings(container, settings)`:

- Кнопка «Сбросить к дефолтам» → `chrome.storage.sync.set(DEFAULT_SETTINGS)`.
- Блок «О расширении» — версия из `chrome.runtime.getManifest().version`, ссылка на репо.

### Хранение

- Все существующие ключи `ZenSettings` остаются без изменений.
- Новый ключ `activeSection: string` — какой раздел был открыт последним. Добавить в `ZenSettings` и `DEFAULT_SETTINGS` (`'cleaner'`).
- `chrome.storage.sync.get(DEFAULT_SETTINGS)` гарантирует, что у существующих пользователей отсутствующий `activeSection` заполнится дефолтом.

## Визуальный layout

Все значения финальные (мокап v2):

- **Popup**: 320px width, background `#fafaf9`, border `1px solid #e7e5e4`, radius `12px`.
- **Header**: 32px height; logo-монограмма 20×20px (чёрный квадрат `#18181b`, белая «Z»); title 12px/600; master-switch `chrome.storage.sync.enabled` — 28×16px.
- **Body**: `display: flex`.
  - **Rail**: 36px width, background `#f7f5f3`, border-right `1px solid #f0eeec`, `flex-direction: column; gap: 2px; padding: 6px 5px`. Кнопки 26×26px, radius 6px; active — `background:#18181b; color:#fafaf9`, inactive — `color:#a8a29e`.
  - **Content**: `flex: 1`, `padding: 8px 10px`, `max-height: 480px; overflow-y: auto`.
- **Row**: `padding: 4px 6px; border-radius: 5px`; hover — `background: #f4f4f3`.
- **Toggle**: 22×12px, on — `#18181b`, off — `#e7e5e4`; knob 8×8px `#fff`.
- **Шрифт**: системный стек `-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`. Никаких Google Fonts по сети — работает оффлайн, никаких preconnect в `popup.html`. Из `popup.html` удаляется `<link>` на `fonts.googleapis.com` и `DM Sans`.

**Анимации**: смена секции — `opacity: 0 → 1` за 0.15s. Нет staggered fadeInUp (текущий), нет переходов rail — мгновенно.

## Структура файлов

```
src/popup/
  popup.ts        # orchestrator: читает storage, монтирует каркас, управляет rail
  popup.css       # все стили (paper-тема)
  sections.ts     # SECTIONS реестр + типы
  sections/
    cleaner.ts    # renderCleaner (HIDE_RULES → DOM)
    settings.ts   # renderSettings
    stub.ts       # renderStub для «скоро»
  storage.ts      # тонкая обёртка над chrome.storage.sync с типизацией (get/set/subscribe)
```

`popup.html` — минимальный каркас со статической структурой. TS заполняет только содержимое, не создаёт контейнеры:

```html
<body>
  <div class="popup">
    <header class="popup-header">
      <div class="logo">Z</div>
      <div class="title">YouTube Zen</div>
      <label class="master-switch"><input type="checkbox" id="master"><span></span></label>
    </header>
    <div class="popup-body">
      <nav class="rail" id="rail"></nav>
      <main class="content" id="content"></main>
    </div>
  </div>
  <link rel="stylesheet" href="./src/popup/popup.css">
  <script type="module" src="./src/popup/popup.ts"></script>
</body>
```

`popup.ts` находит `#rail`, `#content`, `#master` через `querySelector` и заполняет их динамически.

## Типы

Обновить `src/shared/types.ts`:

```ts
export interface ZenSettings {
  enabled: boolean;
  // … существующие ToggleKey (shorts, playlists, liked, yourVideos, downloads,
  // subscriptions, navigator, explore, reportButton, footer, actionPanel, fixUblock)
  activeSection: string; // id секции popup, дефолт 'cleaner'
}
```

## Тесты

Vitest, pure-функции, без jsdom/браузера.

**Что покрыть:**

1. `sections.ts`:
   - `SECTIONS` содержит все ожидаемые id (`cleaner`, `filters`, `tools`, `themes`, `settings`).
   - `settings` имеет `position: 'bottom'`, остальные — `'top'`.
   - Каждая секция имеет не-пустой `label` и `icon`.
   - Нет дубликатов `id`.

2. `storage.ts` (mock `chrome.storage.sync`):
   - `get` возвращает merge дефолтов со stored.
   - `set` вызывает `chrome.storage.sync.set` с теми же ключами.
   - `subscribe` регистрирует listener в `chrome.storage.onChanged`.

3. `defaults.ts` / `types.ts`:
   - `DEFAULT_SETTINGS.activeSection === 'cleaner'`.
   - Все ключи из `ZenSettings` имеют дефолт.

**Что НЕ покрываем:** DOM-рендеринг секций. Проверка вручную через `npm run build` + загрузка расширения в Chrome.

## Что меняется в остальном коде

- `src/content/*` — **без изменений**. Содержимое `HIDE_RULES` и механизм CSS-injection остаются.
- `src/shared/defaults.ts` — добавляется `activeSection: 'cleaner'`.
- `src/shared/types.ts` — добавляется `activeSection: string` в `ZenSettings`.
- `src/background/*` — без изменений (просто включает новый ключ в defaults при install).
- `manifest.json` — без изменений.

## Риски и их обработка

| Риск | Mitigation |
|------|------------|
| Rail с 5 кнопками + контент не помещаются в 320px | Замерено в мокапе v2: 36px rail + 10px padding + 22px toggle + ~240px лейбл-зона = помещается, русские лейблы до «Другие возможности» не обрезаются |
| `system-ui` на Windows рендерит криво | Fallback-стек начинается с `-apple-system`, `Segoe UI` вторым — на Windows получим нейтив |
| `activeSection` с неизвестным id (обновление, старый storage) | При load — `SECTIONS.find(s => s.id === stored.activeSection) ?? SECTIONS[0]` |
| Пользователь открывает popup с **выключенным** master-switch | Rail остаётся активным, контент секции в `.disabled` стейте (opacity 0.4, pointer-events: none) — как сейчас |
| Перерисовка rail при каждом storage change | Rail рендерим один раз на init. Слушаем только `activeSection` и настройки активной секции |

## Масштабируемость: как добавить новую секцию

1. Написать `src/popup/sections/myFeature.ts` с `export function renderMyFeature(container, settings)`.
2. Добавить запись в `SECTIONS` в `sections.ts` — id, label, icon, render.
3. Если секция хранит своё состояние — добавить ключи в `ZenSettings` + `DEFAULT_SETTINGS`.
4. Тесты — обновить snapshot id-шников в `sections.test.ts`.

Никаких изменений в `popup.ts`, `popup.css` (если нужна новая CSS — добавляется в scope секции или в общий файл).
