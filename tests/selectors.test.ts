import { describe, expect, it } from 'vitest';

import { HIDE_RULES } from '../src/content/selectors';
import type { HideRule, ToggleKey } from '../src/shared/types';

describe('HIDE_RULES', () => {
  const expectedKeys: ToggleKey[] = [
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

  it('has an entry for every ToggleKey', () => {
    for (const key of expectedKeys) {
      expect(HIDE_RULES).toHaveProperty(key);
    }
  });

  it('has no extra keys beyond ToggleKey', () => {
    expect(Object.keys(HIDE_RULES).sort()).toEqual([...expectedKeys].sort());
  });

  it('every rule has non-empty selectors array', () => {
    for (const [key, rule] of Object.entries(HIDE_RULES)) {
      expect(rule.selectors.length, `${key} has empty selectors`).toBeGreaterThan(0);
    }
  });

  it('every rule has a non-empty label', () => {
    for (const [key, rule] of Object.entries(HIDE_RULES)) {
      expect(rule.label.length, `${key} has empty label`).toBeGreaterThan(0);
    }
  });

  it('every rule has a valid group', () => {
    const validGroups = ['feed', 'sidebar', 'video', 'footer'];
    for (const [key, rule] of Object.entries(HIDE_RULES)) {
      expect(validGroups, `${key} has invalid group "${rule.group}"`).toContain(rule.group);
    }
  });

  it('every selector is a non-empty string', () => {
    for (const [key, rule] of Object.entries(HIDE_RULES)) {
      for (const selector of rule.selectors) {
        expect(typeof selector).toBe('string');
        expect(selector.length, `${key} has empty selector`).toBeGreaterThan(0);
      }
    }
  });
});
