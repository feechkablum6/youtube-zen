import { afterEach, describe, expect, it } from 'vitest';

import {
  BTN_ID,
  createFiltersButton,
  mountFiltersButton,
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
