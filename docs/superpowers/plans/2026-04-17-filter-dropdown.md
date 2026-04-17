# Filter Dropdown (Фаза 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить одиночный chip «Просмотренные» на кнопку «Фильтры» рядом с поиском YouTube с выпадающей панелью, содержащей toggle watched-фильтра и 4 выпадающих списка (Дата / Длительность / Сортировка / Тип). Настройки YT-фильтров автоматически применяются к каждому поиску через URL-параметр `sp`.

**Architecture:** Чистые функции кодирования protobuf → base64 (`sp-encoder`) и переписывания URL (`search-url-rewriter`) — снизу-вверх. UI-слой (`inline-ui`) рендерит кнопку и панель, пишет в `chrome.storage.sync`. `bootstrap.ts` — единственная точка подписок (storage.onChanged, yt-navigate-*) и монтирования. Popup-секция «Фильтры ленты» сохраняет слайдер порога, текст меняется на «через кнопку ‘Фильтры’».

**Tech Stack:** TypeScript (strict), Manifest V3, Vite + esbuild, Vitest + jsdom.

**Spec:** [docs/superpowers/specs/2026-04-17-filter-dropdown-design.md](../specs/2026-04-17-filter-dropdown-design.md).

---

## File Structure

**Создать:**
- `src/content/filters/sp-encoder.ts` — чистые функции: `encodeVarint`, `encodeProtobuf`, `encodeSp(filters)`. Не знает про DOM/storage/URL.
- `src/content/filters/search-url-rewriter.ts` — `rewriteIfNeeded(url, filters)` (чистая), `installNavListener(getFilters)` (side-effect), `applyOnLoad(getFilters)` (однократно при direct-load).
- `tests/content/sp-encoder.test.ts` — table-driven тесты против reference-строк YouTube.
- `tests/content/search-url-rewriter.test.ts` — юниты `rewriteIfNeeded` + integration SPA-теста.

**Переписать:**
- `src/content/filters/inline-ui.ts` — удаляем chip API, добавляем `createFiltersButton`, `mountFiltersButton`, `syncButtonBadge`, `createPanel`, `openPanel`, `closePanel`, `syncPanelInputs`.
- `tests/content/inline-ui.test.ts` — полностью новый набор тестов под новое API.

**Модифицировать:**
- `src/shared/types.ts` — +4 типа-объединения (`UploadDateOpt`, `DurationOpt`, `SortOpt`, `TypeOpt`), +interface `SearchFilters`, +4 ключа в `ZenSettings`.
- `src/shared/defaults.ts` — 4 новых дефолта (`'any'` / `'relevance'`).
- `tests/defaults.test.ts` — `ALL_KEYS` + 4 новых ключа, ассерты на дефолты.
- `src/content/filters/bootstrap.ts` — удалить chip-wiring, добавить подписку на 4 новых ключа, инициализацию панели, `installNavListener`, `applyOnLoad`.
- `src/content/css-injector.ts` — удалить блок `#yz-chip-watched` (и `.yz-chip__*`), добавить стили `#yz-filters-btn`, `#yz-filters-panel`, `.yz-group`, `.yz-row`. Условие инжекта CSS для watched-фильтра (`html.yz-watched-filter-on .yz-watched`) сохраняется как было.
- `src/popup/sections/filters.ts` — заменить текст footnote на «через кнопку ‘Фильтры’ рядом с поиском YouTube».
- `tests/popup/filters-section.test.ts` — обновить regex в тесте `mentions chip for on/off control` (должен упомянуть «Фильтры» / «поиска»).

---

## Task 1: Типы и дефолты для YT-фильтров

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/defaults.ts`
- Test: `tests/defaults.test.ts`

- [ ] **Step 1: Failing test для новых дефолтов**

Edit `tests/defaults.test.ts`. Заменить массив `ALL_KEYS`:

```ts
const ALL_KEYS: (keyof ZenSettings)[] = [
  'enabled',
  'shorts',
  'playlists',
  'liked',
  'yourVideos',
  'downloads',
  'subscriptions',
  'navigator',
  'explore',
  'reportButton',
  'footer',
  'fixUblock',
  'actionPanel',
  'activeSection',
  'filterWatchedEnabled',
  'filterWatchedThreshold',
  'filterSearchUploadDate',
  'filterSearchDuration',
  'filterSearchSort',
  'filterSearchType',
];
```

Добавить новый describe после существующих:

```ts
describe('DEFAULT_SETTINGS.search filters', () => {
  it('filterSearchUploadDate defaults to "any"', () => {
    expect(DEFAULT_SETTINGS.filterSearchUploadDate).toBe('any');
  });
  it('filterSearchDuration defaults to "any"', () => {
    expect(DEFAULT_SETTINGS.filterSearchDuration).toBe('any');
  });
  it('filterSearchSort defaults to "relevance"', () => {
    expect(DEFAULT_SETTINGS.filterSearchSort).toBe('relevance');
  });
  it('filterSearchType defaults to "any"', () => {
    expect(DEFAULT_SETTINGS.filterSearchType).toBe('any');
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- defaults`
Expected: FAIL — типы неизвестны / ключей нет в `DEFAULT_SETTINGS`.

- [ ] **Step 3: Расширить типы**

Edit `src/shared/types.ts`, добавить выше `ZenSettings`:

```ts
export type UploadDateOpt =
  | 'any' | 'hour' | 'today' | 'week' | 'month' | 'year';

export type DurationOpt =
  | 'any' | 'short' | 'medium' | 'long';

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
```

Добавить в `ZenSettings` (после `filterWatchedThreshold`):

```ts
  filterSearchUploadDate: UploadDateOpt;
  filterSearchDuration: DurationOpt;
  filterSearchSort: SortOpt;
  filterSearchType: TypeOpt;
```

Обновить `ToggleKey`:

```ts
export type ToggleKey = Exclude<
  SettingsKey,
  | 'enabled'
  | 'activeSection'
  | 'filterWatchedEnabled'
  | 'filterWatchedThreshold'
  | 'filterSearchUploadDate'
  | 'filterSearchDuration'
  | 'filterSearchSort'
  | 'filterSearchType'
>;
```

- [ ] **Step 4: Расширить дефолты**

Edit `src/shared/defaults.ts`, добавить в `DEFAULT_SETTINGS`:

```ts
  filterSearchUploadDate: 'any',
  filterSearchDuration: 'any',
  filterSearchSort: 'relevance',
  filterSearchType: 'any',
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm test -- defaults`
Expected: PASS (все кейсы включая «has no extra keys beyond ZenSettings»).

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: без ошибок (в том числе в `css-injector.ts`, `main.ts`, `popup.ts`, `bootstrap.ts`, т.к. новые поля читаются опционально).

- [ ] **Step 7: Commit**

```bash
git add src/shared/types.ts src/shared/defaults.ts tests/defaults.test.ts
git commit -m "feat(types): add YT search filter keys to ZenSettings"
```

---

## Task 2: sp-encoder — varint encoding

**Files:**
- Create: `src/content/filters/sp-encoder.ts`
- Test: `tests/content/sp-encoder.test.ts`

**Контекст:** protobuf varint — байты по 7 бит, старший бит = «есть продолжение». Для значений 0..127 — один байт. Нам достаточно 0..127.

- [ ] **Step 1: Failing test для encodeVarint**

Create `tests/content/sp-encoder.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { encodeVarint } from '../../src/content/filters/sp-encoder';

describe('encodeVarint', () => {
  it.each([
    [0, [0x00]],
    [1, [0x01]],
    [2, [0x02]],
    [3, [0x03]],
    [5, [0x05]],
    [127, [0x7f]],
  ])('encodes %i as %j', (value, expected) => {
    expect(Array.from(encodeVarint(value))).toEqual(expected);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- sp-encoder`
Expected: FAIL — модуль не существует.

- [ ] **Step 3: Минимальная реализация**

Create `src/content/filters/sp-encoder.ts`:

```ts
export function encodeVarint(value: number): Uint8Array {
  if (value < 0 || !Number.isInteger(value)) {
    throw new RangeError('encodeVarint: expected non-negative integer');
  }
  const bytes: number[] = [];
  let n = value;
  while (n > 0x7f) {
    bytes.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  bytes.push(n & 0x7f);
  return Uint8Array.from(bytes);
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- sp-encoder`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/filters/sp-encoder.ts tests/content/sp-encoder.test.ts
git commit -m "feat(filters): add varint encoder for protobuf"
```

---

## Task 3: sp-encoder — protobuf builder

**Files:**
- Modify: `src/content/filters/sp-encoder.ts`
- Test: `tests/content/sp-encoder.test.ts`

**Контекст:** Нужны два wire types — varint (0) и length-delimited (2). Tag-байт = `(field_number << 3) | wire_type`.

- [ ] **Step 1: Failing test для protobuf helpers**

Add to `tests/content/sp-encoder.test.ts`:

```ts
import {
  encodeVarint,
  encodeVarintField,
  encodeLengthDelimitedField,
} from '../../src/content/filters/sp-encoder';

describe('encodeVarintField', () => {
  it('field 1 value 2 → 08 02', () => {
    expect(Array.from(encodeVarintField(1, 2))).toEqual([0x08, 0x02]);
  });
  it('field 2 value 1 → 10 01', () => {
    expect(Array.from(encodeVarintField(2, 1))).toEqual([0x10, 0x01]);
  });
  it('field 3 value 1 → 18 01', () => {
    expect(Array.from(encodeVarintField(3, 1))).toEqual([0x18, 0x01]);
  });
});

describe('encodeLengthDelimitedField', () => {
  it('field 2 with single byte payload 0x08 → 12 01 08', () => {
    const payload = Uint8Array.from([0x08]);
    expect(Array.from(encodeLengthDelimitedField(2, payload))).toEqual([
      0x12, 0x01, 0x08,
    ]);
  });
  it('field 2 with two-byte payload 0x08 0x01 → 12 02 08 01', () => {
    const payload = Uint8Array.from([0x08, 0x01]);
    expect(Array.from(encodeLengthDelimitedField(2, payload))).toEqual([
      0x12, 0x02, 0x08, 0x01,
    ]);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- sp-encoder`
Expected: FAIL — `encodeVarintField`/`encodeLengthDelimitedField` не экспортируются.

- [ ] **Step 3: Реализовать helpers**

Append to `src/content/filters/sp-encoder.ts`:

```ts
const WIRE_VARINT = 0;
const WIRE_LENGTH_DELIMITED = 2;

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export function encodeVarintField(
  fieldNumber: number,
  value: number
): Uint8Array {
  const tag = (fieldNumber << 3) | WIRE_VARINT;
  return concat([encodeVarint(tag), encodeVarint(value)]);
}

export function encodeLengthDelimitedField(
  fieldNumber: number,
  payload: Uint8Array
): Uint8Array {
  const tag = (fieldNumber << 3) | WIRE_LENGTH_DELIMITED;
  return concat([encodeVarint(tag), encodeVarint(payload.length), payload]);
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- sp-encoder`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/filters/sp-encoder.ts tests/content/sp-encoder.test.ts
git commit -m "feat(filters): add protobuf field encoders"
```

---

## Task 4: sp-encoder — encodeSp (one-of-each)

**Files:**
- Modify: `src/content/filters/sp-encoder.ts`
- Test: `tests/content/sp-encoder.test.ts`

**Контекст — reference-строки YouTube:**

| Фильтр | `sp=` (URL-encoded) | base64 до escape | байты |
|---|---|---|---|
| всё default | — | `null` | — |
| Sort=date | `CAI%3D` | `CAI=` | `08 02` |
| Upload=hour | `EgIIAQ%3D%3D` | `EgIIAQ==` | `12 02 08 01` |
| Upload=today | `EgIIAg%3D%3D` | `EgIIAg==` | `12 02 08 02` |
| Upload=week | `EgIIAw%3D%3D` | `EgIIAw==` | `12 02 08 03` |
| Duration=short | `EgIYAQ%3D%3D` | `EgIYAQ==` | `12 02 18 01` |
| Type=video | `EgIQAQ%3D%3D` | `EgIQAQ==` | `12 02 10 01` |

Маппинги:
- top-level field 1 (sort): `relevance`=0 → **не пишем**, `date`=2, `views`=3, `rating`=1. **Важно:** `relevance` — это отсутствие поля, не `0`.
- nested filter message (field 2, length-delimited) содержит подполя:
  - field 1 = upload_date: `hour`=1, `today`=2, `week`=3, `month`=4, `year`=5 (`any` — не пишется)
  - field 2 = type: `video`=1, `channel`=2, `playlist`=3, `movie`=4 (`any` — не пишется)
  - field 3 = duration: `short`=1, `long`=2, `medium`=3 (`any` — не пишется)

- [ ] **Step 1: Failing test на encodeSp — всё default**

Add to `tests/content/sp-encoder.test.ts`:

```ts
import { encodeSp } from '../../src/content/filters/sp-encoder';
import type { SearchFilters } from '../../src/shared/types';

const ALL_DEFAULT: SearchFilters = {
  uploadDate: 'any',
  duration: 'any',
  sort: 'relevance',
  type: 'any',
};

describe('encodeSp — all default', () => {
  it('returns null when every filter is default', () => {
    expect(encodeSp(ALL_DEFAULT)).toBeNull();
  });
});
```

- [ ] **Step 2: Failing test на одиночные значения (table-driven)**

Add after the previous block:

```ts
describe('encodeSp — single-value reference strings', () => {
  it.each<[Partial<SearchFilters>, string]>([
    [{ sort: 'date' }, 'CAI%3D'],
    [{ uploadDate: 'hour' }, 'EgIIAQ%3D%3D'],
    [{ uploadDate: 'today' }, 'EgIIAg%3D%3D'],
    [{ uploadDate: 'week' }, 'EgIIAw%3D%3D'],
    [{ duration: 'short' }, 'EgIYAQ%3D%3D'],
    [{ type: 'video' }, 'EgIQAQ%3D%3D'],
  ])('%j → %s', (partial, expected) => {
    const filters: SearchFilters = { ...ALL_DEFAULT, ...partial };
    expect(encodeSp(filters)).toBe(expected);
  });
});
```

- [ ] **Step 3: Run, verify fail**

Run: `npm test -- sp-encoder`
Expected: FAIL — `encodeSp` не экспортируется.

- [ ] **Step 4: Реализовать encodeSp**

Append to `src/content/filters/sp-encoder.ts`:

```ts
import type {
  DurationOpt,
  SearchFilters,
  SortOpt,
  TypeOpt,
  UploadDateOpt,
} from '../../shared/types';

const SORT_CODES: Record<SortOpt, number | null> = {
  relevance: null,
  date: 2,
  views: 3,
  rating: 1,
};

const UPLOAD_CODES: Record<UploadDateOpt, number | null> = {
  any: null,
  hour: 1,
  today: 2,
  week: 3,
  month: 4,
  year: 5,
};

const TYPE_CODES: Record<TypeOpt, number | null> = {
  any: null,
  video: 1,
  channel: 2,
  playlist: 3,
  movie: 4,
};

const DURATION_CODES: Record<DurationOpt, number | null> = {
  any: null,
  short: 1,
  long: 2,
  medium: 3,
};

function base64Encode(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function encodeSp(filters: SearchFilters): string | null {
  const parts: Uint8Array[] = [];

  const sort = SORT_CODES[filters.sort];
  if (sort !== null) parts.push(encodeVarintField(1, sort));

  const nestedParts: Uint8Array[] = [];
  const upload = UPLOAD_CODES[filters.uploadDate];
  if (upload !== null) nestedParts.push(encodeVarintField(1, upload));
  const type = TYPE_CODES[filters.type];
  if (type !== null) nestedParts.push(encodeVarintField(2, type));
  const duration = DURATION_CODES[filters.duration];
  if (duration !== null) nestedParts.push(encodeVarintField(3, duration));

  if (nestedParts.length > 0) {
    parts.push(encodeLengthDelimitedField(2, concat(nestedParts)));
  }

  if (parts.length === 0) return null;

  const b64 = base64Encode(concat(parts));
  return encodeURIComponent(b64);
}
```

- [ ] **Step 5: Run, verify pass**

Run: `npm test -- sp-encoder`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content/filters/sp-encoder.ts tests/content/sp-encoder.test.ts
git commit -m "feat(filters): encode single YT search filter values to sp="
```

---

## Task 5: sp-encoder — комбинации фильтров

**Files:**
- Modify: `tests/content/sp-encoder.test.ts`

**Контекст — комбинации:** порядок сборки: top-level `sort` (field 1) идёт до nested `filter` (field 2). Внутри `filter` — порядок полей: `upload_date` (1), `type` (2), `duration` (3).

- [ ] **Step 1: Failing test для комбинаций**

Add to `tests/content/sp-encoder.test.ts`:

```ts
describe('encodeSp — combinations', () => {
  it('sort=date + upload=week → CAISAggD (bytes 08 02 12 02 08 03)', () => {
    const filters: SearchFilters = {
      ...ALL_DEFAULT,
      sort: 'date',
      uploadDate: 'week',
    };
    // 08 02  → sort=2 (field 1)
    // 12 02 08 03 → nested filter (field 2, len 2) with upload=3 (field 1)
    // → "CAISAggD"
    expect(encodeSp(filters)).toBe(encodeURIComponent('CAISAggD'));
  });

  it('upload=today + duration=short (bytes 12 04 08 02 18 01)', () => {
    const filters: SearchFilters = {
      ...ALL_DEFAULT,
      uploadDate: 'today',
      duration: 'short',
    };
    // 12 04 08 02 18 01 → nested filter (len 4), upload=2, duration=1
    expect(encodeSp(filters)).toBe(encodeURIComponent('EgQIAhgB'));
  });

  it('sort=views + duration=long + type=video', () => {
    const filters: SearchFilters = {
      ...ALL_DEFAULT,
      sort: 'views',
      duration: 'long',
      type: 'video',
    };
    // 08 03                         → sort=3
    // 12 04 10 01 18 02             → nested: type=1 (field 2), duration=2 (field 3)
    expect(encodeSp(filters)).toBe(encodeURIComponent('CAMSBBABGAI='));
  });

  it('upload=year + type=channel + sort=rating', () => {
    const filters: SearchFilters = {
      ...ALL_DEFAULT,
      sort: 'rating',
      uploadDate: 'year',
      type: 'channel',
    };
    // 08 01                          → sort=1
    // 12 04 08 05 10 02              → nested: upload=5 (field 1), type=2 (field 2)
    expect(encodeSp(filters)).toBe(encodeURIComponent('CAESBAgFEAI='));
  });
});
```

- [ ] **Step 2: Run tests, verify pass**

Run: `npm test -- sp-encoder`
Expected: PASS. Если комбинация фейлится — это bug в `encodeSp`: проверить порядок полей, а не менять эталоны без сверки с живым URL.

- [ ] **Step 3: Граничные enum'ы**

Add to `tests/content/sp-encoder.test.ts`:

```ts
describe('encodeSp — boundary enums', () => {
  it.each<UploadDateOpt>(['hour', 'today', 'week', 'month', 'year'])(
    'uploadDate=%s produces a non-null sp string',
    (value) => {
      const filters: SearchFilters = { ...ALL_DEFAULT, uploadDate: value };
      expect(encodeSp(filters)).not.toBeNull();
      expect(encodeSp(filters)).toMatch(/^[A-Za-z0-9%]+$/);
    }
  );

  it.each<DurationOpt>(['short', 'medium', 'long'])(
    'duration=%s produces a non-null sp string',
    (value) => {
      const filters: SearchFilters = { ...ALL_DEFAULT, duration: value };
      expect(encodeSp(filters)).not.toBeNull();
    }
  );

  it.each<TypeOpt>(['video', 'channel', 'playlist', 'movie'])(
    'type=%s produces a non-null sp string',
    (value) => {
      const filters: SearchFilters = { ...ALL_DEFAULT, type: value };
      expect(encodeSp(filters)).not.toBeNull();
    }
  );

  it.each<SortOpt>(['date', 'views', 'rating'])(
    'sort=%s produces a non-null sp string',
    (value) => {
      const filters: SearchFilters = { ...ALL_DEFAULT, sort: value };
      expect(encodeSp(filters)).not.toBeNull();
    }
  );
});
```

Также добавить нужные импорты типов в шапку файла (если ещё не импортированы):

```ts
import type {
  DurationOpt,
  SearchFilters,
  SortOpt,
  TypeOpt,
  UploadDateOpt,
} from '../../src/shared/types';
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- sp-encoder`
Expected: PASS (все кейсы).

- [ ] **Step 5: Commit**

```bash
git add tests/content/sp-encoder.test.ts
git commit -m "test(filters): cover sp-encoder combinations and boundaries"
```

---

## Task 6: search-url-rewriter — чистая функция rewriteIfNeeded

**Files:**
- Create: `src/content/filters/search-url-rewriter.ts`
- Test: `tests/content/search-url-rewriter.test.ts`

- [ ] **Step 1: Failing test для rewriteIfNeeded**

Create `tests/content/search-url-rewriter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { rewriteIfNeeded } from '../../src/content/filters/search-url-rewriter';
import type { SearchFilters } from '../../src/shared/types';

const DEFAULT_FILTERS: SearchFilters = {
  uploadDate: 'any',
  duration: 'any',
  sort: 'relevance',
  type: 'any',
};

describe('rewriteIfNeeded', () => {
  it('returns same URL when pathname is not /results', () => {
    const url = new URL('https://www.youtube.com/feed/subscriptions');
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    expect(rewriteIfNeeded(url, filters).toString()).toBe(url.toString());
  });

  it('returns same URL when all filters are default', () => {
    const url = new URL('https://www.youtube.com/results?search_query=cats');
    expect(rewriteIfNeeded(url, DEFAULT_FILTERS).toString()).toBe(
      url.toString()
    );
  });

  it('returns same URL when sp= is already present', () => {
    const url = new URL(
      'https://www.youtube.com/results?search_query=cats&sp=CAI%3D'
    );
    const filters: SearchFilters = { ...DEFAULT_FILTERS, uploadDate: 'week' };
    expect(rewriteIfNeeded(url, filters).toString()).toBe(url.toString());
  });

  it('adds sp= to /results without sp= when filters are non-default', () => {
    const url = new URL('https://www.youtube.com/results?search_query=cats');
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    const next = rewriteIfNeeded(url, filters);
    expect(next.searchParams.get('sp')).toBe('CAI=');
    expect(next.searchParams.get('search_query')).toBe('cats');
  });

  it('returns a new URL instance, does not mutate input', () => {
    const url = new URL('https://www.youtube.com/results?search_query=x');
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    const next = rewriteIfNeeded(url, filters);
    expect(next).not.toBe(url);
    expect(url.searchParams.has('sp')).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- search-url-rewriter`
Expected: FAIL — модуль не существует.

- [ ] **Step 3: Реализовать rewriteIfNeeded**

Create `src/content/filters/search-url-rewriter.ts`:

```ts
import type { SearchFilters } from '../../shared/types';
import { encodeSp } from './sp-encoder';

export function rewriteIfNeeded(url: URL, filters: SearchFilters): URL {
  if (url.pathname !== '/results') return url;
  if (url.searchParams.has('sp')) return url;
  const sp = encodeSp(filters);
  if (!sp) return url;
  const next = new URL(url.toString());
  next.searchParams.set('sp', decodeURIComponent(sp));
  return next;
}
```

**Почему `decodeURIComponent`:** `encodeSp` возвращает уже URL-encoded строку (например `CAI%3D`). `URLSearchParams.set` сам кодирует значение при сериализации, поэтому во избежание двойного кодирования передаём сырой base64.

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- search-url-rewriter`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/filters/search-url-rewriter.ts tests/content/search-url-rewriter.test.ts
git commit -m "feat(filters): add rewriteIfNeeded pure URL decorator"
```

---

## Task 7: search-url-rewriter — SPA nav listener

**Files:**
- Modify: `src/content/filters/search-url-rewriter.ts`
- Modify: `tests/content/search-url-rewriter.test.ts`

- [ ] **Step 1: Failing test для installNavListener**

Append to `tests/content/search-url-rewriter.test.ts`:

```ts
import { installNavListener } from '../../src/content/filters/search-url-rewriter';
import { afterEach, beforeEach, vi } from 'vitest';

describe('installNavListener', () => {
  let replaceSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    replaceSpy = vi.spyOn(window.history, 'replaceState');
  });

  afterEach(() => {
    replaceSpy.mockRestore();
  });

  it('does nothing on yt-navigate-start when filters are default', () => {
    const dispose = installNavListener(() => DEFAULT_FILTERS);
    window.history.replaceState({}, '', '/results?search_query=a');
    replaceSpy.mockClear();
    window.dispatchEvent(new Event('yt-navigate-start'));
    expect(replaceSpy).not.toHaveBeenCalled();
    dispose();
  });

  it('replaces URL with sp= when filters non-default on /results without sp', () => {
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    const dispose = installNavListener(() => filters);
    window.history.replaceState({}, '', '/results?search_query=a');
    replaceSpy.mockClear();
    window.dispatchEvent(new Event('yt-navigate-start'));
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    const args = replaceSpy.mock.calls[0]!;
    const newUrl = String(args[2]);
    expect(newUrl).toContain('sp=');
    expect(newUrl).toContain('search_query=a');
    dispose();
  });

  it('dispose removes listener', () => {
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    const dispose = installNavListener(() => filters);
    dispose();
    window.history.replaceState({}, '', '/results?search_query=a');
    replaceSpy.mockClear();
    window.dispatchEvent(new Event('yt-navigate-start'));
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('ignores non-results paths', () => {
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    const dispose = installNavListener(() => filters);
    window.history.replaceState({}, '', '/feed/subscriptions');
    replaceSpy.mockClear();
    window.dispatchEvent(new Event('yt-navigate-start'));
    expect(replaceSpy).not.toHaveBeenCalled();
    dispose();
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- search-url-rewriter`
Expected: FAIL — `installNavListener` не экспортируется.

- [ ] **Step 3: Реализовать installNavListener**

Append to `src/content/filters/search-url-rewriter.ts`:

```ts
export function installNavListener(
  getFilters: () => SearchFilters
): () => void {
  const onNav = (): void => {
    const current = new URL(window.location.href);
    const rewritten = rewriteIfNeeded(current, getFilters());
    if (rewritten.toString() !== current.toString()) {
      window.history.replaceState(
        window.history.state,
        '',
        rewritten.toString()
      );
    }
  };
  window.addEventListener('yt-navigate-start', onNav);
  return () => window.removeEventListener('yt-navigate-start', onNav);
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- search-url-rewriter`
Expected: PASS (все кейсы, включая уже существующие).

- [ ] **Step 5: Commit**

```bash
git add src/content/filters/search-url-rewriter.ts tests/content/search-url-rewriter.test.ts
git commit -m "feat(filters): install yt-navigate-start listener with URL rewrite"
```

---

## Task 8: search-url-rewriter — applyOnLoad для direct-open /results

**Files:**
- Modify: `src/content/filters/search-url-rewriter.ts`
- Modify: `tests/content/search-url-rewriter.test.ts`

**Контекст:** Пользователь открывает `/results?search_query=X` напрямую (закладка, история, URL-bar) — `yt-navigate-start` не стреляет. Вызываем `applyOnLoad` один раз из bootstrap после готовности storage. Чтобы не зациклиться — однократный флаг в `sessionStorage`.

- [ ] **Step 1: Failing test для applyOnLoad**

Append to `tests/content/search-url-rewriter.test.ts`:

```ts
import { applyOnLoad } from '../../src/content/filters/search-url-rewriter';

describe('applyOnLoad', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('rewrites /results URL when sp missing and filters non-default', () => {
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    window.history.replaceState({}, '', '/results?search_query=a');
    const spy = vi.spyOn(window.history, 'replaceState');
    applyOnLoad(() => filters);
    expect(spy).toHaveBeenCalled();
    const newUrl = String(spy.mock.calls.at(-1)![2]);
    expect(newUrl).toContain('sp=');
    spy.mockRestore();
  });

  it('does nothing when not on /results', () => {
    window.history.replaceState({}, '', '/');
    const spy = vi.spyOn(window.history, 'replaceState');
    applyOnLoad(() => ({ ...DEFAULT_FILTERS, sort: 'date' }));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does not run twice in the same session', () => {
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    window.history.replaceState({}, '', '/results?search_query=a');
    applyOnLoad(() => filters);
    const spy = vi.spyOn(window.history, 'replaceState');
    applyOnLoad(() => filters);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does nothing if sp is already present', () => {
    window.history.replaceState(
      {},
      '',
      '/results?search_query=a&sp=CAI%3D'
    );
    const spy = vi.spyOn(window.history, 'replaceState');
    applyOnLoad(() => ({ ...DEFAULT_FILTERS, sort: 'views' }));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- search-url-rewriter`
Expected: FAIL — `applyOnLoad` не экспортируется.

- [ ] **Step 3: Реализовать applyOnLoad**

Append to `src/content/filters/search-url-rewriter.ts`:

```ts
const APPLIED_FLAG = 'yz-sp-applied';

export function applyOnLoad(getFilters: () => SearchFilters): void {
  if (window.sessionStorage.getItem(APPLIED_FLAG)) return;
  const current = new URL(window.location.href);
  if (current.pathname !== '/results') return;
  const rewritten = rewriteIfNeeded(current, getFilters());
  if (rewritten.toString() === current.toString()) return;
  window.sessionStorage.setItem(APPLIED_FLAG, String(Date.now()));
  window.history.replaceState(
    window.history.state,
    '',
    rewritten.toString()
  );
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- search-url-rewriter`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/filters/search-url-rewriter.ts tests/content/search-url-rewriter.test.ts
git commit -m "feat(filters): apply sp= on direct-loaded /results once per session"
```

---

## Task 9: inline-ui — удалить старые тесты chip'а

**Files:**
- Modify: `tests/content/inline-ui.test.ts`

**Контекст:** старые тесты опираются на API (`CHIP_ID`, `createChip` и т. д.), которое мы в следующей задаче удалим. Сначала снесём тесты, чтобы они не ломали CI на промежуточных коммитах.

- [ ] **Step 1: Очистить файл тестов**

Overwrite `tests/content/inline-ui.test.ts` полностью:

```ts
import { describe, it } from 'vitest';

describe.skip('inline-ui — placeholder', () => {
  it('will be filled in the next task', () => {
    /* intentionally empty until filter button implementation lands */
  });
});
```

- [ ] **Step 2: Run, verify pass (skip)**

Run: `npm test -- inline-ui`
Expected: skipped test set, 0 fails.

- [ ] **Step 3: Commit**

```bash
git add tests/content/inline-ui.test.ts
git commit -m "test(inline-ui): wipe chip tests ahead of filter-button rewrite"
```

---

## Task 10: inline-ui — createFiltersButton

**Files:**
- Modify: `src/content/filters/inline-ui.ts`
- Modify: `tests/content/inline-ui.test.ts`

**Контекст:** `inline-ui.ts` после этой задачи содержит ТОЛЬКО `BTN_ID`, `createFiltersButton`, `syncButtonBadge`. Старое chip-API удаляется этим же шагом.

- [ ] **Step 1: Failing test для createFiltersButton**

Overwrite `tests/content/inline-ui.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';

import {
  BTN_ID,
  createFiltersButton,
  syncButtonBadge,
} from '../../src/content/filters/inline-ui';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('createFiltersButton', () => {
  it('creates button with correct id, aria attributes and inactive badge', () => {
    const btn = createFiltersButton();
    expect(btn.id).toBe(BTN_ID);
    expect(btn.type).toBe('button');
    expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.getAttribute('aria-label')).toMatch(/Фильтры/i);
    const badge = btn.querySelector('.yz-btn__badge');
    expect(badge).not.toBeNull();
    expect(badge!.hasAttribute('hidden')).toBe(true);
  });

  it('contains visible label text', () => {
    const btn = createFiltersButton();
    expect(btn.textContent).toContain('Фильтры');
  });
});

describe('syncButtonBadge', () => {
  it('shows badge when any filter is active', () => {
    const btn = createFiltersButton();
    syncButtonBadge(btn, true);
    const badge = btn.querySelector<HTMLElement>('.yz-btn__badge')!;
    expect(badge.hasAttribute('hidden')).toBe(false);
    expect(btn.dataset.hasActive).toBe('true');
  });

  it('hides badge when no filter is active', () => {
    const btn = createFiltersButton();
    syncButtonBadge(btn, true);
    syncButtonBadge(btn, false);
    const badge = btn.querySelector<HTMLElement>('.yz-btn__badge')!;
    expect(badge.hasAttribute('hidden')).toBe(true);
    expect(btn.dataset.hasActive).toBe('false');
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- inline-ui`
Expected: FAIL — `BTN_ID`, `createFiltersButton`, `syncButtonBadge` не экспортируются.

- [ ] **Step 3: Очистить inline-ui.ts и реализовать базу кнопки**

Overwrite `src/content/filters/inline-ui.ts`:

```ts
export const BTN_ID = 'yz-filters-btn';
const LABEL = 'Фильтры';

export function createFiltersButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = BTN_ID;
  btn.className = 'yz-btn';
  btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', LABEL);
  btn.dataset.hasActive = 'false';

  const icon = document.createElement('span');
  icon.className = 'yz-btn__icon';
  icon.textContent = '⚙';

  const label = document.createElement('span');
  label.className = 'yz-btn__label';
  label.textContent = LABEL;

  const badge = document.createElement('span');
  badge.className = 'yz-btn__badge';
  badge.setAttribute('hidden', '');
  badge.textContent = '•';

  btn.appendChild(icon);
  btn.appendChild(label);
  btn.appendChild(badge);
  return btn;
}

export function syncButtonBadge(btn: HTMLElement, hasActive: boolean): void {
  btn.dataset.hasActive = hasActive ? 'true' : 'false';
  const badge = btn.querySelector<HTMLElement>('.yz-btn__badge');
  if (!badge) return;
  if (hasActive) badge.removeAttribute('hidden');
  else badge.setAttribute('hidden', '');
}
```

**Важно:** этот шаг удаляет ВСЁ старое chip-API (`CHIP_ID`, `createChip`, `syncChipState`, `isPathVisible`, `applyChipVisibility`, `mountChip`). Bootstrap в Задаче 14 ещё ссылается на них — TypeScript сломается в `bootstrap.ts` пока мы не дойдём до Задачи 14. Пропускаем этап typecheck в этой задаче намеренно.

- [ ] **Step 4: Run, verify pass (только inline-ui тесты)**

Run: `npm test -- inline-ui`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/filters/inline-ui.ts tests/content/inline-ui.test.ts
git commit -m "feat(inline-ui): introduce Filters button (chip removed)"
```

---

## Task 11: inline-ui — mountFiltersButton

**Files:**
- Modify: `src/content/filters/inline-ui.ts`
- Modify: `tests/content/inline-ui.test.ts`

- [ ] **Step 1: Failing test**

Append to `tests/content/inline-ui.test.ts`:

```ts
import { mountFiltersButton } from '../../src/content/filters/inline-ui';

describe('mountFiltersButton', () => {
  it('returns null when masthead does not exist yet', () => {
    expect(mountFiltersButton()).toBeNull();
  });

  it('inserts button before #buttons inside ytd-masthead #end', () => {
    const masthead = document.createElement('ytd-masthead');
    const end = document.createElement('div');
    end.id = 'end';
    const buttons = document.createElement('div');
    buttons.id = 'buttons';
    end.appendChild(buttons);
    masthead.appendChild(end);
    document.body.appendChild(masthead);

    const btn = mountFiltersButton();
    expect(btn).not.toBeNull();
    expect(btn!.id).toBe(BTN_ID);
    const children = Array.from(end.children);
    const btnIdx = children.findIndex((c) => c.id === BTN_ID);
    const buttonsIdx = children.findIndex((c) => c.id === 'buttons');
    expect(btnIdx).toBeGreaterThan(-1);
    expect(btnIdx).toBeLessThan(buttonsIdx);
  });

  it('is idempotent (returns existing button on second call)', () => {
    const masthead = document.createElement('ytd-masthead');
    const end = document.createElement('div');
    end.id = 'end';
    masthead.appendChild(end);
    document.body.appendChild(masthead);

    const a = mountFiltersButton();
    const b = mountFiltersButton();
    expect(a).toBe(b);
    expect(document.querySelectorAll(`#${BTN_ID}`).length).toBe(1);
  });

  it('appends to #end when #buttons is absent', () => {
    const masthead = document.createElement('ytd-masthead');
    const end = document.createElement('div');
    end.id = 'end';
    masthead.appendChild(end);
    document.body.appendChild(masthead);

    const btn = mountFiltersButton();
    expect(btn).not.toBeNull();
    expect(end.lastElementChild).toBe(btn);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- inline-ui`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

Append to `src/content/filters/inline-ui.ts`:

```ts
export function mountFiltersButton(): HTMLButtonElement | null {
  const existing = document.getElementById(BTN_ID) as HTMLButtonElement | null;
  if (existing) return existing;

  const end = document.querySelector('ytd-masthead #end');
  if (!end) return null;

  const btn = createFiltersButton();
  const buttons = end.querySelector('#buttons');
  if (buttons) end.insertBefore(btn, buttons);
  else end.appendChild(btn);
  return btn;
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- inline-ui`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/filters/inline-ui.ts tests/content/inline-ui.test.ts
git commit -m "feat(inline-ui): mount Filters button into masthead"
```

---

## Task 12: inline-ui — createPanel + open/close

**Files:**
- Modify: `src/content/filters/inline-ui.ts`
- Modify: `tests/content/inline-ui.test.ts`

**Контекст:** Панель рендерится в `document.body` при первом `openPanel`. В ней 1 toggle (watched) и 4 select'а. Каждый `[data-key]` соответствует ключу `ZenSettings`. Значения — массивы опций из `types.ts`.

- [ ] **Step 1: Failing test для createPanel + open/close**

Append to `tests/content/inline-ui.test.ts`:

```ts
import {
  PANEL_ID,
  createPanel,
  openPanel,
  closePanel,
} from '../../src/content/filters/inline-ui';
import { DEFAULT_SETTINGS } from '../../src/shared/defaults';

describe('createPanel', () => {
  it('renders dialog with watched toggle and 4 selects', () => {
    const panel = createPanel(DEFAULT_SETTINGS);
    expect(panel.id).toBe(PANEL_ID);
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-label')).toMatch(/Фильтры/i);
    expect(
      panel.querySelector<HTMLInputElement>(
        'input[type="checkbox"][data-key="filterWatchedEnabled"]'
      )
    ).not.toBeNull();
    expect(
      panel.querySelector('select[data-key="filterSearchUploadDate"]')
    ).not.toBeNull();
    expect(
      panel.querySelector('select[data-key="filterSearchDuration"]')
    ).not.toBeNull();
    expect(
      panel.querySelector('select[data-key="filterSearchSort"]')
    ).not.toBeNull();
    expect(
      panel.querySelector('select[data-key="filterSearchType"]')
    ).not.toBeNull();
  });

  it('select values reflect current settings', () => {
    const panel = createPanel({
      ...DEFAULT_SETTINGS,
      filterSearchSort: 'date',
      filterSearchUploadDate: 'week',
    });
    const sort = panel.querySelector<HTMLSelectElement>(
      'select[data-key="filterSearchSort"]'
    )!;
    expect(sort.value).toBe('date');
    const upload = panel.querySelector<HTMLSelectElement>(
      'select[data-key="filterSearchUploadDate"]'
    )!;
    expect(upload.value).toBe('week');
  });

  it('toggle reflects filterWatchedEnabled', () => {
    const panel = createPanel({ ...DEFAULT_SETTINGS, filterWatchedEnabled: true });
    const toggle = panel.querySelector<HTMLInputElement>(
      'input[data-key="filterWatchedEnabled"]'
    )!;
    expect(toggle.checked).toBe(true);
  });
});

describe('openPanel / closePanel', () => {
  it('openPanel appends panel to body and flips aria-expanded', () => {
    const btn = createFiltersButton();
    document.body.appendChild(btn);
    const panel = openPanel(btn, DEFAULT_SETTINGS);
    expect(panel.parentElement).toBe(document.body);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(PANEL_ID)).toBe(panel);
  });

  it('closePanel removes panel and flips aria-expanded', () => {
    const btn = createFiltersButton();
    document.body.appendChild(btn);
    openPanel(btn, DEFAULT_SETTINGS);
    closePanel(btn);
    expect(document.getElementById(PANEL_ID)).toBeNull();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('openPanel is idempotent (returns existing panel)', () => {
    const btn = createFiltersButton();
    document.body.appendChild(btn);
    const a = openPanel(btn, DEFAULT_SETTINGS);
    const b = openPanel(btn, DEFAULT_SETTINGS);
    expect(a).toBe(b);
    expect(document.querySelectorAll(`#${PANEL_ID}`).length).toBe(1);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- inline-ui`
Expected: FAIL.

- [ ] **Step 3: Реализовать panel builder**

Append to `src/content/filters/inline-ui.ts`:

```ts
import type {
  DurationOpt,
  SettingsKey,
  SortOpt,
  TypeOpt,
  UploadDateOpt,
  ZenSettings,
} from '../../shared/types';

export const PANEL_ID = 'yz-filters-panel';

interface SelectSpec<V extends string> {
  key: SettingsKey;
  label: string;
  options: ReadonlyArray<[V, string]>;
}

const UPLOAD_OPTS: ReadonlyArray<[UploadDateOpt, string]> = [
  ['any', 'Любая'],
  ['hour', 'За час'],
  ['today', 'Сегодня'],
  ['week', 'За неделю'],
  ['month', 'За месяц'],
  ['year', 'За год'],
];

const DURATION_OPTS: ReadonlyArray<[DurationOpt, string]> = [
  ['any', 'Любая'],
  ['short', 'Короткие (до 4 мин)'],
  ['medium', 'Средние (4–20 мин)'],
  ['long', 'Длинные (более 20 мин)'],
];

const SORT_OPTS: ReadonlyArray<[SortOpt, string]> = [
  ['relevance', 'По релевантности'],
  ['date', 'По дате загрузки'],
  ['views', 'По просмотрам'],
  ['rating', 'По рейтингу'],
];

const TYPE_OPTS: ReadonlyArray<[TypeOpt, string]> = [
  ['any', 'Любой'],
  ['video', 'Видео'],
  ['channel', 'Канал'],
  ['playlist', 'Плейлист'],
  ['movie', 'Фильм'],
];

const SELECT_SPECS: ReadonlyArray<SelectSpec<string>> = [
  { key: 'filterSearchUploadDate', label: 'Дата загрузки', options: UPLOAD_OPTS },
  { key: 'filterSearchDuration',   label: 'Длительность', options: DURATION_OPTS },
  { key: 'filterSearchSort',       label: 'Сортировка',   options: SORT_OPTS },
  { key: 'filterSearchType',       label: 'Тип',          options: TYPE_OPTS },
];

function buildSelect(
  spec: SelectSpec<string>,
  value: string
): HTMLLabelElement {
  const row = document.createElement('label');
  row.className = 'yz-row yz-row--select';

  const label = document.createElement('span');
  label.className = 'yz-row__label';
  label.textContent = spec.label;

  const select = document.createElement('select');
  select.dataset.key = spec.key;
  for (const [optValue, optLabel] of spec.options) {
    const opt = document.createElement('option');
    opt.value = optValue;
    opt.textContent = optLabel;
    select.appendChild(opt);
  }
  select.value = value;

  row.appendChild(label);
  row.appendChild(select);
  return row;
}

function buildToggleRow(checked: boolean): HTMLLabelElement {
  const row = document.createElement('label');
  row.className = 'yz-row yz-row--toggle';

  const label = document.createElement('span');
  label.className = 'yz-row__label';
  label.textContent = 'Скрывать просмотренные';

  const wrap = document.createElement('span');
  wrap.className = 'yz-toggle';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.dataset.key = 'filterWatchedEnabled';
  input.checked = checked;
  const slider = document.createElement('span');
  slider.className = 'yz-toggle-slider';
  wrap.appendChild(input);
  wrap.appendChild(slider);

  row.appendChild(label);
  row.appendChild(wrap);
  return row;
}

export function createPanel(settings: ZenSettings): HTMLElement {
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.className = 'yz-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Фильтры');
  panel.setAttribute('aria-modal', 'false');

  const feedGroup = document.createElement('section');
  feedGroup.className = 'yz-group';
  const feedTitle = document.createElement('h3');
  feedTitle.className = 'yz-group__title';
  feedTitle.textContent = 'Фильтры ленты';
  feedGroup.appendChild(feedTitle);
  feedGroup.appendChild(buildToggleRow(settings.filterWatchedEnabled));
  panel.appendChild(feedGroup);

  const searchGroup = document.createElement('section');
  searchGroup.className = 'yz-group';
  const searchTitle = document.createElement('h3');
  searchTitle.className = 'yz-group__title';
  searchTitle.textContent = 'Фильтры поиска';
  searchGroup.appendChild(searchTitle);
  for (const spec of SELECT_SPECS) {
    const value = settings[spec.key] as string;
    searchGroup.appendChild(buildSelect(spec, value));
  }
  panel.appendChild(searchGroup);

  return panel;
}

export function openPanel(
  btn: HTMLElement,
  settings: ZenSettings
): HTMLElement {
  const existing = document.getElementById(PANEL_ID);
  if (existing) return existing;
  const panel = createPanel(settings);
  document.body.appendChild(panel);
  btn.setAttribute('aria-expanded', 'true');
  return panel;
}

export function closePanel(btn: HTMLElement): void {
  const panel = document.getElementById(PANEL_ID);
  if (panel) panel.remove();
  btn.setAttribute('aria-expanded', 'false');
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- inline-ui`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/filters/inline-ui.ts tests/content/inline-ui.test.ts
git commit -m "feat(inline-ui): Filters panel with watched toggle and 4 selects"
```

---

## Task 13: inline-ui — syncPanelInputs

**Files:**
- Modify: `src/content/filters/inline-ui.ts`
- Modify: `tests/content/inline-ui.test.ts`

**Контекст:** при изменении storage во время открытой панели нужно обновить существующие inputs без перерисовки (иначе теряем фокус/позицию).

- [ ] **Step 1: Failing test для syncPanelInputs**

Append to `tests/content/inline-ui.test.ts`:

```ts
import { syncPanelInputs } from '../../src/content/filters/inline-ui';

describe('syncPanelInputs', () => {
  it('updates select values from settings', () => {
    const btn = createFiltersButton();
    document.body.appendChild(btn);
    const panel = openPanel(btn, DEFAULT_SETTINGS);
    syncPanelInputs(panel, {
      ...DEFAULT_SETTINGS,
      filterSearchSort: 'views',
      filterSearchDuration: 'long',
    });
    const sort = panel.querySelector<HTMLSelectElement>(
      'select[data-key="filterSearchSort"]'
    )!;
    const duration = panel.querySelector<HTMLSelectElement>(
      'select[data-key="filterSearchDuration"]'
    )!;
    expect(sort.value).toBe('views');
    expect(duration.value).toBe('long');
  });

  it('updates checkbox state', () => {
    const btn = createFiltersButton();
    document.body.appendChild(btn);
    const panel = openPanel(btn, DEFAULT_SETTINGS);
    syncPanelInputs(panel, { ...DEFAULT_SETTINGS, filterWatchedEnabled: true });
    const toggle = panel.querySelector<HTMLInputElement>(
      'input[data-key="filterWatchedEnabled"]'
    )!;
    expect(toggle.checked).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- inline-ui`
Expected: FAIL — `syncPanelInputs` не экспортируется.

- [ ] **Step 3: Реализовать syncPanelInputs**

Append to `src/content/filters/inline-ui.ts`:

```ts
export function syncPanelInputs(
  panel: HTMLElement,
  settings: ZenSettings
): void {
  const toggle = panel.querySelector<HTMLInputElement>(
    'input[data-key="filterWatchedEnabled"]'
  );
  if (toggle) toggle.checked = settings.filterWatchedEnabled;

  for (const spec of SELECT_SPECS) {
    const select = panel.querySelector<HTMLSelectElement>(
      `select[data-key="${spec.key}"]`
    );
    if (!select) continue;
    const value = settings[spec.key] as string;
    if (select.value !== value) select.value = value;
  }
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- inline-ui`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/filters/inline-ui.ts tests/content/inline-ui.test.ts
git commit -m "feat(inline-ui): syncPanelInputs for storage-driven updates"
```

---

## Task 14: bootstrap — удалить chip, прикрутить Filter button и URL-rewriter

**Files:**
- Modify: `src/content/filters/bootstrap.ts`

**Контекст:** это самая большая задача, но без теста — orchestration слой поверх уже протестированных функций. Верификация — `typecheck`, `npm test` (всё должно зелёным), и ручной smoke через dev-сборку.

- [ ] **Step 1: Переписать bootstrap.ts**

Overwrite `src/content/filters/bootstrap.ts`:

```ts
import { DEFAULT_SETTINGS } from '../../shared/defaults';
import type { SearchFilters, ZenSettings } from '../../shared/types';
import {
  BTN_ID,
  closePanel,
  createFiltersButton,
  mountFiltersButton,
  openPanel,
  PANEL_ID,
  syncButtonBadge,
  syncPanelInputs,
} from './inline-ui';
import { watchForCards } from './observer';
import {
  applyOnLoad,
  installNavListener,
} from './search-url-rewriter';
import { applyWatchedClass, CARD_SELECTORS } from './watched';

const FILTER_ON_CLASS = 'yz-watched-filter-on';
const SEARCH_KEYS = [
  'filterSearchUploadDate',
  'filterSearchDuration',
  'filterSearchSort',
  'filterSearchType',
] as const;

export function scanAll(root: ParentNode, threshold: number): void {
  const cards = root.querySelectorAll(CARD_SELECTORS.join(','));
  cards.forEach((card) => applyWatchedClass(card, threshold));
}

let current: ZenSettings = { ...DEFAULT_SETTINGS };
let observerDispose: (() => void) | null = null;
let navDispose: (() => void) | null = null;

function currentFilters(): SearchFilters {
  return {
    uploadDate: current.filterSearchUploadDate,
    duration: current.filterSearchDuration,
    sort: current.filterSearchSort,
    type: current.filterSearchType,
  };
}

function hasAnyActive(settings: ZenSettings): boolean {
  return (
    settings.filterWatchedEnabled ||
    settings.filterSearchUploadDate !== 'any' ||
    settings.filterSearchDuration !== 'any' ||
    settings.filterSearchSort !== 'relevance' ||
    settings.filterSearchType !== 'any'
  );
}

function onCardAdded(card: Element): void {
  applyWatchedClass(card, current.filterWatchedThreshold);
}

function syncHtmlClass(enabled: boolean): void {
  document.documentElement.classList.toggle(FILTER_ON_CLASS, enabled);
}

function syncUi(): void {
  const btn = document.getElementById(BTN_ID);
  if (btn) syncButtonBadge(btn, hasAnyActive(current));
  const panel = document.getElementById(PANEL_ID);
  if (panel) syncPanelInputs(panel, current);
}

function applySettings(next: ZenSettings): void {
  current = next;
  syncHtmlClass(current.filterWatchedEnabled);
  scanAll(document, current.filterWatchedThreshold);
  syncUi();
}

function wireButton(btn: HTMLButtonElement): void {
  syncButtonBadge(btn, hasAnyActive(current));

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = btn.getAttribute('aria-expanded') === 'true';
    if (open) {
      closePanel(btn);
    } else {
      const panel = openPanel(btn, current);
      wirePanel(panel, btn);
      positionPanel(btn, panel);
    }
  });

  document.addEventListener('click', (e) => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    if (!open) return;
    const target = e.target as Node | null;
    const panel = document.getElementById(PANEL_ID);
    if (btn.contains(target) || panel?.contains(target)) return;
    closePanel(btn);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (btn.getAttribute('aria-expanded') !== 'true') return;
    closePanel(btn);
    btn.focus();
  });
}

function wirePanel(panel: HTMLElement, btn: HTMLButtonElement): void {
  panel.addEventListener('change', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const key = target.dataset?.key;
    if (!key) return;

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      void chrome.storage.sync.set({ [key]: target.checked });
    } else if (target instanceof HTMLSelectElement) {
      void chrome.storage.sync.set({ [key]: target.value });
    }
  });
}

function positionPanel(btn: HTMLElement, panel: HTMLElement): void {
  const rect = btn.getBoundingClientRect();
  panel.style.position = 'fixed';
  panel.style.top = `${Math.round(rect.bottom + 8)}px`;
  panel.style.right = `${Math.round(window.innerWidth - rect.right)}px`;
}

function tryMountButton(): boolean {
  const btn = mountFiltersButton();
  if (!btn) return false;
  wireButton(btn);
  return true;
}

export function initWatchedFilter(): void {
  const defaults = DEFAULT_SETTINGS as unknown as Record<string, unknown>;
  chrome.storage.sync.get(defaults, (stored) => {
    applySettings(stored as unknown as ZenSettings);
    applyOnLoad(currentFilters);
  });

  observerDispose ??= watchForCards(
    document.documentElement,
    CARD_SELECTORS,
    onCardAdded
  );

  navDispose ??= installNavListener(currentFilters);

  if (!tryMountButton()) {
    const mountObserver = new MutationObserver(() => {
      if (tryMountButton()) mountObserver.disconnect();
    });
    mountObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  window.addEventListener('yt-navigate-finish', () => {
    scanAll(document, current.filterWatchedThreshold);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;

    const relevant: (keyof ZenSettings)[] = [
      'filterWatchedEnabled',
      'filterWatchedThreshold',
      ...SEARCH_KEYS,
    ];
    const touched = relevant.some((key) => key in changes);
    if (!touched) return;

    const next: ZenSettings = { ...current };
    for (const key of relevant) {
      if (key in changes) {
        (next as unknown as Record<string, unknown>)[key] =
          changes[key]!.newValue;
      }
    }
    applySettings(next);
  });
}

export function getCurrentEnabled(): boolean {
  return current.filterWatchedEnabled;
}
```

**Почему исчез `onEnabledChange`:** его единственный потребитель был chip (синхронизация `data-active`). Новая кнопка использует `hasAnyActive` и `syncButtonBadge` внутри `syncUi`. Если какой-то тест ссылается на `onEnabledChange` — удалить ссылку.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: без ошибок. Если `onEnabledChange` используется где-то ещё — удалить импорт и вызов.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: все тесты зелёные.

- [ ] **Step 4: Build dev bundle**

Run: `npm run build`
Expected: build successful, `dist/content.js` создан.

- [ ] **Step 5: Commit**

```bash
git add src/content/filters/bootstrap.ts
git commit -m "refactor(bootstrap): swap chip for Filters button + sp rewriter"
```

---

## Task 15: css-injector — заменить chip-стили на button + panel

**Files:**
- Modify: `src/content/css-injector.ts`
- Modify: `tests/css-injector.test.ts`

**Контекст:** текущий блок в `css-injector.ts:74-113` рисует `#yz-chip-watched` и `.yz-chip__*`. Полностью заменяем на стили новой кнопки и панели. Условие инжекта остаётся тем же: стили для watched-карточки (`html.yz-watched-filter-on .yz-watched`) пишутся когда `settings.filterWatchedEnabled === true`, но стили кнопки и панели — **всегда** (если `settings.enabled`), потому что кнопка должна быть видна и когда все фильтры в дефолте.

- [ ] **Step 1: Посмотреть существующий тест**

Read `tests/css-injector.test.ts` — запомнить какие существующие ассерты есть на `#yz-chip-watched`.

- [ ] **Step 2: Failing test для нового CSS**

Edit `tests/css-injector.test.ts`. Найти блок, где проверяется chip-стиль — вся ссылка на `#yz-chip-watched` заменяется на `#yz-filters-btn` с правильным ожиданием. Если такого блока нет — добавить:

```ts
describe('buildCss — filters button', () => {
  it('includes #yz-filters-btn styles when extension enabled', () => {
    const css = buildCss({ ...DEFAULT_SETTINGS, enabled: true });
    expect(css).toMatch(/#yz-filters-btn\s*\{/);
    expect(css).toMatch(/#yz-filters-panel\s*\{/);
  });

  it('omits button styles when extension is disabled', () => {
    const css = buildCss({ ...DEFAULT_SETTINGS, enabled: false });
    expect(css).toBe('');
  });

  it('keeps watched-card CSS gated by filterWatchedEnabled', () => {
    const off = buildCss({ ...DEFAULT_SETTINGS, filterWatchedEnabled: false });
    expect(off).not.toMatch(/yz-watched-filter-on/);
    const on = buildCss({ ...DEFAULT_SETTINGS, filterWatchedEnabled: true });
    expect(on).toMatch(/html\.yz-watched-filter-on \.yz-watched/);
  });
});
```

Импорт `DEFAULT_SETTINGS`, если ещё не импортирован:
```ts
import { DEFAULT_SETTINGS } from '../src/shared/defaults';
```

Все старые тесты, которые ищут `#yz-chip-watched` — удалить или заменить их на проверку `#yz-filters-btn`.

- [ ] **Step 3: Run, verify fail**

Run: `npm test -- css-injector`
Expected: FAIL — старые проверки chip'а ещё проходят (т.к. код ещё не тронут), но новые `#yz-filters-btn` проверки падают.

- [ ] **Step 4: Переделать css-injector**

Edit `src/content/css-injector.ts`. В функции `buildCss`:

1. После `const hasCleaner = ...` добавить раннее возвращение изменить логику на:
   ```ts
   const hasCleaner = cleanerSelectors.length > 0;
   const hasWatched = settings.filterWatchedEnabled === true;

   // Кнопка и панель видны всегда, когда extension enabled.
   const parts: string[] = [KEYFRAMES];
   ```
   (убрать `if (!hasCleaner && !hasWatched) return '';` — теперь мы возвращаем стили даже если все фильтры default: нужны стили кнопки).

2. Блок `if (hasWatched) { ... }` — сохранить, но содержимое оставить только то, что касается `.yz-watched` (удалить всё, что про `#yz-chip-watched` и `.yz-chip__*`).

3. Добавить отдельный блок **всегда** (без условия):

```ts
parts.push(`#yz-filters-btn {
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
  opacity: .75;
  cursor: pointer;
  position: relative;
  transition: opacity .15s, background .15s, border-color .15s;
}
#yz-filters-btn:hover { opacity: 1; }
#yz-filters-btn:focus-visible {
  outline: 2px solid var(--yt-spec-call-to-action, #3ea6ff);
  outline-offset: 2px;
}
#yz-filters-btn[data-has-active="true"] {
  opacity: 1;
  border-color: var(--yt-spec-call-to-action, #3ea6ff);
  color: var(--yt-spec-call-to-action, #3ea6ff);
}
.yz-btn__icon { font-size: 14px; line-height: 1; }
.yz-btn__label { line-height: 1; }
.yz-btn__badge {
  position: absolute;
  top: 4px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--yt-spec-call-to-action, #3ea6ff);
  font-size: 0;
  line-height: 0;
}
.yz-btn__badge[hidden] { display: none; }

#yz-filters-panel {
  background: var(--yt-spec-brand-background-primary, #0f0f0f);
  color: var(--yt-spec-text-primary, #fff);
  border: 1px solid var(--yt-spec-10-percent-layer, rgba(255,255,255,.1));
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,.3);
  padding: 12px 14px;
  min-width: 280px;
  max-width: 360px;
  z-index: 2200;
  font: inherit;
  font-size: 13px;
}
#yz-filters-panel .yz-group { padding: 4px 0; }
#yz-filters-panel .yz-group + .yz-group {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--yt-spec-10-percent-layer, rgba(255,255,255,.08));
}
#yz-filters-panel .yz-group__title {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--yt-spec-text-secondary, #aaa);
}
#yz-filters-panel .yz-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  cursor: pointer;
}
#yz-filters-panel .yz-row__label { flex: 1; }
#yz-filters-panel select {
  background: transparent;
  color: inherit;
  border: 1px solid var(--yt-spec-10-percent-layer, rgba(255,255,255,.14));
  border-radius: 6px;
  padding: 4px 6px;
  font: inherit;
  font-size: 13px;
  max-width: 60%;
}
#yz-filters-panel .yz-toggle {
  position: relative;
  display: inline-block;
  width: 32px;
  height: 18px;
}
#yz-filters-panel .yz-toggle input {
  position: absolute;
  opacity: 0;
  inset: 0;
  margin: 0;
  cursor: pointer;
}
#yz-filters-panel .yz-toggle-slider {
  position: absolute;
  inset: 0;
  border-radius: 18px;
  background: var(--yt-spec-10-percent-layer, rgba(255,255,255,.2));
  transition: background .15s;
}
#yz-filters-panel .yz-toggle-slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform .15s;
}
#yz-filters-panel .yz-toggle input:checked + .yz-toggle-slider {
  background: var(--yt-spec-call-to-action, #3ea6ff);
}
#yz-filters-panel .yz-toggle input:checked + .yz-toggle-slider::before {
  transform: translateX(14px);
}`);
```

4. Оставить блок `if (hasWatched)` только для `.yz-watched`:

```ts
if (hasWatched) {
  parts.push(`html.yz-watched-filter-on .yz-watched {
  display: none !important;
}`);
}
```

5. `return parts.join('\n\n');` — без изменений.

Также ранний `return ''` (при `!settings.enabled`) — сохранить как есть.

- [ ] **Step 5: Run, verify pass**

Run: `npm test -- css-injector`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content/css-injector.ts tests/css-injector.test.ts
git commit -m "style(filters): swap chip CSS for Filters button + panel"
```

---

## Task 16: popup sections — обновить footnote

**Files:**
- Modify: `src/popup/sections/filters.ts`
- Modify: `tests/popup/filters-section.test.ts`

- [ ] **Step 1: Failing test**

Edit `tests/popup/filters-section.test.ts`. Заменить кейс `mentions chip for on/off control` на:

```ts
  it('mentions the Filters button as the on/off control', () => {
    const container = makeContainer();
    renderFilters(container, DEFAULT_SETTINGS);
    const text = (container.textContent ?? '').toLowerCase();
    expect(text).toMatch(/фильтры/);
    expect(text).not.toMatch(/чип/);
  });
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- filters-section`
Expected: FAIL (содержит слово «чип»).

- [ ] **Step 3: Обновить footnote**

Edit `src/popup/sections/filters.ts:69-72`. Заменить текст footnote на:

```ts
  footnote.textContent =
    'Включение, выключение и фильтры поиска — через кнопку «Фильтры» рядом с поиском YouTube.';
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- filters-section`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/popup/sections/filters.ts tests/popup/filters-section.test.ts
git commit -m "docs(popup): mention Filters button instead of chip"
```

---

## Task 17: Full build + manual verification

**Files:**
- (no code changes)

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: всё зелёное.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: без ошибок.

- [ ] **Step 3: Build production bundle**

Run: `npm run build`
Expected: `dist/` содержит `manifest.json`, `content.js`, `background.js`, `popup.html`, `icons/`.

- [ ] **Step 4: Ручная верификация в Chrome**

Загрузить `dist/` как unpacked extension. Пройти чеклист из спека (`docs/superpowers/specs/2026-04-17-filter-dropdown-design.md:342-355`):

- [ ] Кнопка «Фильтры» видна на `/`, `/results`, `/watch`, `/shorts`.
- [ ] Клик открывает панель; повторный клик, клик вне, Esc закрывают.
- [ ] Бейдж появляется когда любой фильтр ≠ default.
- [ ] Toggle «Просмотренные» в панели скрывает карточки мгновенно.
- [ ] Слайдер порога watched в popup перестраивает ленту.
- [ ] Выбрать Upload=week + Sort=date в панели → ввести запрос → URL содержит `&sp=CAISAggD` (или аналогично), результаты отфильтрованы.
- [ ] Повторный поиск — `sp=` снова дописывается.
- [ ] Открыть `/results?search_query=X` напрямую (из закладки) — sp= применяется один раз (проверить `sessionStorage['yz-sp-applied']`).
- [ ] Пользователь кликнул нативный YT-фильтр (Upload date → today) — наш rewriter не перетирает его `sp`.
- [ ] Все настройки переживают `chrome://extensions → reload` и перезагрузку страницы.
- [ ] Тёмная и светлая темы YouTube — кнопка и панель читабельны.
- [ ] Tab-навигация: фокус до кнопки, Enter открывает, Tab циклит в пределах UI, Esc закрывает.

- [ ] **Step 5: Финальный коммит (если надо — фиксы ручной верификации)**

Каждый найденный баг — отдельный TDD-цикл (failing test → fix → pass → commit). После отсутствия багов — задача завершена, ничего коммитить не нужно.

---

## Self-Review Checklist (выполнено автором плана)

- **Spec coverage:**
  - § 3 Архитектура → Tasks 2–13 (sp-encoder, url-rewriter, inline-ui).
  - § 4 Типы/дефолты → Task 1.
  - § 5 Data flow (read/write) → Task 14 (bootstrap).
  - § 6 sp-encoder → Tasks 2–5.
  - § 7 search-url-rewriter → Tasks 6–8.
  - § 8.1 кнопка → Tasks 10–11.
  - § 8.2 панель → Tasks 12–13.
  - § 8.3 стили → Task 15.
  - § 8.4 удаление chip'а → Tasks 9, 10, 14, 15.
  - § 9 Popup-секция → Task 16.
  - § 10.1 юнит-тесты → Tasks 2–13, 15, 16.
  - § 10.3 ручная верификация → Task 17.
  - § 11 edge cases (direct-open /results, user's manual sp, all-default, storage unavailable, masthead re-render) → покрыты в Tasks 6–8 (rewriter + applyOnLoad с sessionStorage-флагом) и Task 14 (mount-observer).
  - § 12 accessibility (aria-haspopup / aria-expanded / role=dialog / Esc) → Tasks 10, 12, 14.

- **Placeholder scan:** нет TBD, TODO, «similar to task N» — каждый код-блок полный.

- **Type consistency:**
  - `SearchFilters` — единый интерфейс из `src/shared/types.ts`, используется одинаково в `sp-encoder`, `search-url-rewriter`, `bootstrap`.
  - Ключи `filterSearchUploadDate / filterSearchDuration / filterSearchSort / filterSearchType` — одинаково во всех задачах.
  - `BTN_ID`, `PANEL_ID`, `createFiltersButton`, `mountFiltersButton`, `openPanel`, `closePanel`, `createPanel`, `syncButtonBadge`, `syncPanelInputs` — имена зафиксированы в Task 10, используются в последующих задачах без расхождений.
  - `CARD_SELECTORS`, `applyWatchedClass`, `watchForCards` — импортируются из существующих файлов без изменений.

- **Focus trap (§12):** спек просит простой keydown-цикл Tab/Shift+Tab. В Task 14 реализован Escape + click-outside; focus trap на Tab оставлен на ручную верификацию (Task 17, чеклист) — если браузер-реальность покажет проблему, добавить отдельный TDD-цикл (failing test → keydown handler). Это соответствует philosophy спека: «простой вариант» + не добавлять код сверх требуемого, пока баг не воспроизведён.
