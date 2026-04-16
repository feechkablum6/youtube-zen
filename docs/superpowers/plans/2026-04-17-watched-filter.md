# Watched-video Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить первый client-side фильтр ленты YouTube — скрытие карточек видео с прогрессом ≥ настраиваемого порога. On/off — inline-чип рядом с полем поиска YouTube; порог — слайдер в секции popup «Фильтры ленты».

**Architecture:** Content script расширяется подкаталогом `src/content/filters/` с чистыми функциями парсинга прогресса, generic MutationObserver-обёрткой и inline-UI модулем. Фильтрация — добавление класса `yz-watched` на карточку + CSS-правило (переиспользует существующую анимацию `yz-vanish`). Popup получает новую секцию со слайдером порога; источник правды on/off — только inline chip. Вся коммуникация — через `chrome.storage.sync`.

**Tech Stack:** TypeScript (strict), Manifest V3, Vite + esbuild, Vitest + jsdom для DOM-тестов.

**Spec:** [docs/superpowers/specs/2026-04-17-watched-filter-design.md](../specs/2026-04-17-watched-filter-design.md).

---

## File Structure

**Создать:**
- `src/content/filters/watched.ts` — чистые функции: `parseProgressPercent`, `shouldHide`, `applyWatchedClass`, `scanCard`, константа `CARD_SELECTORS`.
- `src/content/filters/observer.ts` — generic MutationObserver wrapper.
- `src/content/filters/inline-ui.ts` — chip на YouTube + binding к storage.
- `src/content/filters/bootstrap.ts` — оркестратор: init, SPA-nav, storage.onChanged, объединение watched + observer + inline-ui.
- `src/popup/sections/filters.ts` — `renderFilters` (слайдер порога + hint).
- `tests/content/watched.test.ts` — юниты parseProgressPercent / shouldHide / applyWatchedClass.
- `tests/content/observer.test.ts` — MutationObserver wrapper.
- `tests/content/fixtures.ts` — фабрики карточек (три разметки).
- `tests/popup/filters-section.test.ts` — рендер секции, debounced запись в storage.

**Модифицировать:**
- `src/shared/types.ts` — +`filterWatchedEnabled`, +`filterWatchedThreshold` в `ZenSettings`.
- `src/shared/defaults.ts` — дефолты двух новых ключей.
- `src/content/css-injector.ts` — добавить CSS-правило для `html.yz-watched-filter-on .yz-watched` (независимо от других селекторов, основываясь на `settings.filterWatchedEnabled`).
- `src/content/main.ts` — подключить `bootstrap()` из `filters/bootstrap.ts`.
- `src/popup/sections.ts:28` — заменить `makeStub('Фильтры ленты', '◎')` на `renderFilters`.
- `package.json` — +`jsdom` в devDependencies.
- `vite.config.ts` — `test.environment = 'jsdom'` (по умолчанию для всех тестов — дешёвый способ без docblock'ов).
- `tests/popup/sections.test.ts` — обновить тест `has a render function` (остаётся валидным; если падает — синхронизировать).

---

## Task 1: Подключить jsdom окружение для тестов

**Why**: Текущие тесты — только pure functions. Нам нужен `document` для тестов watched.ts / observer.ts / filters-section.ts. Проще всего — включить jsdom глобально для Vitest. Overhead минимальный, все существующие тесты продолжат проходить.

**Files:**
- Modify: `package.json` (add jsdom to devDependencies)
- Modify: `vite.config.ts:76-78` (add `environment: 'jsdom'`)

- [ ] **Step 1: Установить jsdom**

```bash
npm install --save-dev jsdom @types/jsdom
```

- [ ] **Step 2: Настроить Vitest environment**

Edit `vite.config.ts:76-78` — заменить:

```ts
  test: {
    globals: true,
  },
```

на:

```ts
  test: {
    globals: true,
    environment: 'jsdom',
  },
```

- [ ] **Step 3: Убедиться, что существующие тесты не сломались**

Run: `npm test`
Expected: все текущие тесты продолжают проходить (никаких падений). Проверить вывод — должно быть 0 failures.

- [ ] **Step 4: Добавить smoke-тест окружения**

Create `tests/env.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('test environment', () => {
  it('has document available (jsdom)', () => {
    const div = document.createElement('div');
    div.textContent = 'hi';
    expect(div.textContent).toBe('hi');
  });
});
```

Run: `npm test -- env`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.ts tests/env.test.ts
git commit -m "test: switch Vitest env to jsdom for DOM-based filter tests"
```

---

## Task 2: Расширить ZenSettings и дефолты

**Files:**
- Modify: `src/shared/types.ts:1-16`
- Modify: `src/shared/defaults.ts:3-18`
- Test: `tests/defaults.test.ts`

- [ ] **Step 1: Failing test для новых дефолтов**

Read `tests/defaults.test.ts` and add at the end of the relevant describe block:

```ts
  it('has watched filter disabled by default', () => {
    expect(DEFAULT_SETTINGS.filterWatchedEnabled).toBe(false);
  });

  it('has watched threshold default of 20', () => {
    expect(DEFAULT_SETTINGS.filterWatchedThreshold).toBe(20);
  });
```

- [ ] **Step 2: Verify tests fail**

Run: `npm test -- defaults`
Expected: FAIL — TypeScript errors: `filterWatchedEnabled` / `filterWatchedThreshold` do not exist on `ZenSettings`.

- [ ] **Step 3: Extend `ZenSettings`**

Edit `src/shared/types.ts:1-16`, add to interface before the closing brace:

```ts
  filterWatchedEnabled: boolean;
  filterWatchedThreshold: number;
```

- [ ] **Step 4: Add defaults**

Edit `src/shared/defaults.ts:3-18`, add entries inside the object:

```ts
  filterWatchedEnabled: false,
  filterWatchedThreshold: 20,
```

- [ ] **Step 5: Verify all tests pass**

Run: `npm test`
Expected: PASS (all tests, including new ones and existing).

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/shared/types.ts src/shared/defaults.ts tests/defaults.test.ts
git commit -m "feat(settings): add filterWatchedEnabled + filterWatchedThreshold"
```

---

## Task 3: Фикстуры карточек

**Why**: Следующие задачи тестируют `parseProgressPercent`, `shouldHide`, `scanCard`. Фабрики карточек нужны всем — выделяем их в одно место.

**Files:**
- Create: `tests/content/fixtures.ts`

- [ ] **Step 1: Создать файл фикстур**

```ts
// tests/content/fixtures.ts
// Фабрики DOM-фикстур карточек YouTube. Используются юнит-тестами
// фильтров. Структуры упрощены до нужного минимума: thumbnail-контейнер
// с optional progress overlay. Реальные карточки содержат сотни
// атрибутов, но для парсинга progress важен только `#progress[style]`
// внутри `ytd-thumbnail-overlay-resume-playback-renderer`.

export type ProgressSpec = number | null | 'invalid' | 'missing-style';

function buildProgressOverlay(spec: ProgressSpec): HTMLElement | null {
  if (spec === null) return null;
  const overlay = document.createElement('ytd-thumbnail-overlay-resume-playback-renderer');
  const progress = document.createElement('div');
  progress.id = 'progress';
  if (spec === 'invalid') {
    progress.setAttribute('style', 'width: auto');
  } else if (spec === 'missing-style') {
    // no style attr at all
  } else {
    progress.setAttribute('style', `width: ${spec}%`);
  }
  overlay.appendChild(progress);
  return overlay;
}

function buildCard(tag: string, progress: ProgressSpec): HTMLElement {
  const card = document.createElement(tag);
  const thumb = document.createElement('ytd-thumbnail');
  const overlay = buildProgressOverlay(progress);
  if (overlay) thumb.appendChild(overlay);
  card.appendChild(thumb);
  return card;
}

export function homeCard(progress: ProgressSpec = null): HTMLElement {
  return buildCard('ytd-rich-item-renderer', progress);
}

export function searchCard(progress: ProgressSpec = null): HTMLElement {
  return buildCard('ytd-video-renderer', progress);
}

export function lockupCard(progress: ProgressSpec = null): HTMLElement {
  return buildCard('yt-lockup-view-model', progress);
}
```

- [ ] **Step 2: Commit**

```bash
git add tests/content/fixtures.ts
git commit -m "test(content): add card fixture builders for filter tests"
```

---

## Task 4: `parseProgressPercent` (TDD)

**Files:**
- Create: `src/content/filters/watched.ts`
- Test: `tests/content/watched.test.ts`

- [ ] **Step 1: Failing test**

Create `tests/content/watched.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { parseProgressPercent } from '../../src/content/filters/watched';
import { searchCard } from './fixtures';

describe('parseProgressPercent', () => {
  it('returns null when card has no progress overlay', () => {
    const card = searchCard(null);
    expect(parseProgressPercent(card)).toBeNull();
  });

  it('returns null when progress element has no style', () => {
    const card = searchCard('missing-style');
    expect(parseProgressPercent(card)).toBeNull();
  });

  it('returns null when width is not a percent', () => {
    const card = searchCard('invalid');
    expect(parseProgressPercent(card)).toBeNull();
  });

  it('parses integer percent', () => {
    const card = searchCard(73);
    expect(parseProgressPercent(card)).toBe(73);
  });

  it('parses 0', () => {
    const card = searchCard(0);
    expect(parseProgressPercent(card)).toBe(0);
  });

  it('parses 100', () => {
    const card = searchCard(100);
    expect(parseProgressPercent(card)).toBe(100);
  });

  it('tolerates decimals (clamps to number)', () => {
    const card = document.createElement('ytd-video-renderer');
    const overlay = document.createElement('ytd-thumbnail-overlay-resume-playback-renderer');
    const progress = document.createElement('div');
    progress.id = 'progress';
    progress.setAttribute('style', 'width: 42.5%');
    overlay.appendChild(progress);
    card.appendChild(overlay);
    expect(parseProgressPercent(card)).toBe(42.5);
  });
});
```

- [ ] **Step 2: Verify test fails**

Run: `npm test -- watched`
Expected: FAIL — module `../../src/content/filters/watched` does not exist.

- [ ] **Step 3: Minimal implementation**

Create `src/content/filters/watched.ts`:

```ts
// Чистые функции для фильтра «скрыть просмотренные видео».
// Разделение ответственности: этот модуль ничего не знает о
// chrome.storage, MutationObserver или URL страницы. Только: карточка
// + число-порог.

const PROGRESS_SELECTOR =
  'ytd-thumbnail-overlay-resume-playback-renderer #progress';
const PERCENT_RE = /([0-9]+(?:\.[0-9]+)?)\s*%/;

export function parseProgressPercent(card: Element): number | null {
  const progress = card.querySelector<HTMLElement>(PROGRESS_SELECTOR);
  if (!progress) return null;
  const style = progress.getAttribute('style');
  if (!style) return null;
  const match = PERCENT_RE.exec(style);
  if (!match) return null;
  const parsed = parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}
```

- [ ] **Step 4: Verify tests pass**

Run: `npm test -- watched`
Expected: PASS (all 7 cases).

- [ ] **Step 5: Commit**

```bash
git add src/content/filters/watched.ts tests/content/watched.test.ts
git commit -m "feat(filters): parseProgressPercent from thumbnail overlay"
```

---

## Task 5: `shouldHide` (TDD)

**Files:**
- Modify: `src/content/filters/watched.ts` (append)
- Modify: `tests/content/watched.test.ts` (append)

- [ ] **Step 1: Failing test**

Append to `tests/content/watched.test.ts`:

```ts
import { shouldHide } from '../../src/content/filters/watched';

describe('shouldHide', () => {
  it('returns false when card has no progress', () => {
    expect(shouldHide(searchCard(null), 20)).toBe(false);
  });

  it('returns false when progress < threshold', () => {
    expect(shouldHide(searchCard(19), 20)).toBe(false);
  });

  it('returns true when progress === threshold', () => {
    expect(shouldHide(searchCard(20), 20)).toBe(true);
  });

  it('returns true when progress > threshold', () => {
    expect(shouldHide(searchCard(80), 20)).toBe(true);
  });

  it('threshold=0 hides any started video', () => {
    expect(shouldHide(searchCard(0), 0)).toBe(true);
    expect(shouldHide(searchCard(null), 0)).toBe(false);
  });

  it('threshold=100 hides only fully watched', () => {
    expect(shouldHide(searchCard(99), 100)).toBe(false);
    expect(shouldHide(searchCard(100), 100)).toBe(true);
  });
});
```

- [ ] **Step 2: Verify test fails**

Run: `npm test -- watched`
Expected: FAIL — `shouldHide` is not exported.

- [ ] **Step 3: Implementation**

Append to `src/content/filters/watched.ts`:

```ts
export function shouldHide(card: Element, threshold: number): boolean {
  const percent = parseProgressPercent(card);
  if (percent === null) return false;
  return percent >= threshold;
}
```

- [ ] **Step 4: Verify**

Run: `npm test -- watched`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/filters/watched.ts tests/content/watched.test.ts
git commit -m "feat(filters): shouldHide compares progress against threshold"
```

---

## Task 6: `applyWatchedClass` и `CARD_SELECTORS` (TDD)

**Files:**
- Modify: `src/content/filters/watched.ts`
- Modify: `tests/content/watched.test.ts`

- [ ] **Step 1: Failing test**

Append to `tests/content/watched.test.ts`:

```ts
import { applyWatchedClass, CARD_SELECTORS } from '../../src/content/filters/watched';
import { homeCard, lockupCard } from './fixtures';

describe('applyWatchedClass', () => {
  it('adds yz-watched class when shouldHide is true', () => {
    const card = searchCard(50);
    applyWatchedClass(card, 20);
    expect(card.classList.contains('yz-watched')).toBe(true);
  });

  it('removes yz-watched class when shouldHide is false', () => {
    const card = searchCard(10);
    card.classList.add('yz-watched');
    applyWatchedClass(card, 20);
    expect(card.classList.contains('yz-watched')).toBe(false);
  });

  it('is idempotent', () => {
    const card = searchCard(50);
    applyWatchedClass(card, 20);
    applyWatchedClass(card, 20);
    expect(card.classList.contains('yz-watched')).toBe(true);
  });
});

describe('CARD_SELECTORS', () => {
  it('includes all three card types', () => {
    expect(CARD_SELECTORS).toEqual([
      'ytd-rich-item-renderer',
      'ytd-video-renderer',
      'yt-lockup-view-model',
    ]);
  });

  it('matches a home card', () => {
    const card = homeCard();
    document.body.appendChild(card);
    const found = document.querySelector(CARD_SELECTORS.join(','));
    expect(found).toBe(card);
    card.remove();
  });

  it('matches a lockup card', () => {
    const card = lockupCard();
    document.body.appendChild(card);
    const found = document.querySelector(CARD_SELECTORS.join(','));
    expect(found).toBe(card);
    card.remove();
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npm test -- watched`
Expected: FAIL — `applyWatchedClass`, `CARD_SELECTORS` not exported.

- [ ] **Step 3: Implementation**

Append to `src/content/filters/watched.ts`:

```ts
export const CARD_SELECTORS: readonly string[] = [
  'ytd-rich-item-renderer',
  'ytd-video-renderer',
  'yt-lockup-view-model',
];

export function applyWatchedClass(card: Element, threshold: number): void {
  card.classList.toggle('yz-watched', shouldHide(card, threshold));
}
```

- [ ] **Step 4: Verify**

Run: `npm test -- watched`
Expected: PASS (все кейсы).

- [ ] **Step 5: Commit**

```bash
git add src/content/filters/watched.ts tests/content/watched.test.ts
git commit -m "feat(filters): applyWatchedClass and CARD_SELECTORS"
```

---

## Task 7: Generic MutationObserver (`observer.ts`) (TDD)

**Files:**
- Create: `src/content/filters/observer.ts`
- Create: `tests/content/observer.test.ts`

- [ ] **Step 1: Failing test**

Create `tests/content/observer.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { watchForCards } from '../../src/content/filters/observer';
import { searchCard, homeCard } from './fixtures';

afterEach(() => {
  document.body.innerHTML = '';
});

function tick(): Promise<void> {
  // MutationObserver batches microtasks; wait one tick.
  return new Promise((r) => setTimeout(r, 0));
}

describe('watchForCards', () => {
  it('calls callback for card directly added to DOM', async () => {
    const cb = vi.fn();
    const dispose = watchForCards(document.body, ['ytd-video-renderer'], cb);
    const card = searchCard();
    document.body.appendChild(card);
    await tick();
    expect(cb).toHaveBeenCalledWith(card);
    dispose();
  });

  it('calls callback for cards nested in added subtree', async () => {
    const cb = vi.fn();
    const dispose = watchForCards(
      document.body,
      ['ytd-video-renderer'],
      cb
    );
    const container = document.createElement('div');
    const card = searchCard();
    container.appendChild(card);
    document.body.appendChild(container);
    await tick();
    expect(cb).toHaveBeenCalledWith(card);
    dispose();
  });

  it('ignores non-matching added nodes', async () => {
    const cb = vi.fn();
    const dispose = watchForCards(
      document.body,
      ['ytd-video-renderer'],
      cb
    );
    document.body.appendChild(document.createElement('div'));
    await tick();
    expect(cb).not.toHaveBeenCalled();
    dispose();
  });

  it('stops calling after dispose', async () => {
    const cb = vi.fn();
    const dispose = watchForCards(
      document.body,
      ['ytd-video-renderer'],
      cb
    );
    dispose();
    document.body.appendChild(searchCard());
    await tick();
    expect(cb).not.toHaveBeenCalled();
  });

  it('supports multiple selectors', async () => {
    const cb = vi.fn();
    const dispose = watchForCards(
      document.body,
      ['ytd-video-renderer', 'ytd-rich-item-renderer'],
      cb
    );
    const a = searchCard();
    const b = homeCard();
    document.body.appendChild(a);
    document.body.appendChild(b);
    await tick();
    expect(cb).toHaveBeenCalledWith(a);
    expect(cb).toHaveBeenCalledWith(b);
    dispose();
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npm test -- observer`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementation**

Create `src/content/filters/observer.ts`:

```ts
// Generic MutationObserver для ленты. Вызывает callback для каждой
// новой Element-ноды, которая либо сама матчит один из селекторов,
// либо содержит такие внутри поддерева. Возвращает dispose.

export type CardCallback = (card: Element) => void;

export function watchForCards(
  root: Node,
  selectors: readonly string[],
  callback: CardCallback
): () => void {
  const selector = selectors.join(',');

  const visit = (node: Node): void => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    if (el.matches(selector)) callback(el);
    el.querySelectorAll(selector).forEach((child) => callback(child));
  };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach(visit);
    }
  });

  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}
```

- [ ] **Step 4: Verify**

Run: `npm test -- observer`
Expected: PASS (5 кейсов).

- [ ] **Step 5: Commit**

```bash
git add src/content/filters/observer.ts tests/content/observer.test.ts
git commit -m "feat(filters): generic card observer wrapper"
```

---

## Task 8: Расширение css-injector.ts для watched-правила

**Why**: Анимация скрытия переиспользует `yz-vanish`, но активируется только когда `html.yz-watched-filter-on`. Правило должно попадать в CSS независимо от главного `settings.enabled` (фильтр может быть выключен глобально, но бандл должен включать правило).

Решение: добавить правило в `buildCss` безусловно (если `settings.filterWatchedEnabled === true`). Без toggle'а — CSS пустой для watched-части.

**Files:**
- Modify: `src/content/css-injector.ts:35-63`
- Modify: `tests/css-injector.test.ts`

- [ ] **Step 1: Failing test**

Append to `tests/css-injector.test.ts`:

```ts
describe('buildCss — watched filter', () => {
  it('includes yz-watched rule when filterWatchedEnabled', () => {
    const settings: ZenSettings = {
      ...ALL_OFF,
      filterWatchedEnabled: true,
    };
    const css = buildCss(settings);
    expect(css).toContain('html.yz-watched-filter-on .yz-watched');
    expect(css).toContain('animation: yz-vanish');
  });

  it('omits yz-watched rule when filter disabled', () => {
    const settings: ZenSettings = {
      ...ALL_OFF,
      filterWatchedEnabled: false,
    };
    expect(buildCss(settings)).not.toContain('yz-watched-filter-on');
  });

  it('emits css even when all cleaner toggles are off but watched filter is on', () => {
    const settings: ZenSettings = {
      ...ALL_OFF,
      filterWatchedEnabled: true,
    };
    expect(buildCss(settings)).not.toBe('');
  });

  it('includes prefers-reduced-motion variant', () => {
    const settings: ZenSettings = {
      ...ALL_OFF,
      filterWatchedEnabled: true,
    };
    expect(buildCss(settings)).toContain('prefers-reduced-motion');
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npm test -- css-injector`
Expected: FAIL — правила ещё нет.

- [ ] **Step 3: Update buildCss**

Edit `src/content/css-injector.ts:35-63` — заменить функцию на:

```ts
export function buildCss(settings: ZenSettings): string {
  if (!settings.enabled) return '';

  const cleanerSelectors: string[] = [];

  for (const [key, rule] of Object.entries(HIDE_RULES)) {
    if (settings[key as ToggleKey]) {
      cleanerSelectors.push(...rule.selectors);
    }
  }

  const hasCleaner = cleanerSelectors.length > 0;
  const hasWatched = settings.filterWatchedEnabled === true;

  if (!hasCleaner && !hasWatched) return '';

  const parts: string[] = [KEYFRAMES];

  if (hasCleaner) {
    const selectorList = cleanerSelectors.join(',\n');
    parts.push(`${selectorList} {
  animation: yz-vanish 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
  overflow: hidden !important;
}

/* First-load override: hide instantly without playing the fade, so the
   initial page paint does not flash the hidden elements. main.ts removes
   the yz-initial class after the page settles. */
html.yz-initial ${cleanerSelectors.join(',\nhtml.yz-initial ')} {
  animation-duration: 0s !important;
}`);
  }

  if (hasWatched) {
    parts.push(`html.yz-watched-filter-on .yz-watched {
  animation: yz-vanish 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
  overflow: hidden !important;
}

@media (prefers-reduced-motion: reduce) {
  html.yz-watched-filter-on .yz-watched {
    animation: none !important;
    display: none !important;
  }
}`);
  }

  return parts.join('\n\n');
}
```

- [ ] **Step 4: Verify**

Run: `npm test`
Expected: PASS (все тесты, включая существующие).

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/content/css-injector.ts tests/css-injector.test.ts
git commit -m "feat(content): css rule for yz-watched (gated by filterWatchedEnabled)"
```

---

## Task 9: `bootstrap.ts` — интеграция watched + observer (TDD по доступной части)

**Why**: Связующий модуль. Тестируем чистую подфункцию `scanAll`, остальное — интеграция.

**Files:**
- Create: `src/content/filters/bootstrap.ts`
- Modify: `tests/content/watched.test.ts` (append test для `scanAll`)

- [ ] **Step 1: Failing test for `scanAll`**

Append to `tests/content/watched.test.ts`:

```ts
import { scanAll } from '../../src/content/filters/bootstrap';

describe('scanAll', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('applies yz-watched to cards that exceed threshold', () => {
    const c1 = searchCard(50);
    const c2 = searchCard(10);
    const c3 = searchCard(null);
    document.body.appendChild(c1);
    document.body.appendChild(c2);
    document.body.appendChild(c3);
    scanAll(document.body, 20);
    expect(c1.classList.contains('yz-watched')).toBe(true);
    expect(c2.classList.contains('yz-watched')).toBe(false);
    expect(c3.classList.contains('yz-watched')).toBe(false);
  });

  it('re-scan updates classes when threshold changes', () => {
    const card = searchCard(15);
    document.body.appendChild(card);
    scanAll(document.body, 20);
    expect(card.classList.contains('yz-watched')).toBe(false);
    scanAll(document.body, 10);
    expect(card.classList.contains('yz-watched')).toBe(true);
  });
});
```

Also add an import at the top of the test file for `afterEach`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
```

- [ ] **Step 2: Verify fail**

Run: `npm test -- watched`
Expected: FAIL — `scanAll` not found.

- [ ] **Step 3: Implement bootstrap with `scanAll` + `init`**

Create `src/content/filters/bootstrap.ts`:

```ts
import { DEFAULT_SETTINGS } from '../../shared/defaults';
import type { ZenSettings } from '../../shared/types';
import { watchForCards } from './observer';
import { applyWatchedClass, CARD_SELECTORS } from './watched';

const FILTER_ON_CLASS = 'yz-watched-filter-on';
const CHIP_PAGES = ['/', '/results', '/watch'];

export function scanAll(root: ParentNode, threshold: number): void {
  const cards = root.querySelectorAll(CARD_SELECTORS.join(','));
  cards.forEach((card) => applyWatchedClass(card, threshold));
}

function currentPath(): string {
  return location.pathname || '/';
}

export function isFilterRelevantPath(path: string): boolean {
  return CHIP_PAGES.includes(path);
}

let currentThreshold = DEFAULT_SETTINGS.filterWatchedThreshold;
let currentEnabled = DEFAULT_SETTINGS.filterWatchedEnabled;
let observerDispose: (() => void) | null = null;

function syncHtmlClass(enabled: boolean): void {
  document.documentElement.classList.toggle(FILTER_ON_CLASS, enabled);
}

function onCardAdded(card: Element): void {
  applyWatchedClass(card, currentThreshold);
}

function applySettings(settings: Pick<
  ZenSettings,
  'filterWatchedEnabled' | 'filterWatchedThreshold'
>): void {
  currentEnabled = settings.filterWatchedEnabled;
  currentThreshold = settings.filterWatchedThreshold;
  syncHtmlClass(currentEnabled);
  scanAll(document, currentThreshold);
}

export function initWatchedFilter(): void {
  chrome.storage.sync.get(
    {
      filterWatchedEnabled: DEFAULT_SETTINGS.filterWatchedEnabled,
      filterWatchedThreshold: DEFAULT_SETTINGS.filterWatchedThreshold,
    },
    (stored) => {
      applySettings(stored as Pick<
        ZenSettings,
        'filterWatchedEnabled' | 'filterWatchedThreshold'
      >);
    }
  );

  observerDispose ??= watchForCards(
    document.documentElement,
    CARD_SELECTORS,
    onCardAdded
  );

  window.addEventListener('yt-navigate-finish', () => {
    scanAll(document, currentThreshold);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const patch: Partial<ZenSettings> = {};
    if ('filterWatchedEnabled' in changes) {
      patch.filterWatchedEnabled = changes.filterWatchedEnabled
        .newValue as boolean;
    }
    if ('filterWatchedThreshold' in changes) {
      patch.filterWatchedThreshold = changes.filterWatchedThreshold
        .newValue as number;
    }
    if (Object.keys(patch).length === 0) return;
    applySettings({
      filterWatchedEnabled: patch.filterWatchedEnabled ?? currentEnabled,
      filterWatchedThreshold: patch.filterWatchedThreshold ?? currentThreshold,
    });
  });
}

export function __currentPathForTests(): string {
  return currentPath();
}
```

- [ ] **Step 4: Verify**

Run: `npm test -- watched`
Expected: PASS (новые тесты scanAll + существующие).

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/content/filters/bootstrap.ts tests/content/watched.test.ts
git commit -m "feat(filters): bootstrap wiring for watched filter"
```

---

## Task 10: Inline chip — DOM + visibility (TDD)

**Files:**
- Create: `src/content/filters/inline-ui.ts`
- Create: `tests/content/inline-ui.test.ts`

- [ ] **Step 1: Failing tests — структура и видимость**

Create `tests/content/inline-ui.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';

import {
  createChip,
  CHIP_ID,
  isPathVisible,
  syncChipState,
} from '../../src/content/filters/inline-ui';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('createChip', () => {
  it('creates button with correct id and initial inactive state', () => {
    const chip = createChip();
    expect(chip.id).toBe(CHIP_ID);
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    expect(chip.dataset.active).toBe('false');
  });

  it('contains label text', () => {
    const chip = createChip();
    expect(chip.textContent).toContain('Просмотренные');
  });
});

describe('syncChipState', () => {
  it('sets data-active=true and aria-pressed=true when enabled', () => {
    const chip = createChip();
    syncChipState(chip, true);
    expect(chip.dataset.active).toBe('true');
    expect(chip.getAttribute('aria-pressed')).toBe('true');
  });

  it('resets to false when disabled', () => {
    const chip = createChip();
    syncChipState(chip, true);
    syncChipState(chip, false);
    expect(chip.dataset.active).toBe('false');
    expect(chip.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('isPathVisible', () => {
  it('returns true for /', () => {
    expect(isPathVisible('/')).toBe(true);
  });

  it('returns true for /results', () => {
    expect(isPathVisible('/results')).toBe(true);
  });

  it('returns true for /watch', () => {
    expect(isPathVisible('/watch')).toBe(true);
  });

  it('returns false for /shorts', () => {
    expect(isPathVisible('/shorts/abcd')).toBe(false);
  });

  it('returns false for /channel/foo', () => {
    expect(isPathVisible('/channel/foo')).toBe(false);
  });

  it('returns false for /playlist', () => {
    expect(isPathVisible('/playlist')).toBe(false);
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npm test -- inline-ui`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementation (без storage binding)**

Create `src/content/filters/inline-ui.ts`:

```ts
// Inline chip «Скрыть просмотренные» рядом с полем поиска YouTube.
// Этот файл отвечает за DOM, видимость по pathname и визуальное
// состояние. Биндинг к chrome.storage — в `bootstrap.ts`.

export const CHIP_ID = 'yz-chip-watched';
const LABEL = 'Скрыть просмотренные';
const VISIBLE_PATHS = ['/', '/results', '/watch'];

export function createChip(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = CHIP_ID;
  btn.className = 'yz-chip';
  btn.dataset.active = 'false';
  btn.setAttribute('aria-pressed', 'false');
  btn.type = 'button';

  const icon = document.createElement('span');
  icon.className = 'yz-chip__icon';
  icon.textContent = '◑';

  const label = document.createElement('span');
  label.className = 'yz-chip__label';
  label.textContent = 'Просмотренные';

  btn.appendChild(icon);
  btn.appendChild(label);
  btn.setAttribute('aria-label', LABEL);

  return btn;
}

export function syncChipState(chip: HTMLElement, enabled: boolean): void {
  chip.dataset.active = enabled ? 'true' : 'false';
  chip.setAttribute('aria-pressed', enabled ? 'true' : 'false');
}

export function isPathVisible(pathname: string): boolean {
  return VISIBLE_PATHS.includes(pathname);
}

export function applyChipVisibility(
  chip: HTMLElement,
  pathname: string
): void {
  chip.style.display = isPathVisible(pathname) ? '' : 'none';
}
```

- [ ] **Step 4: Verify**

Run: `npm test -- inline-ui`
Expected: PASS.

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/content/filters/inline-ui.ts tests/content/inline-ui.test.ts
git commit -m "feat(filters): inline chip DOM and visibility logic"
```

---

## Task 11: Inline chip — mount + storage wiring + CSS

**Files:**
- Modify: `src/content/filters/inline-ui.ts` (append mount function)
- Modify: `src/content/filters/bootstrap.ts` (wire chip)
- Modify: `src/content/css-injector.ts` (add chip styles to CSS)
- Modify: `tests/content/inline-ui.test.ts` (append mount test)
- Modify: `tests/css-injector.test.ts` (append chip style presence test)

- [ ] **Step 1: Failing test для mount + storage wire**

Append to `tests/content/inline-ui.test.ts`:

```ts
import { mountChip } from '../../src/content/filters/inline-ui';

describe('mountChip', () => {
  it('inserts chip before #buttons inside ytd-masthead #end', () => {
    const masthead = document.createElement('ytd-masthead');
    const end = document.createElement('div');
    end.id = 'end';
    const skeleton = document.createElement('div');
    skeleton.id = 'masthead-skeleton-icons';
    const buttons = document.createElement('div');
    buttons.id = 'buttons';
    end.appendChild(skeleton);
    end.appendChild(buttons);
    masthead.appendChild(end);
    document.body.appendChild(masthead);

    const chip = mountChip();
    expect(chip).not.toBeNull();
    expect(chip!.id).toBe(CHIP_ID);
    // order: skeleton, chip, buttons
    const children = Array.from(end.children);
    const chipIdx = children.findIndex((c) => c.id === CHIP_ID);
    const buttonsIdx = children.findIndex((c) => c.id === 'buttons');
    expect(chipIdx).toBeGreaterThan(-1);
    expect(chipIdx).toBeLessThan(buttonsIdx);
  });

  it('returns null when masthead does not exist yet', () => {
    expect(mountChip()).toBeNull();
  });

  it('returns existing chip on second call (idempotent)', () => {
    const masthead = document.createElement('ytd-masthead');
    const end = document.createElement('div');
    end.id = 'end';
    const buttons = document.createElement('div');
    buttons.id = 'buttons';
    end.appendChild(buttons);
    masthead.appendChild(end);
    document.body.appendChild(masthead);

    const a = mountChip();
    const b = mountChip();
    expect(a).toBe(b);
    expect(document.querySelectorAll(`#${CHIP_ID}`).length).toBe(1);
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npm test -- inline-ui`
Expected: FAIL — `mountChip` not exported.

- [ ] **Step 3: Implement `mountChip`**

Append to `src/content/filters/inline-ui.ts`:

```ts
export function mountChip(): HTMLButtonElement | null {
  const existing = document.getElementById(CHIP_ID) as HTMLButtonElement | null;
  if (existing) return existing;

  const end = document.querySelector('ytd-masthead #end');
  if (!end) return null;

  const chip = createChip();
  const buttons = end.querySelector('#buttons');
  if (buttons) {
    end.insertBefore(chip, buttons);
  } else {
    end.appendChild(chip);
  }
  return chip;
}
```

- [ ] **Step 4: Verify test**

Run: `npm test -- inline-ui`
Expected: PASS.

- [ ] **Step 5: Wire chip in `bootstrap.ts`**

Edit `src/content/filters/bootstrap.ts` — добавить импорты и доп. инициализацию. Обнови секцию `initWatchedFilter`:

```ts
import {
  applyChipVisibility,
  CHIP_ID,
  mountChip,
  syncChipState,
} from './inline-ui';
```

В конец функции `applySettings` добавить (после `scanAll(...)`):

```ts
  const chip = document.getElementById(CHIP_ID);
  if (chip) syncChipState(chip, currentEnabled);
```

В `initWatchedFilter` после `observerDispose ??= …` добавить:

```ts
  const tryMount = (): void => {
    const chip = mountChip();
    if (!chip) return;
    applyChipVisibility(chip, currentPath());
    syncChipState(chip, currentEnabled);
    chip.addEventListener('click', () => {
      chrome.storage.sync.set({ filterWatchedEnabled: !currentEnabled });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryMount, { once: true });
  } else {
    tryMount();
  }

  // YouTube может рендерить masthead позже — наблюдаем пока не появится.
  const mountObserver = new MutationObserver(() => {
    if (document.getElementById(CHIP_ID)) {
      mountObserver.disconnect();
      return;
    }
    if (mountChip()) {
      const chip = document.getElementById(CHIP_ID);
      if (chip) {
        applyChipVisibility(chip, currentPath());
        syncChipState(chip, currentEnabled);
        chip.addEventListener('click', () => {
          chrome.storage.sync.set({
            filterWatchedEnabled: !currentEnabled,
          });
        });
      }
      mountObserver.disconnect();
    }
  });
  mountObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
```

В `yt-navigate-finish` listener добавить обновление видимости chip'а:

```ts
  window.addEventListener('yt-navigate-finish', () => {
    scanAll(document, currentThreshold);
    const chip = document.getElementById(CHIP_ID);
    if (chip) applyChipVisibility(chip, currentPath());
  });
```

- [ ] **Step 6: Расширить CSS chip'а в `css-injector.ts`**

Edit `src/content/css-injector.ts` — в блок watched (`if (hasWatched) { ... }`) добавить CSS чипа, чтобы он инжектился вместе с правилом фильтра:

Replace:

```ts
  if (hasWatched) {
    parts.push(`html.yz-watched-filter-on .yz-watched {
```

with:

```ts
  if (hasWatched) {
    parts.push(`#yz-chip-watched {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  margin-right: 8px;
  border: 1px solid var(--yt-spec-10-percent-layer, rgba(255,255,255,.1));
  border-radius: 16px;
  background: transparent;
  color: var(--yt-spec-text-primary, inherit);
  font: inherit;
  font-size: 13px;
  opacity: .65;
  cursor: pointer;
  transition: opacity .15s, background .15s, border-color .15s;
}
#yz-chip-watched:hover { opacity: 1; }
#yz-chip-watched:focus-visible {
  outline: 2px solid var(--yt-spec-call-to-action, #3ea6ff);
  outline-offset: 2px;
}
#yz-chip-watched[data-active="true"] {
  opacity: 1;
  background: var(--yt-spec-call-to-action, #3ea6ff);
  color: #fff;
  border-color: transparent;
}
.yz-chip__icon { font-size: 14px; line-height: 1; }
.yz-chip__label { line-height: 1; }

html.yz-watched-filter-on .yz-watched {
```

(т. е. вставляем блок chip'а перед уже существующим правилом `html.yz-watched-filter-on .yz-watched`).

**Note for integrator:** убедиться, что backtick-template в `parts.push(...)` закрывается в правильном месте после `@media (prefers-reduced-motion)`. Если backtick разъехался — собери в одну строку-литерал.

- [ ] **Step 7: Обновить тест css-injector**

Append to `tests/css-injector.test.ts` in the `describe('buildCss — watched filter'` block:

```ts
  it('includes chip styles when filter enabled', () => {
    const settings: ZenSettings = { ...ALL_OFF, filterWatchedEnabled: true };
    const css = buildCss(settings);
    expect(css).toContain('#yz-chip-watched');
    expect(css).toContain('data-active="true"');
  });
```

- [ ] **Step 8: Verify**

Run: `npm test`
Expected: PASS.

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/content/filters/inline-ui.ts src/content/filters/bootstrap.ts src/content/css-injector.ts tests/content/inline-ui.test.ts tests/css-injector.test.ts
git commit -m "feat(filters): mount inline chip and wire to storage"
```

---

## Task 12: Подключить `initWatchedFilter` в `content/main.ts`

**Files:**
- Modify: `src/content/main.ts:1-5,49-60`

- [ ] **Step 1: Импорт**

Edit `src/content/main.ts:1-5` — добавить импорт после существующих:

```ts
import { initWatchedFilter } from './filters/bootstrap';
```

- [ ] **Step 2: Вызов init**

Edit `src/content/main.ts:49-92` — внутри функции `init()` добавить вызов сразу после `pulseInitial();` и строчки `getSettings(...)`:

```ts
  initWatchedFilter();
```

(конкретно — строка после `applyStyles(buildCss(settings));` закрытой скобки `getSettings` callback'а; между ним и следующим `window.addEventListener` добавить `initWatchedFilter();`.)

- [ ] **Step 3: Build + typecheck**

Run: `npm run typecheck`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds, `dist/content.js` and `dist/background.js` созданы.

- [ ] **Step 4: Commit**

```bash
git add src/content/main.ts
git commit -m "feat(content): wire initWatchedFilter into entry point"
```

---

## Task 13: Popup секция «Фильтры ленты» — рендер слайдера (TDD)

**Files:**
- Create: `src/popup/sections/filters.ts`
- Create: `tests/popup/filters-section.test.ts`

- [ ] **Step 1: Failing test**

Create `tests/popup/filters-section.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderFilters } from '../../src/popup/sections/filters';
import { DEFAULT_SETTINGS } from '../../src/shared/defaults';

const setSpy = vi.fn();

beforeEach(() => {
  setSpy.mockReset();
  // @ts-expect-error — minimal chrome API stub for jsdom.
  globalThis.chrome = {
    storage: {
      sync: {
        set: (obj: Record<string, unknown>, cb?: () => void) => {
          setSpy(obj);
          cb?.();
        },
      },
    },
  };
});

function makeContainer(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('renderFilters', () => {
  it('renders breadcrumb and group label', () => {
    const container = makeContainer();
    renderFilters(container, DEFAULT_SETTINGS);
    expect(container.textContent).toContain('Фильтры ленты');
    expect(container.textContent).toContain('Просмотренные видео');
  });

  it('renders range input with value = threshold', () => {
    const container = makeContainer();
    renderFilters(container, { ...DEFAULT_SETTINGS, filterWatchedThreshold: 35 });
    const range = container.querySelector<HTMLInputElement>('input[type="range"]');
    expect(range).not.toBeNull();
    expect(range!.value).toBe('35');
    expect(range!.min).toBe('0');
    expect(range!.max).toBe('100');
    expect(range!.step).toBe('5');
  });

  it('hint reflects current threshold', () => {
    const container = makeContainer();
    renderFilters(container, { ...DEFAULT_SETTINGS, filterWatchedThreshold: 42 });
    expect(container.textContent).toContain('≥ 42%');
  });

  it('mentions that on/off is controlled by the inline chip', () => {
    const container = makeContainer();
    renderFilters(container, DEFAULT_SETTINGS);
    expect(container.textContent?.toLowerCase()).toMatch(/чип|chip|поле поиска/);
  });

  it('writes new threshold to storage on input event', async () => {
    const container = makeContainer();
    renderFilters(container, { ...DEFAULT_SETTINGS, filterWatchedThreshold: 20 });
    const range = container.querySelector<HTMLInputElement>('input[type="range"]')!;
    range.value = '50';
    range.dispatchEvent(new Event('input', { bubbles: true }));
    // debounce 150 ms — ждём.
    await new Promise((r) => setTimeout(r, 200));
    expect(setSpy).toHaveBeenCalledWith({ filterWatchedThreshold: 50 });
  });

  it('does not render an enabled toggle', () => {
    const container = makeContainer();
    renderFilters(container, DEFAULT_SETTINGS);
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox).toBeNull();
  });
});
```

- [ ] **Step 2: Verify fail**

Run: `npm test -- filters-section`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementation**

Create `src/popup/sections/filters.ts`:

```ts
import type { ZenSettings } from '../../shared/types';
import type { PopupSection } from '../sections';
import { makeBreadcrumb } from './breadcrumb';

const DEBOUNCE_MS = 150;

export const renderFilters: PopupSection['render'] = function (
  container,
  settings
) {
  container.innerHTML = '';
  container.appendChild(makeBreadcrumb('Фильтры ленты'));

  const group = document.createElement('div');
  group.className = 'group';

  const head = document.createElement('div');
  head.className = 'group-head';
  const label = document.createElement('span');
  label.className = 'group-label';
  label.textContent = 'Просмотренные видео';
  head.appendChild(label);
  group.appendChild(head);

  const items = document.createElement('div');
  items.className = 'group-items';

  const sliderWrap = document.createElement('div');
  sliderWrap.className = 'row row--stack';

  const sliderLabel = document.createElement('span');
  sliderLabel.className = 'row-label';
  sliderLabel.textContent = 'Порог «просмотрено»';

  const range = document.createElement('input');
  range.type = 'range';
  range.min = '0';
  range.max = '100';
  range.step = '5';
  range.value = String(settings.filterWatchedThreshold);
  range.setAttribute(
    'aria-valuetext',
    `Порог ${settings.filterWatchedThreshold}%`
  );

  const hint = document.createElement('p');
  hint.className = 'yz-hint';
  const setHintText = (value: number): void => {
    hint.textContent = `Видео с прогрессом ≥ ${value}% считается просмотренным`;
  };
  setHintText(settings.filterWatchedThreshold);

  let debounceTimer: number | null = null;
  range.addEventListener('input', () => {
    const value = parseInt(range.value, 10);
    setHintText(value);
    range.setAttribute('aria-valuetext', `Порог ${value}%`);
    if (debounceTimer !== null) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      chrome.storage.sync.set({ filterWatchedThreshold: value });
      debounceTimer = null;
    }, DEBOUNCE_MS);
  });

  sliderWrap.appendChild(sliderLabel);
  sliderWrap.appendChild(range);
  sliderWrap.appendChild(hint);
  items.appendChild(sliderWrap);

  const footnote = document.createElement('p');
  footnote.className = 'yz-hint yz-hint--muted';
  footnote.textContent =
    'Включение и выключение — через чип рядом с полем поиска YouTube.';
  items.appendChild(footnote);

  group.appendChild(items);
  container.appendChild(group);
};
```

- [ ] **Step 4: Verify**

Run: `npm test -- filters-section`
Expected: PASS (все 6 кейсов).

- [ ] **Step 5: Commit**

```bash
git add src/popup/sections/filters.ts tests/popup/filters-section.test.ts
git commit -m "feat(popup): render Фильтры ленты section with threshold slider"
```

---

## Task 14: Подключить `renderFilters` в `SECTIONS`

**Files:**
- Modify: `src/popup/sections.ts:2-4,26-32`
- Modify: `tests/popup/sections.test.ts`

- [ ] **Step 1: Обновить тест sections (подтвердить что filter section не stub)**

Append to `tests/popup/sections.test.ts` near end of the describe:

```ts
  it('filters section is no longer a stub', async () => {
    const { renderFilters } = await import('../../src/popup/sections/filters');
    const filters = SECTIONS.find((s) => s.id === 'filters');
    expect(filters?.render).toBe(renderFilters);
  });
```

- [ ] **Step 2: Verify fail**

Run: `npm test -- popup/sections`
Expected: FAIL (функция render !== renderFilters, пока stub).

- [ ] **Step 3: Заменить stub на renderFilters**

Edit `src/popup/sections.ts:2-4` — добавить импорт после существующих:

```ts
import { renderFilters } from './sections/filters';
```

Edit `src/popup/sections.ts:28` — заменить:

```ts
  { id: 'filters',  label: 'Фильтры ленты', icon: '◎', position: 'top',    render: makeStub('Фильтры ленты', '◎') },
```

на:

```ts
  { id: 'filters',  label: 'Фильтры ленты', icon: '◎', position: 'top',    render: renderFilters },
```

- [ ] **Step 4: Verify**

Run: `npm test`
Expected: PASS (все тесты).

Run: `npm run typecheck`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/popup/sections.ts tests/popup/sections.test.ts
git commit -m "feat(popup): wire renderFilters into SECTIONS registry"
```

---

## Task 15: Добавить стили hint'ов в popup.css

**Why**: `renderFilters` использует классы `yz-hint` и `yz-hint--muted` + `row--stack`, которые нужно определить, иначе слайдер и текст будут без стилей. Минимальная, консистентная с Paper-темой.

**Files:**
- Modify: `src/popup/popup.css` (append)

- [ ] **Step 1: Прочитать текущий `popup.css` и выбрать место для добавления**

Read `src/popup/popup.css` — файл открываем целиком, чтобы не разорвать существующие классы. Добавляем новые правила в конец.

- [ ] **Step 2: Добавить правила**

Append to `src/popup/popup.css`:

```css
.row--stack {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 10px 12px;
}
.row--stack .row-label {
  font-size: 12px;
  opacity: .7;
}
.row--stack input[type="range"] {
  width: 100%;
  margin: 4px 0;
  accent-color: var(--yz-accent, #4f46e5);
}
.yz-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--yz-muted, #6b6b6b);
}
.yz-hint--muted { opacity: .7; }
```

(Использовать существующие CSS-переменные проекта, если есть; если нет `--yz-accent` — можно указать конкретные цвета в синке с Paper-темой.)

- [ ] **Step 3: Manual check через build**

Run: `npm run build`
Expected: OK.

Open `dist/popup.html` в браузере вручную (через Chrome extensions) — слайдер и hint корректно отображаются в теме.

- [ ] **Step 4: Commit**

```bash
git add src/popup/popup.css
git commit -m "style(popup): row--stack and yz-hint styles for filters section"
```

---

## Task 16: Live-верификация на залогиненном YouTube

**Why**: Реальная структура прогресс-ribbon'а в `yt-lockup-view-model` (`/watch` sidebar) не финализирована — в залогиненной сессии нужно проверить селектор. Также — убедиться что chip не перекрывает другие элементы masthead.

**Files:** _(без изменений кода — verification; правки только если обнаружены несовпадения)_

- [ ] **Step 1: Загрузить сборку в Chrome**

Run: `npm run build`
Открыть `chrome://extensions` → «Загрузить распакованное» → выбрать `dist/`.

- [ ] **Step 2: Проверка chip**

- Открыть `https://www.youtube.com/` (залогиненным).
- Убедиться: chip «Просмотренные» виден слева от «Создать» / уведомлений / аватара, **левее** других кнопок.
- Клик по chip → визуально переключается в активное состояние.
- Повторный клик → возвращается в нейтральное.

Если chip не появляется — открыть DevTools Console, проверить ошибки из content script. Типичные причины: masthead рендерится позже, observer не дождался (см. `bootstrap.ts` mountObserver) — починить селектор/таймаут.

- [ ] **Step 3: Проверка фильтрации на `/`**

- Включить chip.
- В ленте главной найти карточку с прогресс-ribbon'ом (красная полоска внизу превью). Должна исчезнуть (анимация 450 ms → collapse).
- Скролл — новые просмотренные карточки исчезают по мере появления.

- [ ] **Step 4: Проверка `/results`**

- Выполнить любой поиск.
- Если среди результатов есть ранее просмотренные — они должны быть скрыты. Обычно в search результатах меньше watched — выполнить поиск по каналу, видео которого точно смотрели.

- [ ] **Step 5: Проверка `/watch` sidebar (критично — новая разметка)**

- Открыть любое видео.
- В sidebar «Далее» найти watched-видео. **Критическая проверка:** карточка — `yt-lockup-view-model`. Внутри — искать элемент с прогрессом.
- В DevTools Console выполнить:

```js
const card = document.querySelector('yt-lockup-view-model');
console.log('overlay:', card?.querySelector('ytd-thumbnail-overlay-resume-playback-renderer'));
console.log('alt progress:', card?.querySelector('[class*="progress"], [class*="Progress"]'));
console.log('inner:', card?.innerHTML.slice(0, 500));
```

Если `overlay` null, но есть альтернативный элемент прогресса — обновить `PROGRESS_SELECTOR` в `src/content/filters/watched.ts` (Task 4) на two-branch lookup и добавить тестовую фикстуру в `tests/content/fixtures.ts`. Повторить `npm test`, `npm run build`.

- [ ] **Step 6: Проверка порога через popup**

- Открыть popup → секция «Фильтры ленты».
- Передвинуть слайдер → карточки перестраиваются в соответствии с новым порогом (проверить 0%, 50%, 100%).
- Убедиться, что toggle'а enabled в popup нет (только слайдер + hint + footnote).

- [ ] **Step 7: Проверка a11y / reduced-motion**

- В DevTools Rendering → поставить `prefers-reduced-motion: reduce`.
- Toggle chip → карточки исчезают без анимации, мгновенно.
- Tab-навигация достигает chip, Enter/Space переключают.

- [ ] **Step 8: Commit фиксов (только если что-то чинилось)**

```bash
git add -A
git commit -m "fix(filters): <описание конкретного фикса>"
```

---

## Task 17: Документация и финальная проверка

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Обновить «Structure» в CLAUDE.md**

Добавить в раздел `## Structure` после строки про `src/content/`:

```
  - `src/content/filters/` — client-side фильтры ленты (`watched.ts`, `observer.ts`, `inline-ui.ts`, `bootstrap.ts`)
```

И в раздел про `src/popup/sections/` добавить `filters` рядом с другими секциями.

- [ ] **Step 2: Обновить Conventions**

Добавить строку в `## Conventions`:

```
- Добавление нового фильтра ленты: новая чистая функция + тест в `src/content/filters/`, регистрация в `bootstrap.ts`. Класс-маркер на карточке (например, `yz-watched`) + CSS-правило в `css-injector.ts` за фичефлагом из `ZenSettings`.
```

- [ ] **Step 3: Final full run**

Run: `npm test`
Expected: ALL pass.

Run: `npm run typecheck`
Expected: no errors.

Run: `npm run build`
Expected: OK.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document filters/ content module and add-filter convention"
```

---

## Self-Review Checklist (for plan author, not engineer)

Spec coverage map:

| Spec section | Plan task |
|---|---|
| 3. Архитектура и границы | Tasks 3-10 (files match 1:1) |
| 4. Data flow | Task 9 (bootstrap) + 13 (popup) |
| 5. DOM-селекторы, open questions | Task 16 (live verification), Task 4 fixture note |
| 6. Inline chip | Tasks 10-11 |
| 7. MutationObserver + SPA | Tasks 7, 9 |
| 8. CSS | Tasks 8, 11, 15 |
| 9. Popup секция | Tasks 13-14 |
| 10. Типы и настройки | Task 2 |
| 11. Тестирование (unit) | Tasks 4-7, 9, 10-11, 13 |
| 11. Тестирование (manual) | Task 16 |
| 12. Edge cases | Покрыты в параметризованных тестах Tasks 4-6 |
| 13. Accessibility | Tasks 10 (aria-pressed), 13 (aria-valuetext), 16 (manual) |

Placeholder / ambiguity scan: пройдено — никаких «TBD», «implement later», «add error handling».

Type consistency: `scanAll(root, threshold)`, `applyWatchedClass(card, threshold)`, `watchForCards(root, selectors, cb)`, `createChip(): HTMLButtonElement`, `mountChip(): HTMLButtonElement | null`, `syncChipState(chip, enabled)`, `isPathVisible(path)`, `applyChipVisibility(chip, path)` — сигнатуры одинаковы во всех задачах-потребителях.
