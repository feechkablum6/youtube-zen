import { describe, expect, it } from 'vitest';

import {
  encodeLengthDelimitedField,
  encodeSp,
  encodeVarint,
  encodeVarintField,
} from '../../src/content/filters/sp-encoder';
import type { SearchFilters } from '../../src/shared/types';

const ALL_DEFAULT: SearchFilters = {
  uploadDate: 'any',
  duration: 'any',
  sort: 'relevance',
  type: 'any',
};

describe('encodeVarint', () => {
  it.each([
    [0, [0x00]],
    [1, [0x01]],
    [2, [0x02]],
    [3, [0x03]],
    [5, [0x05]],
    [127, [0x7f]],
  ])('encodes %i as %j', (value, expected) => {
    expect(Array.from(encodeVarint(value))).toEqual(expected);
  });
});

describe('encodeVarintField', () => {
  it('field 1 value 2 → 08 02', () => {
    expect(Array.from(encodeVarintField(1, 2))).toEqual([0x08, 0x02]);
  });
  it('field 2 value 1 → 10 01', () => {
    expect(Array.from(encodeVarintField(2, 1))).toEqual([0x10, 0x01]);
  });
  it('field 3 value 1 → 18 01', () => {
    expect(Array.from(encodeVarintField(3, 1))).toEqual([0x18, 0x01]);
  });
});

describe('encodeLengthDelimitedField', () => {
  it('field 2 with single byte payload 0x08 → 12 01 08', () => {
    const payload = Uint8Array.from([0x08]);
    expect(Array.from(encodeLengthDelimitedField(2, payload))).toEqual([
      0x12, 0x01, 0x08,
    ]);
  });
  it('field 2 with two-byte payload 0x08 0x01 → 12 02 08 01', () => {
    const payload = Uint8Array.from([0x08, 0x01]);
    expect(Array.from(encodeLengthDelimitedField(2, payload))).toEqual([
      0x12, 0x02, 0x08, 0x01,
    ]);
  });
});

describe('encodeSp — all default', () => {
  it('returns null when every filter is default', () => {
    expect(encodeSp(ALL_DEFAULT)).toBeNull();
  });
});

describe('encodeSp — single-value reference strings', () => {
  it.each<[Partial<SearchFilters>, string]>([
    [{ sort: 'date' }, 'CAI%3D'],
    [{ uploadDate: 'hour' }, 'EgIIAQ%3D%3D'],
    [{ uploadDate: 'today' }, 'EgIIAg%3D%3D'],
    [{ uploadDate: 'week' }, 'EgIIAw%3D%3D'],
    [{ duration: 'short' }, 'EgIYAQ%3D%3D'],
    [{ type: 'video' }, 'EgIQAQ%3D%3D'],
  ])('%j → %s', (partial, expected) => {
    const filters: SearchFilters = { ...ALL_DEFAULT, ...partial };
    expect(encodeSp(filters)).toBe(expected);
  });
});
