import { DEFAULT_SETTINGS } from '../../shared/defaults';
import type { SearchFilters, ZenSettings } from '../../shared/types';
import {
  BTN_ID,
  closePanel,
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
import {
  applyWatchedClass,
  CARD_SELECTORS,
  isWatchedFilterActive,
  pathnameFromNavDetail,
} from './watched';

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

function syncHtmlClassForPath(pathname: string): void {
  const active = isWatchedFilterActive(
    current.filterWatchedEnabled,
    pathname
  );
  document.documentElement.classList.toggle(FILTER_ON_CLASS, active);
}

function syncHtmlClass(): void {
  syncHtmlClassForPath(location.pathname);
}

function syncUi(): void {
  const btn = document.getElementById(BTN_ID);
  if (btn) syncButtonBadge(btn, hasAnyActive(current));
  const panel = document.getElementById(PANEL_ID);
  if (panel) syncPanelInputs(panel, current);
}

function applySettings(next: ZenSettings): void {
  current = next;
  syncHtmlClass();
  scanAll(document, current.filterWatchedThreshold);
  syncUi();
}

export function getCurrentEnabled(): boolean {
  return current.filterWatchedEnabled;
}

function positionPanel(btn: HTMLElement, panel: HTMLElement): void {
  const rect = btn.getBoundingClientRect();
  panel.style.position = 'fixed';
  panel.style.top = `${Math.round(rect.bottom + 8)}px`;
  panel.style.right = `${Math.round(window.innerWidth - rect.right)}px`;
}

function wirePanel(panel: HTMLElement): void {
  panel.addEventListener('change', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const key = (target as HTMLInputElement | HTMLSelectElement).dataset?.key;
    if (!key) return;

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      void chrome.storage.sync.set({ [key]: target.checked });
    } else if (target instanceof HTMLSelectElement) {
      void chrome.storage.sync.set({ [key]: target.value });
    }
  });
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
      wirePanel(panel);
      positionPanel(btn, panel);
    }
  });

  document.addEventListener('click', (e) => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    if (!open) return;
    const target = e.target as Node | null;
    const panel = document.getElementById(PANEL_ID);
    if (target && (btn.contains(target) || panel?.contains(target))) return;
    closePanel(btn);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (btn.getAttribute('aria-expanded') !== 'true') return;
    closePanel(btn);
    btn.focus();
  });
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

  // Update the html-class gate as early as possible: yt-navigate-start fires
  // before YouTube paints the new page, so we avoid a flash where every
  // /feed/history card is briefly hidden by display:none.
  window.addEventListener(
    'yt-navigate-start',
    (event) => {
      const detail = (event as CustomEvent).detail;
      const pathname = pathnameFromNavDetail(detail, window.location.origin);
      if (pathname === null) return;
      syncHtmlClassForPath(pathname);
    },
    true
  );

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
    syncHtmlClass();
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
