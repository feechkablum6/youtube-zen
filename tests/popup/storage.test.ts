import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '../../src/shared/defaults';
import { getSettings, setSetting, subscribeSettings } from '../../src/popup/storage';

type StorageListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string
) => void;

// Minimal chrome.storage.sync mock
function installChromeMock() {
  const storage: Record<string, unknown> = {};
  const listeners: StorageListener[] = [];

  (globalThis as unknown as { chrome: typeof chrome }).chrome = {
    storage: {
      sync: {
        get: vi.fn((defaults: Record<string, unknown>, cb: (v: Record<string, unknown>) => void) => {
          const merged = { ...defaults, ...storage };
          cb(merged);
        }),
        set: vi.fn((items: Record<string, unknown>, cb?: () => void) => {
          const changes: Record<string, chrome.storage.StorageChange> = {};
          for (const [k, v] of Object.entries(items)) {
            changes[k] = { oldValue: storage[k], newValue: v };
            storage[k] = v;
          }
          listeners.forEach((l) => l(changes, 'sync'));
          cb?.();
        }),
      },
      onChanged: {
        addListener: vi.fn((l: StorageListener) => listeners.push(l)),
        removeListener: vi.fn((l: StorageListener) => {
          const i = listeners.indexOf(l);
          if (i >= 0) listeners.splice(i, 1);
        }),
      },
    },
  } as unknown as typeof chrome;

  return { storage, listeners };
}

describe('storage.ts', () => {
  beforeEach(() => {
    installChromeMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSettings', () => {
    it('returns DEFAULT_SETTINGS when storage is empty', async () => {
      const settings = await getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('merges stored values over defaults', async () => {
      await setSetting('shorts', false);
      const settings = await getSettings();
      expect(settings.shorts).toBe(false);
      expect(settings.enabled).toBe(true);
    });
  });

  describe('setSetting', () => {
    it('writes a single key to chrome.storage.sync', async () => {
      await setSetting('activeSection', 'tools');
      const settings = await getSettings();
      expect(settings.activeSection).toBe('tools');
    });
  });

  describe('subscribeSettings', () => {
    it('fires the listener when a tracked key changes', async () => {
      const listener = vi.fn();
      subscribeSettings(listener);

      await setSetting('enabled', false);

      expect(listener).toHaveBeenCalledTimes(1);
      const call = listener.mock.calls[0][0] as Record<string, unknown>;
      expect(call).toHaveProperty('enabled');
    });

    it('returns an unsubscribe function', async () => {
      const listener = vi.fn();
      const unsubscribe = subscribeSettings(listener);

      unsubscribe();
      await setSetting('enabled', false);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
