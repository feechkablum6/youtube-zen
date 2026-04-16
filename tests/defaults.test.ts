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
];

describe('DEFAULT_SETTINGS', () => {
  it('has all ZenSettings keys', () => {
    for (const key of ALL_KEYS) {
      expect(DEFAULT_SETTINGS).toHaveProperty(key);
    }
  });

  it('all boolean toggle keys default to true', () => {
    for (const key of ALL_KEYS) {
      const value = DEFAULT_SETTINGS[key];
      if (typeof value === 'boolean') {
        expect(value).toBe(true);
      }
    }
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
