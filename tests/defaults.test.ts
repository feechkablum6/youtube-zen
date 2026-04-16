import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../src/shared/defaults';
import type { ZenSettings } from '../src/shared/types';

describe('DEFAULT_SETTINGS', () => {
  it('has all ZenSettings keys', () => {
    const keys: (keyof ZenSettings)[] = [
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
    ];

    for (const key of keys) {
      expect(DEFAULT_SETTINGS).toHaveProperty(key);
    }
  });

  it('has all values set to true by default', () => {
    for (const value of Object.values(DEFAULT_SETTINGS)) {
      expect(value).toBe(true);
    }
  });

  it('has no extra keys beyond ZenSettings', () => {
    const expectedKeys: (keyof ZenSettings)[] = [
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
    ];

    expect(Object.keys(DEFAULT_SETTINGS).sort()).toEqual(expectedKeys.sort());
  });
});
