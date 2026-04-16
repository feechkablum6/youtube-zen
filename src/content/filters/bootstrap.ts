import { DEFAULT_SETTINGS } from '../../shared/defaults';
import type { ZenSettings } from '../../shared/types';
import { compactAllGridRows } from './compact-grid';
import {
  applyChipVisibility,
  CHIP_ID,
  mountChip,
  syncChipState,
} from './inline-ui';
import { watchForCards } from './observer';
import { applyWatchedClass, CARD_SELECTORS } from './watched';

const FILTER_ON_CLASS = 'yz-watched-filter-on';
const COMPACT_DEBOUNCE_MS = 80;

function currentPath(): string {
  return location.pathname || '/';
}

export function scanAll(root: ParentNode, threshold: number): void {
  const cards = root.querySelectorAll(CARD_SELECTORS.join(','));
  cards.forEach((card) => applyWatchedClass(card, threshold));
}

// Compacting touches many DOM nodes; debounce calls triggered from
// observer mutations so rapid card-injection bursts collapse into a
// single pass.
let compactTimer: number | null = null;
function requestCompact(): void {
  if (compactTimer !== null) return;
  compactTimer = window.setTimeout(() => {
    compactTimer = null;
    compactAllGridRows(document);
  }, COMPACT_DEBOUNCE_MS);
}

let currentThreshold = DEFAULT_SETTINGS.filterWatchedThreshold;
let currentEnabled = DEFAULT_SETTINGS.filterWatchedEnabled;
let observerDispose: (() => void) | null = null;

function syncHtmlClass(enabled: boolean): void {
  document.documentElement.classList.toggle(FILTER_ON_CLASS, enabled);
}

function onCardAdded(card: Element): void {
  applyWatchedClass(card, currentThreshold);
  requestCompact();
}

type WatchedPatch = Pick<
  ZenSettings,
  'filterWatchedEnabled' | 'filterWatchedThreshold'
>;

const enabledListeners: Array<(enabled: boolean) => void> = [];

export function onEnabledChange(hook: (enabled: boolean) => void): void {
  enabledListeners.push(hook);
  hook(currentEnabled);
}

export function getCurrentEnabled(): boolean {
  return currentEnabled;
}

function applySettings(settings: WatchedPatch): void {
  currentEnabled = settings.filterWatchedEnabled;
  currentThreshold = settings.filterWatchedThreshold;
  syncHtmlClass(currentEnabled);
  scanAll(document, currentThreshold);
  compactAllGridRows(document);
  const chip = document.getElementById(CHIP_ID);
  if (chip) syncChipState(chip, currentEnabled);
  for (const hook of enabledListeners) hook(currentEnabled);
}

function wireChip(chip: HTMLButtonElement): void {
  applyChipVisibility(chip, currentPath());
  syncChipState(chip, currentEnabled);
  chip.addEventListener('click', () => {
    chrome.storage.sync.set({ filterWatchedEnabled: !currentEnabled });
  });
}

function tryMountChip(): boolean {
  const chip = mountChip();
  if (!chip) return false;
  wireChip(chip);
  return true;
}

export function initWatchedFilter(): void {
  chrome.storage.sync.get(
    {
      filterWatchedEnabled: DEFAULT_SETTINGS.filterWatchedEnabled,
      filterWatchedThreshold: DEFAULT_SETTINGS.filterWatchedThreshold,
    },
    (stored) => {
      applySettings(stored as WatchedPatch);
    }
  );

  observerDispose ??= watchForCards(
    document.documentElement,
    CARD_SELECTORS,
    onCardAdded
  );

  if (!tryMountChip()) {
    // Masthead may render after the content script initialises.
    const mountObserver = new MutationObserver(() => {
      if (tryMountChip()) mountObserver.disconnect();
    });
    mountObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  window.addEventListener('yt-navigate-finish', () => {
    scanAll(document, currentThreshold);
    compactAllGridRows(document);
    const chip = document.getElementById(CHIP_ID);
    if (chip) applyChipVisibility(chip, currentPath());
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const hasEnabled = 'filterWatchedEnabled' in changes;
    const hasThreshold = 'filterWatchedThreshold' in changes;
    if (!hasEnabled && !hasThreshold) return;
    applySettings({
      filterWatchedEnabled: hasEnabled
        ? (changes.filterWatchedEnabled!.newValue as boolean)
        : currentEnabled,
      filterWatchedThreshold: hasThreshold
        ? (changes.filterWatchedThreshold!.newValue as number)
        : currentThreshold,
    });
  });
}
