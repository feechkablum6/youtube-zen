import { describe, expect, it } from 'vitest';

import { buildCss } from '../src/content/css-injector';
import { DEFAULT_SETTINGS } from '../src/shared/defaults';
import type { ZenSettings } from '../src/shared/types';

const ALL_OFF: ZenSettings = {
  ...DEFAULT_SETTINGS,
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
  fixUblock: false,
  actionPanel: false,
};

describe('buildCss', () => {
  it('returns empty string when extension is disabled', () => {
    const settings: ZenSettings = { ...DEFAULT_SETTINGS, enabled: false };
    expect(buildCss(settings)).toBe('');
  });

  it('returns empty string when all toggles are off', () => {
    expect(buildCss(ALL_OFF)).toBe('');
  });

  it('includes the yz-vanish @keyframes definition', () => {
    const settings = { ...ALL_OFF, shorts: true };
    const css = buildCss(settings);
    expect(css).toContain('@keyframes yz-vanish');
  });

  it('applies the yz-vanish animation to matching selectors', () => {
    const settings = { ...ALL_OFF, shorts: true };
    const css = buildCss(settings);
    expect(css).toContain('ytd-reel-shelf-renderer');
    expect(css).toMatch(/animation:\s*yz-vanish/);
  });

  it('provides an instant-hide override for .yz-initial first load', () => {
    const settings = { ...ALL_OFF, shorts: true };
    const css = buildCss(settings);
    expect(css).toContain('html.yz-initial');
    // Override should shorten the animation to effectively zero
    expect(css).toMatch(/animation-duration:\s*0s/);
  });

  it('does not include selectors for disabled toggles', () => {
    const settings: ZenSettings = {
      ...ALL_OFF,
      shorts: true,
      footer: true,
    };

    const css = buildCss(settings);
    expect(css).toContain('ytd-reel-shelf-renderer');
    expect(css).toContain('#footer');
    expect(css).not.toContain('playlist');
  });

  it('collapses hidden elements to zero height at the end of animation', () => {
    const settings = { ...ALL_OFF, shorts: true };
    const css = buildCss(settings);
    // Final keyframe should zero out box size so the element does not
    // occupy layout space after vanishing.
    expect(css).toMatch(/max-height:\s*0/);
  });

  it('uses a mask gradient so the element disintegrates on the spot', () => {
    const settings = { ...ALL_OFF, shorts: true };
    const css = buildCss(settings);
    // Ash-particle illusion: a linear-gradient mask sweeping bottom-to-top
    // dissolves the element while it stays in place.
    expect(css).toContain('mask-image');
    expect(css).toMatch(/linear-gradient/);
  });

  it('does not translate, scale, or rotate the element away', () => {
    const settings = { ...ALL_OFF, shorts: true };
    const css = buildCss(settings);
    // Element must disintegrate where it stands — no fly-out.
    expect(css).not.toMatch(/transform:\s*[^;]*(?:scale|translate|rotate)/);
  });

  it('generates a non-empty ruleset with all toggles enabled', () => {
    const css = buildCss(DEFAULT_SETTINGS);
    expect(css).toContain('@keyframes yz-vanish');
    expect(css).toContain('animation:');
    expect(css.length).toBeGreaterThan(100);
  });
});

describe('buildCss — watched filter', () => {
  it('includes yz-watched rule when filterWatchedEnabled', () => {
    const settings: ZenSettings = {
      ...ALL_OFF,
      filterWatchedEnabled: true,
    };
    const css = buildCss(settings);
    expect(css).toContain('html.yz-watched-filter-on .yz-watched');
    expect(css).toContain('animation: yz-vanish');
  });

  it('omits yz-watched rule when filter disabled', () => {
    const settings: ZenSettings = {
      ...ALL_OFF,
      filterWatchedEnabled: false,
    };
    expect(buildCss(settings)).not.toContain('yz-watched-filter-on');
  });

  it('emits css even when all cleaner toggles are off but watched filter is on', () => {
    const settings: ZenSettings = {
      ...ALL_OFF,
      filterWatchedEnabled: true,
    };
    expect(buildCss(settings)).not.toBe('');
  });

  it('includes prefers-reduced-motion variant', () => {
    const settings: ZenSettings = {
      ...ALL_OFF,
      filterWatchedEnabled: true,
    };
    expect(buildCss(settings)).toContain('prefers-reduced-motion');
  });
});

describe('buildCss — chip styles (bundled with watched filter)', () => {
  it('includes chip styles when filter enabled', () => {
    const settings: ZenSettings = { ...ALL_OFF, filterWatchedEnabled: true };
    const css = buildCss(settings);
    expect(css).toContain('#yz-chip-watched');
    expect(css).toContain('[data-active="true"]');
  });

  it('excludes chip styles when filter disabled', () => {
    const settings: ZenSettings = { ...ALL_OFF, filterWatchedEnabled: false };
    expect(buildCss(settings)).not.toContain('#yz-chip-watched');
  });
});
