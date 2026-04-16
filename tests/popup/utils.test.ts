import { describe, expect, it } from 'vitest';

import {
  countActiveRules,
  groupRulesByGroup,
  resolveActiveSection,
} from '../../src/popup/utils';
import { HIDE_RULES } from '../../src/content/selectors';
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

describe('groupRulesByGroup', () => {
  it('returns a Map keyed by group name', () => {
    const result = groupRulesByGroup(HIDE_RULES);
    expect(result).toBeInstanceOf(Map);
    expect(result.has('feed')).toBe(true);
    expect(result.has('sidebar')).toBe(true);
    expect(result.has('video')).toBe(true);
    expect(result.has('footer')).toBe(true);
  });

  it('places shorts and fixUblock into feed group', () => {
    const result = groupRulesByGroup(HIDE_RULES);
    const feed = result.get('feed')!;
    const keys = feed.map((e) => e.key);
    expect(keys).toContain('shorts');
    expect(keys).toContain('fixUblock');
  });

  it('places actionPanel into video group', () => {
    const result = groupRulesByGroup(HIDE_RULES);
    const video = result.get('video')!;
    expect(video.map((e) => e.key)).toEqual(['actionPanel']);
  });

  it('preserves insertion order of HIDE_RULES entries within each group', () => {
    const result = groupRulesByGroup(HIDE_RULES);
    const sidebar = result.get('sidebar')!;
    const keys = sidebar.map((e) => e.key);
    expect(keys).toEqual([
      'playlists', 'liked', 'yourVideos', 'downloads',
      'subscriptions', 'navigator', 'explore', 'reportButton',
    ]);
  });

  it('each entry includes key and label', () => {
    const result = groupRulesByGroup(HIDE_RULES);
    const feed = result.get('feed')!;
    const shorts = feed.find((e) => e.key === 'shorts');
    expect(shorts).toBeDefined();
    expect(shorts!.label).toBe('Shorts');
  });
});
