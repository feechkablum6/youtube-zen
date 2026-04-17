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
