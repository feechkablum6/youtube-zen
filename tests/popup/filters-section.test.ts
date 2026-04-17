import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderFilters } from '../../src/popup/sections/filters';
import { DEFAULT_SETTINGS } from '../../src/shared/defaults';

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

describe('renderFilters', () => {
  it('renders breadcrumb and group label', () => {
    const container = makeContainer();
    renderFilters(container, DEFAULT_SETTINGS);
    expect(container.textContent).toContain('Фильтры ленты');
    expect(container.textContent).toContain('Просмотренные видео');
  });

  it('renders range input matching the threshold', () => {
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

  it('mentions the Filters button as the on/off control', () => {
    const container = makeContainer();
    renderFilters(container, DEFAULT_SETTINGS);
    const text = (container.textContent ?? '').toLowerCase();
    expect(text).toMatch(/фильтры/);
    expect(text).not.toMatch(/чип/);
  });

  it('writes new threshold to storage on input event (debounced)', async () => {
    const container = makeContainer();
    renderFilters(container, { ...DEFAULT_SETTINGS, filterWatchedThreshold: 20 });
    const range = container.querySelector<HTMLInputElement>('input[type="range"]')!;
    range.value = '50';
    range.dispatchEvent(new Event('input', { bubbles: true }));
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
