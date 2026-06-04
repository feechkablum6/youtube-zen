import { DEFAULT_SETTINGS } from '../../shared/defaults';
import type { SearchFilters, ZenSettings } from '../../shared/types';
import {
  BTN_ID,
  closePanel,
  installPanelAutoClose,
  mountFiltersButton,
  openPanel,
  PANEL_ID,
  syncButtonBadge,
  syncPanelInputs,
} from './inline-ui';
import { watchForCards } from './observer';
import {
  applySearchFiltersToUrl,
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
const UPLOAD_DATE_FALLBACK_URL_KEY = 'yz-upload-date-fallback-url';
const SEARCH_INPUT_SELECTOR = 'input[name="search_query"]';
const SEARCH_BUTTON_SELECTOR = [
  'button.ytSearchboxComponentSearchButton',
  '#search-icon-legacy',
].join(', ');

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
    settings.shorts ||
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

export function applyUploadDateChangeToCurrentSearch(
  filters: SearchFilters,
  assign: (url: string) => void = (url) => window.location.assign(url)
): void {
  const url = new URL(window.location.href);
  const next = applySearchFiltersToUrl(url, filters);
  if (next.toString() === url.toString()) return;
  assign(next.toString());
}

export function applyActiveUploadDateToCurrentSearch(
  settings: ZenSettings,
  assign: (url: string) => void = (url) => window.location.assign(url)
): void {
  if (settings.filterSearchUploadDate === 'any') return;
  const filters: SearchFilters = {
    uploadDate: settings.filterSearchUploadDate,
    duration: settings.filterSearchDuration,
    sort: settings.filterSearchSort,
    type: settings.filterSearchType,
  };
  const url = new URL(window.location.href);
  const next = applySearchFiltersToUrl(url, filters);
  const nextUrl = next.toString();
  if (nextUrl === url.toString()) return;
  if (window.sessionStorage.getItem(UPLOAD_DATE_FALLBACK_URL_KEY) === nextUrl) {
    return;
  }
  window.sessionStorage.setItem(UPLOAD_DATE_FALLBACK_URL_KEY, nextUrl);
  assign(nextUrl);
}

export function handleSearchFormSubmit(
  event: SubmitEvent,
  filters: SearchFilters,
  assign: (url: string) => void = (url) => window.location.assign(url)
): void {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  const input = form.querySelector<HTMLInputElement>(SEARCH_INPUT_SELECTOR);
  interceptSearchIntent(event, input, filters, assign);
}

export function handleSearchInputKeydown(
  event: KeyboardEvent,
  filters: SearchFilters,
  assign: (url: string) => void = (url) => window.location.assign(url)
): void {
  if (event.key !== 'Enter' || event.isComposing) return;
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (!target.matches(SEARCH_INPUT_SELECTOR)) return;
  interceptSearchIntent(event, target, filters, assign);
}

export function handleSearchButtonClick(
  event: MouseEvent,
  filters: SearchFilters,
  assign: (url: string) => void = (url) => window.location.assign(url)
): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest(SEARCH_BUTTON_SELECTOR);
  if (!button) return;

  const input =
    button
      .closest('form')
      ?.querySelector<HTMLInputElement>(SEARCH_INPUT_SELECTOR) ??
    document.querySelector<HTMLInputElement>(SEARCH_INPUT_SELECTOR);
  interceptSearchIntent(event, input, filters, assign);
}

function interceptSearchIntent(
  event: Event,
  input: HTMLInputElement | null | undefined,
  filters: SearchFilters,
  assign: (url: string) => void
): void {
  if (filters.uploadDate === 'any') return;
  const query = input?.value.trim();
  if (!query) return;

  const url = new URL('/results', window.location.origin);
  url.searchParams.set('search_query', query);
  const next = applySearchFiltersToUrl(url, filters);
  event.preventDefault();
  event.stopImmediatePropagation();
  assign(next.toString());
}

function installSearchIntentInterceptor(): void {
  document.addEventListener(
    'submit',
    (event) => {
      handleSearchFormSubmit(event as SubmitEvent, currentFilters());
    },
    true
  );
  document.addEventListener(
    'keydown',
    (event) => {
      handleSearchInputKeydown(event, currentFilters());
    },
    true
  );
  document.addEventListener(
    'click',
    (event) => {
      handleSearchButtonClick(event, currentFilters());
    },
    true
  );
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
  installPanelAutoClose(btn);

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
  installSearchIntentInterceptor();

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
    applyActiveUploadDateToCurrentSearch(current);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;

    const relevant: (keyof ZenSettings)[] = [
      'shorts',
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
    const uploadDateChanged = 'filterSearchUploadDate' in changes;
    applySettings(next);
    if (uploadDateChanged) applyUploadDateChangeToCurrentSearch(currentFilters());
  });
}
