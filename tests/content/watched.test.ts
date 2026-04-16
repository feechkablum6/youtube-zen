import { afterEach, describe, expect, it } from 'vitest';

import { parseProgressPercent } from '../../src/content/filters/watched';
import { searchCard } from './fixtures';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('parseProgressPercent', () => {
  it('returns null when card has no progress overlay', () => {
    const card = searchCard(null);
    expect(parseProgressPercent(card)).toBeNull();
  });

  it('returns null when progress element has no style', () => {
    const card = searchCard('missing-style');
    expect(parseProgressPercent(card)).toBeNull();
  });

  it('returns null when width is not a percent', () => {
    const card = searchCard('invalid');
    expect(parseProgressPercent(card)).toBeNull();
  });

  it('parses integer percent', () => {
    const card = searchCard(73);
    expect(parseProgressPercent(card)).toBe(73);
  });

  it('parses 0', () => {
    const card = searchCard(0);
    expect(parseProgressPercent(card)).toBe(0);
  });

  it('parses 100', () => {
    const card = searchCard(100);
    expect(parseProgressPercent(card)).toBe(100);
  });

  it('tolerates decimals', () => {
    const card = document.createElement('ytd-video-renderer');
    const overlay = document.createElement(
      'ytd-thumbnail-overlay-resume-playback-renderer'
    );
    const progress = document.createElement('div');
    progress.id = 'progress';
    progress.setAttribute('style', 'width: 42.5%');
    overlay.appendChild(progress);
    card.appendChild(overlay);
    expect(parseProgressPercent(card)).toBe(42.5);
  });
});
