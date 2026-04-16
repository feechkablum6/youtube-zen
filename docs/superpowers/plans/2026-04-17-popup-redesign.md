# Popup UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single-screen popup with rail + content architecture (5 sections, declarative registry, Paper light style, 320px).

**Architecture:** `popup.html` provides static shell (header + body[rail, content]). `popup.ts` is an orchestrator — reads `chrome.storage.sync`, renders rail from `SECTIONS[]` registry, swaps content on click. Each section is a pure `render(container, settings)` function. Pure logic (storage wrapper, helpers, registry shape) tested via Vitest; DOM rendering verified manually in Chrome.

**Tech Stack:** TypeScript strict, Vite, Vitest (no jsdom), Manifest V3, `chrome.storage.sync`. Vanilla DOM, no framework.

**Spec:** [docs/superpowers/specs/2026-04-17-popup-redesign-design.md](../specs/2026-04-17-popup-redesign-design.md)

---

## File Map

**New:**
- `src/popup/storage.ts` — typed wrapper over `chrome.storage.sync`
- `src/popup/utils.ts` — pure helpers (`resolveActiveSection`, `countActiveRules`, `groupRulesByGroup`)
- `src/popup/sections.ts` — `PopupSection` interface + `SECTIONS` registry
- `src/popup/sections/stub.ts` — `renderStub` for not-yet-built sections
- `src/popup/sections/settings.ts` — `renderSettings` (reset + about)
- `src/popup/sections/cleaner.ts` — `renderCleaner` (HIDE_RULES → DOM)
- `tests/popup/storage.test.ts`
- `tests/popup/utils.test.ts`
- `tests/popup/sections.test.ts`

**Modified:**
- `src/shared/types.ts` — add `activeSection: string`
- `src/shared/defaults.ts` — add `activeSection: 'cleaner'`
- `tests/defaults.test.ts` — loosen boolean check, add new key
- `popup.html` — new static skeleton, remove Google Fonts
- `src/popup/popup.ts` — full rewrite as orchestrator
- `src/popup/popup.css` — full rewrite (Paper theme)

**Untouched:**
- `src/content/*`, `src/background/*`, `manifest.json`, `src/content/selectors.ts`, `tests/selectors.test.ts`

---

## Task 1: Add `activeSection` to types

**Files:**
- Modify: `src/shared/types.ts`
- Test: `tests/defaults.test.ts` (existing, will update in Task 2)

- [ ] **Step 1: Write the failing test**

First — add a new test in `tests/defaults.test.ts` after the existing `describe('DEFAULT_SETTINGS', ...)` block:

```typescript
import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../src/shared/defaults';
import type { ZenSettings } from '../src/shared/types';

// … existing describe('DEFAULT_SETTINGS') …

describe('DEFAULT_SETTINGS.activeSection', () => {
  it("defaults to 'cleaner'", () => {
    expect(DEFAULT_SETTINGS.activeSection).toBe('cleaner');
  });

  it('is a string', () => {
    expect(typeof DEFAULT_SETTINGS.activeSection).toBe('string');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/defaults.test.ts`
Expected: FAIL — TypeScript error `Property 'activeSection' does not exist on type 'ZenSettings'`, or runtime FAIL with `expected undefined to be 'cleaner'`.

- [ ] **Step 3: Update `ZenSettings` interface**

Edit `src/shared/types.ts`, add `activeSection` after `actionPanel`:

```typescript
export interface ZenSettings {
  enabled: boolean;
  shorts: boolean;
  playlists: boolean;
  liked: boolean;
  yourVideos: boolean;
  downloads: boolean;
  subscriptions: boolean;
  navigator: boolean;
  explore: boolean;
  reportButton: boolean;
  footer: boolean;
  fixUblock: boolean;
  actionPanel: boolean;
  activeSection: string;
}
```

- [ ] **Step 4: Update `DEFAULT_SETTINGS`**

Edit `src/shared/defaults.ts`:

```typescript
import type { ZenSettings } from './types';

export const DEFAULT_SETTINGS: ZenSettings = {
  enabled: true,
  shorts: true,
  playlists: true,
  liked: true,
  yourVideos: true,
  downloads: true,
  subscriptions: true,
  navigator: true,
  explore: true,
  reportButton: true,
  footer: true,
  fixUblock: true,
  actionPanel: true,
  activeSection: 'cleaner',
};
```

- [ ] **Step 5: Fix existing tests broken by non-boolean value**

Edit `tests/defaults.test.ts`. Replace the two occurrences of `expectedKeys` arrays and the `has all values set to true by default` test:

```typescript
import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../src/shared/defaults';
import type { ZenSettings } from '../src/shared/types';

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
];

describe('DEFAULT_SETTINGS', () => {
  it('has all ZenSettings keys', () => {
    for (const key of ALL_KEYS) {
      expect(DEFAULT_SETTINGS).toHaveProperty(key);
    }
  });

  it('all boolean toggle keys default to true', () => {
    for (const key of ALL_KEYS) {
      const value = DEFAULT_SETTINGS[key];
      if (typeof value === 'boolean') {
        expect(value).toBe(true);
      }
    }
  });

  it('has no extra keys beyond ZenSettings', () => {
    expect(Object.keys(DEFAULT_SETTINGS).sort()).toEqual([...ALL_KEYS].sort());
  });
});

describe('DEFAULT_SETTINGS.activeSection', () => {
  it("defaults to 'cleaner'", () => {
    expect(DEFAULT_SETTINGS.activeSection).toBe('cleaner');
  });

  it('is a string', () => {
    expect(typeof DEFAULT_SETTINGS.activeSection).toBe('string');
  });
});
```

- [ ] **Step 6: Run all tests to verify pass**

Run: `npm test`
Expected: PASS — all existing tests + new activeSection tests.

- [ ] **Step 7: Commit**

```bash
git add src/shared/types.ts src/shared/defaults.ts tests/defaults.test.ts
git commit -m "feat(popup): add activeSection to ZenSettings for rail-based popup"
```

---

## Task 2: Create `storage.ts` typed wrapper

**Files:**
- Create: `src/popup/storage.ts`
- Test: `tests/popup/storage.test.ts`

Purpose: centralize `chrome.storage.sync` access with correct TypeScript types. All popup code goes through this instead of raw `chrome.storage.sync`.

- [ ] **Step 1: Write the failing test**

Create `tests/popup/storage.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '../../src/shared/defaults';
import { getSettings, setSetting, subscribeSettings } from '../../src/popup/storage';

type StorageListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string
) => void;

// Minimal chrome.storage.sync mock
function installChromeMock() {
  const storage: Record<string, unknown> = {};
  const listeners: StorageListener[] = [];

  (globalThis as unknown as { chrome: typeof chrome }).chrome = {
    storage: {
      sync: {
        get: vi.fn((defaults: Record<string, unknown>, cb: (v: Record<string, unknown>) => void) => {
          const merged = { ...defaults, ...storage };
          cb(merged);
        }),
        set: vi.fn((items: Record<string, unknown>, cb?: () => void) => {
          const changes: Record<string, chrome.storage.StorageChange> = {};
          for (const [k, v] of Object.entries(items)) {
            changes[k] = { oldValue: storage[k], newValue: v };
            storage[k] = v;
          }
          listeners.forEach((l) => l(changes, 'sync'));
          cb?.();
        }),
      },
      onChanged: {
        addListener: vi.fn((l: StorageListener) => listeners.push(l)),
        removeListener: vi.fn((l: StorageListener) => {
          const i = listeners.indexOf(l);
          if (i >= 0) listeners.splice(i, 1);
        }),
      },
    },
  } as unknown as typeof chrome;

  return { storage, listeners };
}

describe('storage.ts', () => {
  beforeEach(() => {
    installChromeMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSettings', () => {
    it('returns DEFAULT_SETTINGS when storage is empty', async () => {
      const settings = await getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('merges stored values over defaults', async () => {
      await setSetting('shorts', false);
      const settings = await getSettings();
      expect(settings.shorts).toBe(false);
      expect(settings.enabled).toBe(true); // default preserved
    });
  });

  describe('setSetting', () => {
    it('writes a single key to chrome.storage.sync', async () => {
      await setSetting('activeSection', 'tools');
      const settings = await getSettings();
      expect(settings.activeSection).toBe('tools');
    });
  });

  describe('subscribeSettings', () => {
    it('fires the listener when a tracked key changes', async () => {
      const listener = vi.fn();
      subscribeSettings(listener);

      await setSetting('enabled', false);

      expect(listener).toHaveBeenCalledTimes(1);
      const call = listener.mock.calls[0][0] as Record<string, unknown>;
      expect(call).toHaveProperty('enabled');
    });

    it('returns an unsubscribe function', async () => {
      const listener = vi.fn();
      const unsubscribe = subscribeSettings(listener);

      unsubscribe();
      await setSetting('enabled', false);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/popup/storage.test.ts`
Expected: FAIL with `Cannot find module '../../src/popup/storage'`.

- [ ] **Step 3: Implement `storage.ts`**

Create `src/popup/storage.ts`:

```typescript
import { DEFAULT_SETTINGS } from '../shared/defaults';
import type { SettingsKey, ZenSettings } from '../shared/types';

type StorageChanges = Record<string, chrome.storage.StorageChange>;
type SettingsListener = (changes: StorageChanges) => void;

const DEFAULT_RECORD = DEFAULT_SETTINGS as unknown as Record<string, unknown>;

export function getSettings(): Promise<ZenSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_RECORD, (stored) => {
      resolve(stored as ZenSettings);
    });
  });
}

export function setSetting<K extends SettingsKey>(
  key: K,
  value: ZenSettings[K]
): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [key]: value }, () => resolve());
  });
}

export function subscribeSettings(listener: SettingsListener): () => void {
  const wrapped = (changes: StorageChanges, areaName: string) => {
    if (areaName !== 'sync') return;
    listener(changes);
  };
  chrome.storage.onChanged.addListener(wrapped);
  return () => chrome.storage.onChanged.removeListener(wrapped);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/popup/storage.test.ts`
Expected: PASS — all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/popup/storage.ts tests/popup/storage.test.ts
git commit -m "feat(popup): add typed chrome.storage.sync wrapper"
```

---

## Task 3: Pure helper — `resolveActiveSection`

**Files:**
- Create: `src/popup/utils.ts` (new, with one export first)
- Test: `tests/popup/utils.test.ts`

Purpose: given `stored.activeSection` and the list of known section IDs, return a valid ID (fallback to first if stored value is unknown).

- [ ] **Step 1: Write the failing test**

Create `tests/popup/utils.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { resolveActiveSection } from '../../src/popup/utils';

describe('resolveActiveSection', () => {
  const KNOWN_IDS = ['cleaner', 'filters', 'tools', 'themes', 'settings'];

  it('returns the stored id when it is in the known list', () => {
    expect(resolveActiveSection('tools', KNOWN_IDS)).toBe('tools');
    expect(resolveActiveSection('cleaner', KNOWN_IDS)).toBe('cleaner');
  });

  it('returns the first known id when stored id is not in the list', () => {
    expect(resolveActiveSection('deprecated', KNOWN_IDS)).toBe('cleaner');
  });

  it('returns the first known id when stored id is empty string', () => {
    expect(resolveActiveSection('', KNOWN_IDS)).toBe('cleaner');
  });

  it('returns empty string when known list is empty (defensive)', () => {
    expect(resolveActiveSection('anything', [])).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/popup/utils.test.ts`
Expected: FAIL — `Cannot find module '../../src/popup/utils'`.

- [ ] **Step 3: Implement `resolveActiveSection`**

Create `src/popup/utils.ts`:

```typescript
export function resolveActiveSection(
  stored: string,
  knownIds: readonly string[]
): string {
  if (knownIds.includes(stored)) return stored;
  return knownIds[0] ?? '';
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- tests/popup/utils.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/popup/utils.ts tests/popup/utils.test.ts
git commit -m "feat(popup): add resolveActiveSection helper"
```

---

## Task 4: Pure helper — `countActiveRules`

**Files:**
- Modify: `src/popup/utils.ts` (add second export)
- Modify: `tests/popup/utils.test.ts`

Purpose: count how many toggle keys of `HIDE_RULES` are currently on (for the `X / Y` badge in section header).

- [ ] **Step 1: Write the failing test**

Append to `tests/popup/utils.test.ts`:

```typescript
import { countActiveRules } from '../../src/popup/utils';
import { DEFAULT_SETTINGS } from '../../src/shared/defaults';
import type { ToggleKey } from '../../src/shared/types';

describe('countActiveRules', () => {
  const ALL_CLEANER_KEYS: ToggleKey[] = [
    'shorts', 'playlists', 'liked', 'yourVideos', 'downloads',
    'subscriptions', 'navigator', 'explore', 'reportButton', 'footer',
    'fixUblock', 'actionPanel',
  ];

  it('counts all rules active when all defaults are true', () => {
    const result = countActiveRules(DEFAULT_SETTINGS, ALL_CLEANER_KEYS);
    expect(result).toEqual({ active: 12, total: 12 });
  });

  it('counts zero when all toggles are off', () => {
    const off = { ...DEFAULT_SETTINGS };
    for (const k of ALL_CLEANER_KEYS) off[k] = false;
    const result = countActiveRules(off, ALL_CLEANER_KEYS);
    expect(result).toEqual({ active: 0, total: 12 });
  });

  it('counts a partial subset correctly', () => {
    const partial = { ...DEFAULT_SETTINGS, shorts: false, playlists: false };
    const result = countActiveRules(partial, ALL_CLEANER_KEYS);
    expect(result).toEqual({ active: 10, total: 12 });
  });

  it('handles empty key list', () => {
    expect(countActiveRules(DEFAULT_SETTINGS, [])).toEqual({ active: 0, total: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/popup/utils.test.ts`
Expected: FAIL — `countActiveRules is not exported`.

- [ ] **Step 3: Implement `countActiveRules`**

Append to `src/popup/utils.ts`:

```typescript
import type { ToggleKey, ZenSettings } from '../shared/types';

export function countActiveRules(
  settings: ZenSettings,
  keys: readonly ToggleKey[]
): { active: number; total: number } {
  let active = 0;
  for (const k of keys) {
    if (settings[k]) active++;
  }
  return { active, total: keys.length };
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- tests/popup/utils.test.ts`
Expected: PASS — 4 + 4 = 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/popup/utils.ts tests/popup/utils.test.ts
git commit -m "feat(popup): add countActiveRules helper"
```

---

## Task 5: Pure helper — `groupRulesByGroup`

**Files:**
- Modify: `src/popup/utils.ts`
- Modify: `tests/popup/utils.test.ts`

Purpose: deterministic grouping of `HIDE_RULES` entries by their `group` field, preserving insertion order within each group. Used by `renderCleaner`.

- [ ] **Step 1: Write the failing test**

Append to `tests/popup/utils.test.ts`:

```typescript
import { groupRulesByGroup } from '../../src/popup/utils';
import { HIDE_RULES } from '../../src/content/selectors';

describe('groupRulesByGroup', () => {
  it('returns a Map keyed by group name', () => {
    const result = groupRulesByGroup(HIDE_RULES);
    expect(result).toBeInstanceOf(Map);
    expect(result.has('feed')).toBe(true);
    expect(result.has('sidebar')).toBe(true);
    expect(result.has('video')).toBe(true);
    expect(result.has('footer')).toBe(true);
  });

  it('places shorts and fixUblock into feed group', () => {
    const result = groupRulesByGroup(HIDE_RULES);
    const feed = result.get('feed')!;
    const keys = feed.map((e) => e.key);
    expect(keys).toContain('shorts');
    expect(keys).toContain('fixUblock');
  });

  it('places actionPanel into video group', () => {
    const result = groupRulesByGroup(HIDE_RULES);
    const video = result.get('video')!;
    expect(video.map((e) => e.key)).toEqual(['actionPanel']);
  });

  it('preserves insertion order of HIDE_RULES entries within each group', () => {
    const result = groupRulesByGroup(HIDE_RULES);
    const sidebar = result.get('sidebar')!;
    const keys = sidebar.map((e) => e.key);
    // same order as HIDE_RULES declarations for sidebar
    expect(keys).toEqual([
      'playlists', 'liked', 'yourVideos', 'downloads',
      'subscriptions', 'navigator', 'explore', 'reportButton',
    ]);
  });

  it('each entry includes key and label', () => {
    const result = groupRulesByGroup(HIDE_RULES);
    const feed = result.get('feed')!;
    const shorts = feed.find((e) => e.key === 'shorts');
    expect(shorts).toBeDefined();
    expect(shorts!.label).toBe('Shorts');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/popup/utils.test.ts`
Expected: FAIL — `groupRulesByGroup is not exported`.

- [ ] **Step 3: Implement `groupRulesByGroup`**

Update the import line at the top of `src/popup/utils.ts` (which was added in Task 4) to include `HideRule`:

```typescript
import type { HideRule, ToggleKey, ZenSettings } from '../shared/types';
```

Then append at the end:

```typescript
export interface GroupedRule {
  key: ToggleKey;
  label: string;
}

export function groupRulesByGroup(
  rules: Record<string, HideRule>
): Map<HideRule['group'], GroupedRule[]> {
  const result = new Map<HideRule['group'], GroupedRule[]>();
  for (const [key, rule] of Object.entries(rules)) {
    const bucket = result.get(rule.group) ?? [];
    bucket.push({ key: key as ToggleKey, label: rule.label });
    result.set(rule.group, bucket);
  }
  return result;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- tests/popup/utils.test.ts`
Expected: PASS — 8 + 5 = 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/popup/utils.ts tests/popup/utils.test.ts
git commit -m "feat(popup): add groupRulesByGroup helper"
```

---

## Task 6: `SECTIONS` registry

**Files:**
- Create: `src/popup/sections.ts`
- Test: `tests/popup/sections.test.ts`

Purpose: declarative registry of popup sections. Each section has `id`, `label`, `icon`, `position` (`top` / `bottom`), and a `render` function. This task defines the shape and wires the five sections to placeholder `render` functions (real render functions come in later tasks).

- [ ] **Step 1: Write the failing test**

Create `tests/popup/sections.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { SECTIONS } from '../../src/popup/sections';

describe('SECTIONS registry', () => {
  it('has exactly 5 sections', () => {
    expect(SECTIONS).toHaveLength(5);
  });

  it('contains all expected ids in order', () => {
    const ids = SECTIONS.map((s) => s.id);
    expect(ids).toEqual(['cleaner', 'filters', 'tools', 'themes', 'settings']);
  });

  it('settings section has position "bottom"', () => {
    const settings = SECTIONS.find((s) => s.id === 'settings');
    expect(settings?.position).toBe('bottom');
  });

  it('all non-settings sections have position "top"', () => {
    for (const s of SECTIONS.filter((x) => x.id !== 'settings')) {
      expect(s.position).toBe('top');
    }
  });

  it('every section has a non-empty label and icon', () => {
    for (const s of SECTIONS) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.icon.length).toBeGreaterThan(0);
    }
  });

  it('every section has a render function', () => {
    for (const s of SECTIONS) {
      expect(typeof s.render).toBe('function');
    }
  });

  it('ids are unique', () => {
    const ids = SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/popup/sections.test.ts`
Expected: FAIL — `Cannot find module '../../src/popup/sections'`.

- [ ] **Step 3: Implement `sections.ts`**

Create `src/popup/sections.ts`:

```typescript
import type { ZenSettings } from '../shared/types';

export interface PopupSection {
  id: string;
  label: string;
  icon: string;
  position: 'top' | 'bottom';
  render(container: HTMLElement, settings: ZenSettings): void;
}

// Placeholder no-op — real render functions in Tasks 7-9
const noop: PopupSection['render'] = () => {};

export const SECTIONS: PopupSection[] = [
  { id: 'cleaner',  label: 'Очистка UI',    icon: '✦', position: 'top',    render: noop },
  { id: 'filters',  label: 'Фильтры ленты', icon: '◎', position: 'top',    render: noop },
  { id: 'tools',    label: 'Инструменты',   icon: '▶', position: 'top',    render: noop },
  { id: 'themes',   label: 'Темы',          icon: '◐', position: 'top',    render: noop },
  { id: 'settings', label: 'Настройки',     icon: '⚙', position: 'bottom', render: noop },
];
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- tests/popup/sections.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/popup/sections.ts tests/popup/sections.test.ts
git commit -m "feat(popup): add SECTIONS registry with placeholder renderers"
```

---

## Task 7: `renderStub` for not-yet-built sections

**Files:**
- Create: `src/popup/sections/stub.ts`
- Modify: `src/popup/sections.ts` (wire `renderStub` to `filters`, `tools`, `themes`)

Purpose: visual placeholder for 3 sections that are registered but not implemented yet. No test — pure DOM, verified visually.

- [ ] **Step 1: Implement `renderStub`**

Create `src/popup/sections/stub.ts`:

```typescript
import type { PopupSection } from '../sections';

export function makeStub(sectionLabel: string): PopupSection['render'] {
  return function renderStub(container: HTMLElement) {
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'stub';

    const title = document.createElement('div');
    title.className = 'stub-title';
    title.textContent = sectionLabel;

    const body = document.createElement('div');
    body.className = 'stub-body';
    body.textContent = 'Скоро. Следите за релизами.';

    const link = document.createElement('a');
    link.className = 'stub-link';
    link.href = 'https://github.com';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'github →';

    wrapper.appendChild(title);
    wrapper.appendChild(body);
    wrapper.appendChild(link);
    container.appendChild(wrapper);
  };
}
```

- [ ] **Step 2: Wire stubs in `sections.ts`**

Edit `src/popup/sections.ts`:

```typescript
import type { ZenSettings } from '../shared/types';
import { makeStub } from './sections/stub';

export interface PopupSection {
  id: string;
  label: string;
  icon: string;
  position: 'top' | 'bottom';
  render(container: HTMLElement, settings: ZenSettings): void;
}

const noop: PopupSection['render'] = () => {};

export const SECTIONS: PopupSection[] = [
  { id: 'cleaner',  label: 'Очистка UI',    icon: '✦', position: 'top',    render: noop },
  { id: 'filters',  label: 'Фильтры ленты', icon: '◎', position: 'top',    render: makeStub('Фильтры ленты') },
  { id: 'tools',    label: 'Инструменты',   icon: '▶', position: 'top',    render: makeStub('Инструменты') },
  { id: 'themes',   label: 'Темы',          icon: '◐', position: 'top',    render: makeStub('Темы') },
  { id: 'settings', label: 'Настройки',     icon: '⚙', position: 'bottom', render: noop },
];
```

- [ ] **Step 3: Run tests — SECTIONS tests still pass**

Run: `npm test -- tests/popup/sections.test.ts`
Expected: PASS — 7 tests (no regression).

- [ ] **Step 4: Commit**

```bash
git add src/popup/sections/stub.ts src/popup/sections.ts
git commit -m "feat(popup): add renderStub for filters/tools/themes placeholders"
```

---

## Task 8: `renderSettings`

**Files:**
- Create: `src/popup/sections/settings.ts`
- Modify: `src/popup/sections.ts` (wire `renderSettings`)

Purpose: Settings section with "Reset to defaults" button + about block (version, github link). No test — DOM, verified visually in Task 12.

- [ ] **Step 1: Implement `renderSettings`**

Create `src/popup/sections/settings.ts`:

```typescript
import { DEFAULT_SETTINGS } from '../../shared/defaults';
import type { PopupSection } from '../sections';

export const renderSettings: PopupSection['render'] = function (container) {
  container.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'section-head';
  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Настройки';
  head.appendChild(title);
  container.appendChild(head);

  // Reset button
  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn btn-secondary';
  resetBtn.type = 'button';
  resetBtn.textContent = 'Сбросить к дефолтам';
  resetBtn.addEventListener('click', () => {
    chrome.storage.sync.set(DEFAULT_SETTINGS as unknown as Record<string, unknown>);
  });
  container.appendChild(resetBtn);

  // About block
  const about = document.createElement('div');
  about.className = 'about';

  const version = document.createElement('div');
  version.className = 'about-line';
  const versionString = chrome.runtime?.getManifest?.().version ?? '—';
  version.textContent = `Версия ${versionString}`;

  const link = document.createElement('a');
  link.className = 'about-link';
  link.href = 'https://github.com';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'github';

  about.appendChild(version);
  about.appendChild(link);
  container.appendChild(about);
};
```

- [ ] **Step 2: Wire `renderSettings` in `sections.ts`**

Edit `src/popup/sections.ts`, replace `settings` entry's `render: noop` with `renderSettings`:

```typescript
import { renderSettings } from './sections/settings';
// … other imports …

export const SECTIONS: PopupSection[] = [
  { id: 'cleaner',  label: 'Очистка UI',    icon: '✦', position: 'top',    render: noop },
  { id: 'filters',  label: 'Фильтры ленты', icon: '◎', position: 'top',    render: makeStub('Фильтры ленты') },
  { id: 'tools',    label: 'Инструменты',   icon: '▶', position: 'top',    render: makeStub('Инструменты') },
  { id: 'themes',   label: 'Темы',          icon: '◐', position: 'top',    render: makeStub('Темы') },
  { id: 'settings', label: 'Настройки',     icon: '⚙', position: 'bottom', render: renderSettings },
];
```

- [ ] **Step 3: Run tests — no regression**

Run: `npm test`
Expected: PASS — all tests unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/popup/sections/settings.ts src/popup/sections.ts
git commit -m "feat(popup): add renderSettings with reset and about"
```

---

## Task 9: `renderCleaner`

**Files:**
- Create: `src/popup/sections/cleaner.ts`
- Modify: `src/popup/sections.ts` (wire `renderCleaner`)

Purpose: the UX cleaner section. Uses `groupRulesByGroup` + `countActiveRules` helpers from Task 4–5. Toggle click writes to `chrome.storage.sync`.

- [ ] **Step 1: Implement `renderCleaner`**

Create `src/popup/sections/cleaner.ts`:

```typescript
import { HIDE_RULES } from '../../content/selectors';
import { GROUP_LABELS, type HideRule, type ToggleKey, type ZenSettings } from '../../shared/types';
import { countActiveRules, groupRulesByGroup } from '../utils';
import type { PopupSection } from '../sections';

const ALL_KEYS = Object.keys(HIDE_RULES) as ToggleKey[];

export const renderCleaner: PopupSection['render'] = function (container, settings) {
  container.innerHTML = '';

  // Header with title + X / Y counter
  const head = document.createElement('div');
  head.className = 'section-head';

  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Очистка UI';

  const meta = document.createElement('div');
  meta.className = 'section-meta';
  const { active, total } = countActiveRules(settings, ALL_KEYS);
  meta.textContent = `${active} / ${total}`;

  head.appendChild(title);
  head.appendChild(meta);
  container.appendChild(head);

  // Groups
  const grouped = groupRulesByGroup(HIDE_RULES);
  const groupOrder: HideRule['group'][] = ['feed', 'sidebar', 'video', 'footer'];

  for (const group of groupOrder) {
    const entries = grouped.get(group);
    if (!entries || entries.length === 0) continue;

    const groupEl = document.createElement('div');
    groupEl.className = 'group';

    const label = document.createElement('div');
    label.className = 'group-label';
    label.textContent = GROUP_LABELS[group];
    groupEl.appendChild(label);

    for (const entry of entries) {
      const row = document.createElement('label');
      row.className = 'row';

      const rowLabel = document.createElement('span');
      rowLabel.className = 'row-label';
      rowLabel.textContent = entry.label;

      const toggle = document.createElement('span');
      toggle.className = 'toggle';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = settings[entry.key];
      input.addEventListener('change', () => {
        chrome.storage.sync.set({ [entry.key]: input.checked });
      });

      const slider = document.createElement('span');
      slider.className = 'toggle-slider';

      toggle.appendChild(input);
      toggle.appendChild(slider);

      row.appendChild(rowLabel);
      row.appendChild(toggle);
      groupEl.appendChild(row);
    }

    container.appendChild(groupEl);
  }
};
```

- [ ] **Step 2: Wire `renderCleaner` in `sections.ts`**

Edit `src/popup/sections.ts`, replace `cleaner` entry's `render: noop` with `renderCleaner`:

```typescript
import { renderCleaner } from './sections/cleaner';
import { renderSettings } from './sections/settings';
import { makeStub } from './sections/stub';

// … PopupSection interface …

export const SECTIONS: PopupSection[] = [
  { id: 'cleaner',  label: 'Очистка UI',    icon: '✦', position: 'top',    render: renderCleaner },
  { id: 'filters',  label: 'Фильтры ленты', icon: '◎', position: 'top',    render: makeStub('Фильтры ленты') },
  { id: 'tools',    label: 'Инструменты',   icon: '▶', position: 'top',    render: makeStub('Инструменты') },
  { id: 'themes',   label: 'Темы',          icon: '◐', position: 'top',    render: makeStub('Темы') },
  { id: 'settings', label: 'Настройки',     icon: '⚙', position: 'bottom', render: renderSettings },
];
```

Also remove the now-unused `noop` constant.

- [ ] **Step 3: Run tests — no regression**

Run: `npm test`
Expected: PASS — all tests.

- [ ] **Step 4: Commit**

```bash
git add src/popup/sections/cleaner.ts src/popup/sections.ts
git commit -m "feat(popup): add renderCleaner using shared helpers"
```

---

## Task 10: New `popup.html` skeleton

**Files:**
- Modify: `popup.html`

- [ ] **Step 1: Replace `popup.html` with new skeleton**

Overwrite `popup.html` with:

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YouTube Zen</title>
  <link rel="stylesheet" href="./src/popup/popup.css">
</head>
<body>
  <div class="popup">
    <header class="popup-header">
      <div class="logo" aria-hidden="true">Z</div>
      <div class="title">YouTube Zen</div>
      <label class="master-switch">
        <input type="checkbox" id="master">
        <span class="master-slider"></span>
      </label>
    </header>
    <div class="popup-body">
      <nav class="rail" id="rail" aria-label="Разделы"></nav>
      <main class="content" id="content"></main>
    </div>
  </div>
  <script type="module" src="./src/popup/popup.ts"></script>
</body>
</html>
```

Key changes from old:
- Removed Google Fonts preconnect and `DM Sans` link
- Removed old `#toggles-container` and master-toggle-in-header-with-logo layout
- Added `#rail` / `#content` containers
- Added accessible `aria-label` on nav

- [ ] **Step 2: Run build to confirm HTML is parsed OK**

Run: `npm run build`
Expected: build succeeds (will produce broken runtime until Task 12 rewrites `popup.ts`, that's fine — this step only confirms HTML parses).

- [ ] **Step 3: Commit**

```bash
git add popup.html
git commit -m "feat(popup): new html skeleton with rail + content containers"
```

---

## Task 11: Rewrite `popup.css` with Paper theme

**Files:**
- Modify: `src/popup/popup.css`

- [ ] **Step 1: Replace `popup.css` with Paper theme**

Overwrite `src/popup/popup.css` with:

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg: #fafaf9;
  --bg-rail: #f7f5f3;
  --bg-hover: #f4f4f3;
  --border: #e7e5e4;
  --border-soft: #f0eeec;
  --text: #18181b;
  --text-muted: #44403c;
  --text-subtle: #a8a29e;
  --accent: #18181b;
  --accent-contrast: #fafaf9;
  --radius-sm: 5px;
  --radius-md: 6px;
  --radius-lg: 7px;
  --transition: 0.15s ease;
}

body {
  font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  width: 320px;
}

.popup {
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

/* Header */
.popup-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-soft);
}

.logo {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: var(--accent-contrast);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.2px;
  flex: 1;
}

.master-switch {
  position: relative;
  display: inline-block;
  width: 28px;
  height: 16px;
  flex-shrink: 0;
  cursor: pointer;
}

.master-switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.master-slider {
  display: block;
  width: 28px;
  height: 16px;
  background: var(--border);
  border-radius: 8px;
  position: relative;
  transition: background var(--transition);
}

.master-slider::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  transition: transform var(--transition);
}

.master-switch input:checked + .master-slider {
  background: var(--accent);
}

.master-switch input:checked + .master-slider::after {
  transform: translateX(12px);
}

/* Body */
.popup-body {
  display: flex;
  min-height: 300px;
}

/* Rail */
.rail {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 5px;
  width: 36px;
  flex-shrink: 0;
  background: var(--bg-rail);
  border-right: 1px solid var(--border-soft);
}

.rail-btn {
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-subtle);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition), color var(--transition);
  padding: 0;
  font-family: inherit;
}

.rail-btn:hover { background: var(--border-soft); color: var(--text-muted); }
.rail-btn.active { background: var(--accent); color: var(--accent-contrast); }

.rail-spacer { flex: 1; }

/* Content */
.content {
  flex: 1;
  padding: 8px 10px;
  max-height: 480px;
  overflow-y: auto;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0 2px;
  margin-bottom: 6px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
}

.section-meta {
  font-size: 9px;
  color: var(--text-subtle);
}

/* Groups */
.group { margin-bottom: 6px; }
.group:last-child { margin-bottom: 0; }

.group-label {
  font-size: 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.1px;
  color: var(--text-subtle);
  padding: 0 2px 2px;
}

/* Row */
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition);
}

.row:hover { background: var(--bg-hover); }

.row-label {
  font-size: 11px;
  color: var(--text-muted);
  user-select: none;
}

/* Toggle */
.toggle {
  position: relative;
  display: inline-block;
  width: 22px;
  height: 12px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.toggle-slider {
  display: block;
  width: 22px;
  height: 12px;
  background: var(--border);
  border-radius: 7px;
  position: relative;
  transition: background var(--transition);
  cursor: pointer;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 8px;
  height: 8px;
  background: #fff;
  border-radius: 50%;
  transition: transform var(--transition);
}

.toggle input:checked + .toggle-slider { background: var(--accent); }
.toggle input:checked + .toggle-slider::after { transform: translateX(10px); }

/* Disabled state */
.popup-body.disabled {
  opacity: 0.4;
  pointer-events: none;
  transition: opacity var(--transition);
}

/* Stub section */
.stub {
  padding: 16px 8px;
  text-align: center;
}

.stub-title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
}

.stub-body {
  font-size: 11px;
  color: var(--text-subtle);
  margin-bottom: 10px;
}

.stub-link {
  font-size: 10px;
  color: var(--text-subtle);
  text-decoration: none;
}
.stub-link:hover { color: var(--text); }

/* Settings section */
.btn {
  font-family: inherit;
  font-size: 11px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  cursor: pointer;
  width: 100%;
  margin-bottom: 10px;
  transition: background var(--transition);
}
.btn:hover { background: var(--bg-hover); }

.about {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 2px;
  font-size: 10px;
  color: var(--text-subtle);
}

.about-link { color: var(--text-subtle); text-decoration: none; }
.about-link:hover { color: var(--text); }

/* Content fade on section switch */
.content { animation: fadeIn 0.15s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
```

- [ ] **Step 2: Run build to confirm CSS compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/popup/popup.css
git commit -m "feat(popup): paper light theme for rail + content layout"
```

---

## Task 12: Rewrite `popup.ts` as orchestrator

**Files:**
- Modify: `src/popup/popup.ts`

Purpose: find `#master`, `#rail`, `#content` in the static skeleton, populate them, wire click handlers and storage subscription.

- [ ] **Step 1: Replace `popup.ts` with orchestrator**

Overwrite `src/popup/popup.ts` with:

```typescript
import { getSettings, setSetting, subscribeSettings } from './storage';
import { SECTIONS, type PopupSection } from './sections';
import { resolveActiveSection } from './utils';
import type { ZenSettings } from '../shared/types';

function findSection(id: string): PopupSection {
  return SECTIONS.find((s) => s.id === id) ?? SECTIONS[0];
}

function renderRail(railEl: HTMLElement, activeId: string, onSelect: (id: string) => void): void {
  railEl.innerHTML = '';

  const top = SECTIONS.filter((s) => s.position === 'top');
  const bottom = SECTIONS.filter((s) => s.position === 'bottom');

  const appendBtns = (sections: PopupSection[]) => {
    for (const s of sections) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rail-btn' + (s.id === activeId ? ' active' : '');
      btn.textContent = s.icon;
      btn.title = s.label;
      btn.setAttribute('aria-label', s.label);
      btn.addEventListener('click', () => onSelect(s.id));
      railEl.appendChild(btn);
    }
  };

  appendBtns(top);

  const spacer = document.createElement('div');
  spacer.className = 'rail-spacer';
  railEl.appendChild(spacer);

  appendBtns(bottom);
}

function renderContent(contentEl: HTMLElement, activeId: string, settings: ZenSettings): void {
  const section = findSection(activeId);
  // restart CSS animation
  contentEl.style.animation = 'none';
  contentEl.offsetHeight; // trigger reflow
  contentEl.style.animation = '';
  section.render(contentEl, settings);
}

function applyDisabledState(bodyEl: HTMLElement, enabled: boolean): void {
  bodyEl.classList.toggle('disabled', !enabled);
}

async function init(): Promise<void> {
  const masterInput = document.querySelector<HTMLInputElement>('#master');
  const railEl = document.querySelector<HTMLElement>('#rail');
  const contentEl = document.querySelector<HTMLElement>('#content');
  const bodyEl = document.querySelector<HTMLElement>('.popup-body');

  if (!masterInput || !railEl || !contentEl || !bodyEl) return;

  let settings = await getSettings();
  const knownIds = SECTIONS.map((s) => s.id);
  let activeId = resolveActiveSection(settings.activeSection, knownIds);

  // Initial paint
  masterInput.checked = settings.enabled;
  applyDisabledState(bodyEl, settings.enabled);
  renderRail(railEl, activeId, handleSelect);
  renderContent(contentEl, activeId, settings);

  // Master switch
  masterInput.addEventListener('change', () => {
    void setSetting('enabled', masterInput.checked);
  });

  // Storage change → update in place
  subscribeSettings((changes) => {
    // Pick up the new full settings snapshot
    void getSettings().then((latest) => {
      settings = latest;

      if ('enabled' in changes) {
        masterInput.checked = settings.enabled;
        applyDisabledState(bodyEl, settings.enabled);
      }

      // If active section changed externally (another popup window), re-render rail
      if ('activeSection' in changes) {
        const next = resolveActiveSection(settings.activeSection, knownIds);
        if (next !== activeId) {
          activeId = next;
          renderRail(railEl, activeId, handleSelect);
        }
      }

      // Any other change — re-render content so toggles reflect the new state
      renderContent(contentEl, activeId, settings);
    });
  });

  function handleSelect(id: string): void {
    if (id === activeId) return;
    activeId = id;
    void setSetting('activeSection', id);
    renderRail(railEl!, activeId, handleSelect);
    renderContent(contentEl!, activeId, settings);
  }
}

document.addEventListener('DOMContentLoaded', init);
```

- [ ] **Step 2: Run tests — all pass**

Run: `npm test`
Expected: PASS — all 20+ tests from prior tasks.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: build succeeds with no TS errors.

- [ ] **Step 4: Commit**

```bash
git add src/popup/popup.ts
git commit -m "feat(popup): orchestrator wiring rail, sections, and storage"
```

---

## Task 13: Manual QA in Chrome + CLAUDE.md update

**Files:**
- Modify: `CLAUDE.md` (update `## Structure` section)

- [ ] **Step 1: Load extension in Chrome**

1. Run `npm run build`
2. Open `chrome://extensions`
3. Enable Developer mode (if not already)
4. Click "Load unpacked" → select `dist/` (or reload if already loaded)
5. Open YouTube, click extension icon

- [ ] **Step 2: Visual smoke checklist**

Verify each:
- Popup opens at 320px width, light Paper style
- Header shows «Z» logo + «YouTube Zen» title + master-switch (on)
- Rail on the left shows 5 icons: `✦ ◎ ▶ ◐` stacked at top, `⚙` at the bottom
- «Очистка UI» is the active rail button (dark bg, white icon) on first open
- Content shows section title «Очистка UI» + «12 / 12» counter (when all defaults on)
- Groups visible: Лента, Сайдбар, Страница видео, Подвал
- Clicking any toggle switches the UI; the YouTube page updates accordingly (e.g., turning Shorts off makes shelf reappear)
- Clicking the rail `◎`, `▶`, `◐` buttons shows stub «Скоро. Следите за релизами» + github link
- Clicking `⚙` shows Settings: «Сбросить к дефолтам» button + «Версия X.Y.Z» + github link
- Clicking «Сбросить» restores all toggles to on
- Closing and re-opening popup: last selected rail section is still active
- Turning master-switch off fades the body (opacity 0.4) and disables clicks inside content/rail actions on the page stop applying
- Turning master-switch back on restores everything

- [ ] **Step 3: Fix any issues found**

If anything above fails, fix inline in the relevant file and re-build. Commit any fix with a descriptive message.

- [ ] **Step 4: Update `CLAUDE.md` — Structure section**

Edit `CLAUDE.md`, replace the `## Structure` section:

```markdown
## Structure

- `src/shared/` — types and defaults (shared between all components)
- `src/content/` — content script (CSS injection, selectors mapping)
- `src/background/` — service worker (minimal, sets defaults on install)
- `src/popup/` — popup UI (rail + content architecture)
  - `popup.ts` — orchestrator (reads storage, mounts sections)
  - `popup.css` — Paper light theme, 320px
  - `sections.ts` — `SECTIONS` declarative registry
  - `sections/` — per-section render functions (`cleaner`, `settings`, `stub`)
  - `storage.ts` — typed wrapper over `chrome.storage.sync`
  - `utils.ts` — pure helpers (`resolveActiveSection`, `countActiveRules`, `groupRulesByGroup`)
- `tests/` — unit tests (pure functions only, no browser)
  - `tests/popup/` — popup helpers and registry tests
```

And replace the `## Conventions` section last bullet (about popup generating toggles):

```markdown
- Adding a new popup section: one entry in `SECTIONS` in `src/popup/sections.ts` + a `render(container, settings)` function. No changes to `popup.ts` or `popup.html`.
- Adding a new hideable element (Очистка UI): one entry in `HIDE_RULES` in `src/content/selectors.ts` — popup cleaner section and CSS injector derive from it automatically.
```

- [ ] **Step 5: Final commit**

```bash
git add CLAUDE.md
git commit -m "docs: update project structure for rail-based popup"
```

- [ ] **Step 6: Confirm final state**

Run: `npm test && npm run build`
Expected: all tests pass, build succeeds.

Run: `git log --oneline -15`
Expected: ~13 new commits, one per task, cleanly staged.

---

## Self-Review Notes

**Spec coverage:** Every item in the design doc maps to a task:
- `activeSection` type/default → Task 1 ✓
- Declarative SECTIONS registry → Task 6 ✓
- 5 rail sections (cleaner/filters/tools/themes/settings) → Tasks 7, 8, 9 ✓
- storage wrapper → Task 2 ✓
- Pure helpers (resolveActiveSection, countActiveRules, groupRulesByGroup) → Tasks 3, 4, 5 ✓
- Paper light style, 320px, system-ui font → Task 11 ✓
- HTML skeleton with static header + rail/content containers → Task 10 ✓
- Orchestrator popup.ts with storage subscription → Task 12 ✓
- Manual QA in Chrome, CLAUDE.md update → Task 13 ✓

**Type consistency:** `PopupSection.render(container, settings)` signature used consistently. `ToggleKey`, `ZenSettings`, `HideRule` names match `src/shared/types.ts`. `countActiveRules` returns `{ active, total }` in all tasks.

**No placeholders.** Every code block is complete and runnable.

**Granularity:** Each step is 2–5 minutes. Task 1 has 7 steps (slightly more due to combined type+defaults+test-migration), others have 4–5.
