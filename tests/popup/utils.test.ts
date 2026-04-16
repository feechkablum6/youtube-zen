import { describe, expect, it } from 'vitest';

import { countActiveRules, resolveActiveSection } from '../../src/popup/utils';
import { DEFAULT_SETTINGS } from '../../src/shared/defaults';
import type { ToggleKey } from '../../src/shared/types';

describe('resolveActiveSection', () => {
  const KNOWN_IDS = ['cleaner', 'filters', 'tools', 'themes', 'settings'];

  it('returns the stored id when it is in the known list', () => {
    expect(resolveActiveSection('tools', KNOWN_IDS)).toBe('tools');
    expect(resolveActiveSection('cleaner', KNOWN_IDS)).toBe('cleaner');
  });

  it('returns the first known id when stored id is not in the list', () => {
    expect(resolveActiveSection('deprecated', KNOWN_IDS)).toBe('cleaner');
  });

  it('returns the first known id when stored id is empty string', () => {
    expect(resolveActiveSection('', KNOWN_IDS)).toBe('cleaner');
  });

  it('returns empty string when known list is empty (defensive)', () => {
    expect(resolveActiveSection('anything', [])).toBe('');
  });
});

describe('countActiveRules', () => {
  const ALL_CLEANER_KEYS: ToggleKey[] = [
    'shorts', 'playlists', 'liked', 'yourVideos', 'downloads',
    'subscriptions', 'navigator', 'explore', 'reportButton', 'footer',
    'fixUblock', 'actionPanel',
  ];

  it('counts all rules active when all defaults are true', () => {
    const result = countActiveRules(DEFAULT_SETTINGS, ALL_CLEANER_KEYS);
    expect(result).toEqual({ active: 12, total: 12 });
  });

  it('counts zero when all toggles are off', () => {
    const off = { ...DEFAULT_SETTINGS };
    for (const k of ALL_CLEANER_KEYS) off[k] = false;
    const result = countActiveRules(off, ALL_CLEANER_KEYS);
    expect(result).toEqual({ active: 0, total: 12 });
  });

  it('counts a partial subset correctly', () => {
    const partial = { ...DEFAULT_SETTINGS, shorts: false, playlists: false };
    const result = countActiveRules(partial, ALL_CLEANER_KEYS);
    expect(result).toEqual({ active: 10, total: 12 });
  });

  it('handles empty key list', () => {
    expect(countActiveRules(DEFAULT_SETTINGS, [])).toEqual({ active: 0, total: 0 });
  });
});
