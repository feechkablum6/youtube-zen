import { DEFAULT_SETTINGS } from '../shared/defaults';
import type { ZenSettings } from '../shared/types';

import { buildCss } from './css-injector';

const STYLE_ID = 'yt-zen-styles';
const INITIAL_CLASS = 'yz-initial';
const INITIAL_DURATION_MS = 800;

function applyStyles(css: string): void {
  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

  if (!css) {
    styleEl?.remove();
    return;
  }

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    (document.head ?? document.documentElement).appendChild(styleEl);
  }

  styleEl.textContent = css;
}

const DEFAULT_SETTINGS_RECORD = DEFAULT_SETTINGS as unknown as Record<string, unknown>;

function getSettings(callback: (settings: ZenSettings) => void): void {
  chrome.storage.sync.get(DEFAULT_SETTINGS_RECORD, (stored) => {
    callback(stored as unknown as ZenSettings);
  });
}

function init(): void {
  // Mark the first paint so css-injector's `.yz-initial` override fires
  // instant-hide (no fade) while the page loads. We drop the class after
  // a short delay so subsequent toggle flips animate normally.
  document.documentElement.classList.add(INITIAL_CLASS);
  window.setTimeout(() => {
    document.documentElement.classList.remove(INITIAL_CLASS);
  }, INITIAL_DURATION_MS);

  getSettings((settings) => {
    applyStyles(buildCss(settings));
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;

    getSettings((settings) => {
      applyStyles(buildCss(settings));
    });
  });

  // SPA navigation observer: YouTube replaces page content without
  // full reload. Watch for our style tag being removed.
  const observer = new MutationObserver(() => {
    if (!document.getElementById(STYLE_ID)) {
      getSettings((settings) => {
        const css = buildCss(settings);
        if (css) applyStyles(css);
      });
    }
  });

  // Wait for head/body to exist (run_at: document_start)
  if (document.head) {
    observer.observe(document.head, { childList: true });
  } else {
    const headObserver = new MutationObserver(() => {
      if (document.head) {
        headObserver.disconnect();
        observer.observe(document.head, { childList: true });
      }
    });
    headObserver.observe(document.documentElement, { childList: true });
  }
}

init();
