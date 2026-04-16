import { describe, expect, it } from 'vitest';

import { isLikelyUblockEmpty } from '../src/content/ublock-cleaner';

describe('isLikelyUblockEmpty', () => {
  it('returns false when thumbnail is present (normal loaded video)', () => {
    expect(
      isLikelyUblockEmpty({ height: 315, hasThumbnail: true, ageMs: 5000 })
    ).toBe(false);
  });

  it('returns false when cell is too small (collapsed / hidden already)', () => {
    expect(
      isLikelyUblockEmpty({ height: 20, hasThumbnail: false, ageMs: 5000 })
    ).toBe(false);
  });

  it('returns false when cell is still young (lazy-load window)', () => {
    expect(
      isLikelyUblockEmpty({ height: 315, hasThumbnail: false, ageMs: 500 })
    ).toBe(false);
  });

  it('returns true when visible cell has no thumbnail past the grace period', () => {
    expect(
      isLikelyUblockEmpty({ height: 315, hasThumbnail: false, ageMs: 1500 })
    ).toBe(true);
  });

  it('returns true for a wide tile without thumbnail (rich-section-renderer ad)', () => {
    expect(
      isLikelyUblockEmpty({ height: 200, hasThumbnail: false, ageMs: 2000 })
    ).toBe(true);
  });

  it('uses the exact threshold boundary (>= 1500ms triggers)', () => {
    expect(isLikelyUblockEmpty({ height: 300, hasThumbnail: false, ageMs: 1499 })).toBe(false);
    expect(isLikelyUblockEmpty({ height: 300, hasThumbnail: false, ageMs: 1500 })).toBe(true);
  });

  it('still returns false when both small and no thumbnail (collapsed)', () => {
    expect(isLikelyUblockEmpty({ height: 10, hasThumbnail: false, ageMs: 10000 })).toBe(false);
  });
});
