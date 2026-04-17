import { afterEach, describe, expect, it } from 'vitest';

import {
  BTN_ID,
  PANEL_ID,
  closePanel,
  createFiltersButton,
  createPanel,
  mountFiltersButton,
  openPanel,
  syncButtonBadge,
} from '../../src/content/filters/inline-ui';
import { DEFAULT_SETTINGS } from '../../src/shared/defaults';

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
