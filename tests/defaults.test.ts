import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../src/shared/defaults';
import type { ZenSettings } from '../src/shared/types';

const ALL_KEYS: (keyof ZenSettings)[] = [
  'enabled',
  'shorts',
  'playlists',
  'liked',
  'yourVideos',
  'downloads',
  'subscriptions',
  'navigator',
  'explore',
  'reportButton',
  'footer',
  'fixUblock',
  'actionPanel',
  'activeSection',
  'filterWatchedEnabled',
  'filterWatchedThreshold',
];

const OFF_BY_DEFAULT: (keyof ZenSettings)[] = ['filterWatchedEnabled'];

describe('DEFAULT_SETTINGS', () => {
  it('has all ZenSettings keys', () => {
    for (const key of ALL_KEYS) {
      expect(DEFAULT_SETTINGS).toHaveProperty(key);
    }
  });

  it('all boolean toggle keys default to true (except filter opt-ins)', () => {
    for (const key of ALL_KEYS) {
      if (OFF_BY_DEFAULT.includes(key)) continue;
      const value = DEFAULT_SETTINGS[key];
      if (typeof value === 'boolean') {
        expect(value).toBe(true);
      }
    }
  });

  it('has watched filter disabled by default', () => {
    expect(DEFAULT_SETTINGS.filterWatchedEnabled).toBe(false);
  });

  it('has watched threshold default of 20', () => {
    expect(DEFAULT_SETTINGS.filterWatchedThreshold).toBe(20);
  });

  it('has no extra keys beyond ZenSettings', () => {
    expect(Object.keys(DEFAULT_SETTINGS).sort()).toEqual([...ALL_KEYS].sort());
  });
});

describe('DEFAULT_SETTINGS.activeSection', () => {
  it("defaults to 'cleaner'", () => {
    expect(DEFAULT_SETTINGS.activeSection).toBe('cleaner');
  });

  it('is a string', () => {
    expect(typeof DEFAULT_SETTINGS.activeSection).toBe('string');
  });
});
