import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { onCleanerStoragePatch, renderCleaner } from '../../src/popup/sections/cleaner';
import { DEFAULT_SETTINGS } from '../../src/shared/defaults';
import type { ZenSettings } from '../../src/shared/types';

const setSpy = vi.fn();

beforeEach(() => {
  setSpy.mockReset();
  (globalThis as unknown as { chrome: unknown }).chrome = {
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

afterEach(() => {
  document.body.innerHTML = '';
});

function makeContainer(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

function makeSettings(overrides: Partial<ZenSettings> = {}): ZenSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

describe('renderCleaner — аккордеоны вложенных списков сайдбара', () => {
  it('основные разделы свёрнуты по умолчанию', () => {
    const container = makeContainer();
    renderCleaner(container, makeSettings());
    const groups = container.querySelectorAll<HTMLElement>('.group');
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(
        group.classList.contains('collapsed'),
        `${group.dataset.group} should start collapsed`
      ).toBe(true);
    }
  });

  it('рендерит три аккордеона с правильными master-тумблерами', () => {
    const container = makeContainer();
    renderCleaner(container, makeSettings());
    const youList = container.querySelector<HTMLInputElement>('input[data-key="youList"]');
    const navigator = container.querySelector<HTMLInputElement>('input[data-key="navigator"]');
    const explore = container.querySelector<HTMLInputElement>('input[data-key="explore"]');
    expect(youList).not.toBeNull();
    expect(navigator).not.toBeNull();
    expect(explore).not.toBeNull();
  });

  it('master-тумблер «Вы» по умолчанию выключен (т.к. default = true → checked = true)', () => {
    const container = makeContainer();
    renderCleaner(container, makeSettings());
    const youList = container.querySelector<HTMLInputElement>('input[data-key="youList"]')!;
    // DEFAULT_SETTINGS.youList === true → input.checked === true
    expect(youList.checked).toBe(true);
  });

  it('рендерит все 7 под-тумблеров для «Вы»', () => {
    const container = makeContainer();
    renderCleaner(container, makeSettings());
    const expected: Array<{ key: string; checked: boolean }> = [
      { key: 'youMyChannel', checked: false }, // default false
      { key: 'youHistory', checked: false },
      { key: 'playlists', checked: true }, // default true
      { key: 'youWatchLater', checked: false },
      { key: 'liked', checked: true },
      { key: 'yourVideos', checked: true },
      { key: 'downloads', checked: true },
    ];
    for (const { key, checked } of expected) {
      const input = container.querySelector<HTMLInputElement>(`input[data-key="${key}"]`);
      expect(input, `input for ${key}`).not.toBeNull();
      expect(input!.checked, `${key} checked`).toBe(checked);
    }
  });

  it('рендерит все 3 под-тумблера для «Навигатор» и «Другие возможности»', () => {
    const container = makeContainer();
    renderCleaner(container, makeSettings());
    for (const key of ['navMusic', 'navFilms', 'navLive', 'exploreMusic', 'exploreKids']) {
      const input = container.querySelector<HTMLInputElement>(`input[data-key="${key}"]`);
      expect(input, `input for ${key}`).not.toBeNull();
      // Defaults: navMusic/Films/Live = true, exploreMusic/Kids = true
      expect(input!.checked, `${key} should default true`).toBe(true);
    }
  });

  it('под-тумблеры «Вы» disabled когда master ВЫКЛ, активны когда ВКЛ', () => {
    const container = makeContainer();

    // Master ВЫКЛ
    renderCleaner(container, makeSettings({ youList: false }));
    for (const key of ['youMyChannel', 'youHistory', 'playlists', 'youWatchLater', 'liked', 'yourVideos', 'downloads']) {
      const input = container.querySelector<HTMLInputElement>(`input[data-key="${key}"]`)!;
      expect(input.disabled, `${key} should be disabled when master off`).toBe(true);
    }

    // Master ВКЛ
    container.innerHTML = '';
    renderCleaner(container, makeSettings({ youList: true }));
    for (const key of ['youMyChannel', 'youHistory', 'playlists', 'youWatchLater', 'liked', 'yourVideos', 'downloads']) {
      const input = container.querySelector<HTMLInputElement>(`input[data-key="${key}"]`)!;
      expect(input.disabled, `${key} should be enabled when master on`).toBe(false);
    }
  });

  it('под-тумблеры «Навигатор» и «Другие возможности» disabled когда их master ВЫКЛ', () => {
    const container = makeContainer();
    renderCleaner(container, makeSettings({ navigator: false, explore: false }));
    for (const key of ['navMusic', 'navFilms', 'navLive', 'exploreMusic', 'exploreKids']) {
      const input = container.querySelector<HTMLInputElement>(`input[data-key="${key}"]`)!;
      expect(input.disabled, `${key} should be disabled when master off`).toBe(true);
    }
  });

  it('аккордеоны свёрнуты по умолчанию (chevron-rotate класс / collapsed)', () => {
    const container = makeContainer();
    renderCleaner(container, makeSettings());
    // Ищем корневой элемент аккордеона через data-master-key или специальный класс
    const accordions = container.querySelectorAll<HTMLElement>('[data-accordion]');
    expect(accordions.length).toBe(3);
    for (const acc of accordions) {
      expect(acc.classList.contains('collapsed'), `${acc.dataset.accordion} should start collapsed`).toBe(true);
    }
  });

  it('клик по шеврону/parent (но НЕ по самому тумблеру) раскрывает/сворачивает', () => {
    const container = makeContainer();
    renderCleaner(container, makeSettings());
    const acc = container.querySelector<HTMLElement>('[data-accordion="youList"]')!;
    expect(acc.classList.contains('collapsed')).toBe(true);
    const head = acc.querySelector<HTMLElement>('.accordion-head')!;
    head.click();
    expect(acc.classList.contains('collapsed')).toBe(false);
    head.click();
    expect(acc.classList.contains('collapsed')).toBe(true);
  });

  it('клик по master-тумблеру НЕ триггерит раскрытие/сворачивание', () => {
    const container = makeContainer();
    renderCleaner(container, makeSettings());
    const acc = container.querySelector<HTMLElement>('[data-accordion="youList"]')!;
    const masterInput = acc.querySelector<HTMLInputElement>('input[data-key="youList"]')!;
    masterInput.click(); // это меняет .checked
    expect(acc.classList.contains('collapsed'), 'clicking master input must not toggle accordion').toBe(true);
  });

  it('запись в storage при изменении под-тумблера (master включён)', () => {
    const container = makeContainer();
    renderCleaner(container, makeSettings({ youList: true }));
    const playlists = container.querySelector<HTMLInputElement>('input[data-key="playlists"]')!;
    playlists.checked = false;
    playlists.dispatchEvent(new Event('change', { bubbles: true }));
    expect(setSpy).toHaveBeenCalledWith({ playlists: false });
  });

  it('запись в storage при изменении master-тумблера', () => {
    const container = makeContainer();
    renderCleaner(container, makeSettings());
    const youList = container.querySelector<HTMLInputElement>('input[data-key="youList"]')!;
    youList.checked = false;
    youList.dispatchEvent(new Event('change', { bubbles: true }));
    expect(setSpy).toHaveBeenCalledWith({ youList: false });
  });

  it('раздел «Сайдбар» всё ещё содержит оставшиеся плоские тумблеры (subscriptions, reportButton)', () => {
    const container = makeContainer();
    renderCleaner(container, makeSettings());
    expect(container.querySelector<HTMLInputElement>('input[data-key="subscriptions"]')).not.toBeNull();
    expect(container.querySelector<HTMLInputElement>('input[data-key="reportButton"]')).not.toBeNull();
  });
});

describe('onCleanerStoragePatch — обновляет .checked и disabled-состояние детей', () => {
  it('при изменении master «Вы» → .checked обновляется и дети переключают disabled', () => {
    const container = makeContainer();
    renderCleaner(container, makeSettings({ youList: true }));
    const childInput = container.querySelector<HTMLInputElement>('input[data-key="playlists"]')!;
    expect(childInput.disabled).toBe(false);

    // Пришёл storage patch — master выключили
    onCleanerStoragePatch(container, makeSettings({ youList: false }), { youList: { newValue: false, oldValue: true } });
    const masterInput = container.querySelector<HTMLInputElement>('input[data-key="youList"]')!;
    expect(masterInput.checked).toBe(false);
    expect(childInput.disabled).toBe(true);
  });

  it('при изменении под-тумблера — .checked обновляется', () => {
    const container = makeContainer();
    renderCleaner(container, makeSettings({ youList: true }));
    const playlists = container.querySelector<HTMLInputElement>('input[data-key="playlists"]')!;
    expect(playlists.checked).toBe(true);
    onCleanerStoragePatch(container, makeSettings({ playlists: false }), { playlists: { newValue: false, oldValue: true } });
    expect(playlists.checked).toBe(false);
  });

  it('обновляет .checked для под-тумблера «Навигатор» при изменении его master', () => {
    const container = makeContainer();
    renderCleaner(container, makeSettings({ navigator: true, navMusic: true }));
    const navMusic = container.querySelector<HTMLInputElement>('input[data-key="navMusic"]')!;
    expect(navMusic.disabled).toBe(false);

    onCleanerStoragePatch(
      container,
      makeSettings({ navigator: false, navMusic: true }),
      { navigator: { newValue: false, oldValue: true } }
    );
    const masterInput = container.querySelector<HTMLInputElement>('input[data-key="navigator"]')!;
    expect(masterInput.checked).toBe(false);
    expect(navMusic.disabled).toBe(true);
  });
});
