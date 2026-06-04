import { afterEach, describe, expect, it } from 'vitest';

import {
  BTN_ID,
  PANEL_ID,
  closePanel,
  createFiltersButton,
  createPanel,
  installPanelAutoClose,
  mountFiltersButton,
  openPanel,
  syncButtonBadge,
  syncPanelInputs,
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

  it('keeps label text for accessibility without relying on visible copy', () => {
    const btn = createFiltersButton();
    expect(btn.textContent).toContain('Фильтры');
    expect(btn.title).toBe('Фильтры');
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
  it('returns null when search button does not exist yet', () => {
    expect(mountFiltersButton()).toBeNull();
  });

  it('inserts button immediately after the native search button', () => {
    const masthead = document.createElement('ytd-masthead');
    const searchBox = document.createElement('div');
    const searchButton = document.createElement('button');
    searchButton.id = 'search-icon-legacy';
    searchBox.appendChild(searchButton);
    masthead.appendChild(searchBox);
    document.body.appendChild(masthead);

    const btn = mountFiltersButton();
    expect(btn).not.toBeNull();
    expect(btn!.id).toBe(BTN_ID);
    expect(searchButton.nextElementSibling).toBe(btn);
    expect(searchButton.classList.contains('yz-search-btn-attached')).toBe(true);
  });

  it('supports the current YouTube search button markup', () => {
    const masthead = document.createElement('ytd-masthead');
    const searchBox = document.createElement('div');
    const searchButton = document.createElement('button');
    searchButton.className = 'ytSearchboxComponentSearchButton';
    searchButton.setAttribute('aria-label', 'Search');
    searchBox.appendChild(searchButton);
    masthead.appendChild(searchBox);
    document.body.appendChild(masthead);

    const btn = mountFiltersButton();
    expect(btn).not.toBeNull();
    expect(searchButton.nextElementSibling).toBe(btn);
    expect(searchButton.classList.contains('yz-search-btn-attached')).toBe(true);
  });

  it('is idempotent (returns existing button on second call)', () => {
    const masthead = document.createElement('ytd-masthead');
    const searchButton = document.createElement('button');
    searchButton.id = 'search-icon-legacy';
    masthead.appendChild(searchButton);
    document.body.appendChild(masthead);

    const a = mountFiltersButton();
    const b = mountFiltersButton();
    expect(a).toBe(b);
    expect(document.querySelectorAll(`#${BTN_ID}`).length).toBe(1);
  });
});

describe('createPanel', () => {
  it('renders dialog with feed toggles and 4 selects', () => {
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
      panel.querySelector<HTMLInputElement>(
        'input[type="checkbox"][data-key="shorts"]'
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

  it('shorts toggle reflects shorts setting', () => {
    const panel = createPanel({ ...DEFAULT_SETTINGS, shorts: false });
    const toggle = panel.querySelector<HTMLInputElement>(
      'input[data-key="shorts"]'
    )!;
    expect(toggle.checked).toBe(false);
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

describe('installPanelAutoClose', () => {
  it('closes panel on outside pointerdown even if the target stops propagation', () => {
    const btn = createFiltersButton();
    const video = document.createElement('video');
    document.body.append(btn, video);
    openPanel(btn, DEFAULT_SETTINGS);
    installPanelAutoClose(btn);
    video.addEventListener('pointerdown', (e) => e.stopPropagation());

    video.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(document.getElementById(PANEL_ID)).toBeNull();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps panel open on pointerdown inside panel inputs', () => {
    const btn = createFiltersButton();
    document.body.appendChild(btn);
    const panel = openPanel(btn, DEFAULT_SETTINGS);
    installPanelAutoClose(btn);
    const input = panel.querySelector('input')!;

    input.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(document.getElementById(PANEL_ID)).toBe(panel);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps panel open on pointerdown on the filters button', () => {
    const btn = createFiltersButton();
    document.body.appendChild(btn);
    const panel = openPanel(btn, DEFAULT_SETTINGS);
    installPanelAutoClose(btn);

    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(document.getElementById(PANEL_ID)).toBe(panel);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });
});

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
    syncPanelInputs(panel, {
      ...DEFAULT_SETTINGS,
      filterWatchedEnabled: true,
      shorts: false,
    });
    const watched = panel.querySelector<HTMLInputElement>(
      'input[data-key="filterWatchedEnabled"]'
    )!;
    const shorts = panel.querySelector<HTMLInputElement>(
      'input[data-key="shorts"]'
    )!;
    expect(watched.checked).toBe(true);
    expect(shorts.checked).toBe(false);
  });
});
