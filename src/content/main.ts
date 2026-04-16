import { DEFAULT_SETTINGS } from '../shared/defaults';
import type { ZenSettings } from '../shared/types';

import { buildCss } from './css-injector';

const STYLE_ID = 'yt-zen-styles';

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
