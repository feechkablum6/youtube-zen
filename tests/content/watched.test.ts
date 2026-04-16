import { afterEach, describe, expect, it } from 'vitest';

import { scanAll } from '../../src/content/filters/bootstrap';
import {
  applyWatchedClass,
  CARD_SELECTORS,
  parseProgressPercent,
  shouldHide,
} from '../../src/content/filters/watched';
import { homeCard, lockupCard, searchCard } from './fixtures';

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

describe('shouldHide', () => {
  it('returns false when card has no progress', () => {
    expect(shouldHide(searchCard(null), 20)).toBe(false);
  });

  it('returns false when progress < threshold', () => {
    expect(shouldHide(searchCard(19), 20)).toBe(false);
  });

  it('returns true when progress === threshold', () => {
    expect(shouldHide(searchCard(20), 20)).toBe(true);
  });

  it('returns true when progress > threshold', () => {
    expect(shouldHide(searchCard(80), 20)).toBe(true);
  });

  it('threshold=0 hides any started video', () => {
    expect(shouldHide(searchCard(0), 0)).toBe(true);
    expect(shouldHide(searchCard(null), 0)).toBe(false);
  });

  it('threshold=100 hides only fully watched', () => {
    expect(shouldHide(searchCard(99), 100)).toBe(false);
    expect(shouldHide(searchCard(100), 100)).toBe(true);
  });
});

describe('applyWatchedClass', () => {
  it('adds yz-watched class when shouldHide is true', () => {
    const card = searchCard(50);
    applyWatchedClass(card, 20);
    expect(card.classList.contains('yz-watched')).toBe(true);
  });

  it('removes yz-watched class when shouldHide is false', () => {
    const card = searchCard(10);
    card.classList.add('yz-watched');
    applyWatchedClass(card, 20);
    expect(card.classList.contains('yz-watched')).toBe(false);
  });

  it('is idempotent', () => {
    const card = searchCard(50);
    applyWatchedClass(card, 20);
    applyWatchedClass(card, 20);
    expect(card.classList.contains('yz-watched')).toBe(true);
  });
});

describe('CARD_SELECTORS', () => {
  it('includes all three card types', () => {
    expect(CARD_SELECTORS).toEqual([
      'ytd-rich-item-renderer',
      'ytd-video-renderer',
      'yt-lockup-view-model',
    ]);
  });

  it('matches a home card', () => {
    const card = homeCard();
    document.body.appendChild(card);
    const found = document.querySelector(CARD_SELECTORS.join(','));
    expect(found).toBe(card);
  });

  it('matches a lockup card', () => {
    const card = lockupCard();
    document.body.appendChild(card);
    const found = document.querySelector(CARD_SELECTORS.join(','));
    expect(found).toBe(card);
  });
});

describe('scanAll', () => {
  it('applies yz-watched to cards that exceed threshold', () => {
    const c1 = searchCard(50);
    const c2 = searchCard(10);
    const c3 = searchCard(null);
    document.body.appendChild(c1);
    document.body.appendChild(c2);
    document.body.appendChild(c3);
    scanAll(document.body, 20);
    expect(c1.classList.contains('yz-watched')).toBe(true);
    expect(c2.classList.contains('yz-watched')).toBe(false);
    expect(c3.classList.contains('yz-watched')).toBe(false);
  });

  it('re-scan updates classes when threshold changes', () => {
    const card = searchCard(15);
    document.body.appendChild(card);
    scanAll(document.body, 20);
    expect(card.classList.contains('yz-watched')).toBe(false);
    scanAll(document.body, 10);
    expect(card.classList.contains('yz-watched')).toBe(true);
  });

  it('scopes id="progress" to its own card (two-step lookup)', () => {
    // Regression: a compound descendant selector with duplicated ids can
    // match the first #progress in the document, not the one inside the
    // scoped card. Use cards with different widths to verify scoping.
    const a = searchCard(80);
    const b = searchCard(5);
    document.body.appendChild(a);
    document.body.appendChild(b);
    scanAll(document.body, 20);
    expect(a.classList.contains('yz-watched')).toBe(true);
    expect(b.classList.contains('yz-watched')).toBe(false);
  });
});
