import { describe, expect, it } from 'vitest';

import { buildCss } from '../src/content/css-injector';
import { DEFAULT_SETTINGS } from '../src/shared/defaults';
import type { ZenSettings } from '../src/shared/types';

describe('buildCss', () => {
  it('returns empty string when extension is disabled', () => {
    const settings: ZenSettings = { ...DEFAULT_SETTINGS, enabled: false };
    expect(buildCss(settings)).toBe('');
  });

  it('returns empty string when all toggles are off', () => {
    const settings: ZenSettings = {
      enabled: true,
      shorts: false,
      playlists: false,
      liked: false,
      yourVideos: false,
      downloads: false,
      subscriptions: false,
      navigator: false,
      explore: false,
      reportButton: false,
      footer: false,
    };
    expect(buildCss(settings)).toBe('');
  });

  it('generates display:none rules for enabled toggles', () => {
    const settings: ZenSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      shorts: true,
      playlists: false,
      liked: false,
      yourVideos: false,
      downloads: false,
      subscriptions: false,
      navigator: false,
      explore: false,
      reportButton: false,
      footer: false,
    };

    const css = buildCss(settings);
    expect(css).toContain('display: none !important');
    expect(css).toContain('ytd-reel-shelf-renderer');
  });

  it('does not include selectors for disabled toggles', () => {
    const settings: ZenSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      shorts: true,
      playlists: false,
      liked: false,
      yourVideos: false,
      downloads: false,
      subscriptions: false,
      navigator: false,
      explore: false,
      reportButton: false,
      footer: true,
    };

    const css = buildCss(settings);
    expect(css).toContain('ytd-reel-shelf-renderer');
    expect(css).toContain('#footer');
    expect(css).not.toContain('playlist');
  });

  it('generates valid CSS with all toggles enabled', () => {
    const css = buildCss(DEFAULT_SETTINGS);
    expect(css).toContain('display: none !important');
    expect(css.length).toBeGreaterThan(50);
  });
});
