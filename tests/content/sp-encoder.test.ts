import { describe, expect, it } from 'vitest';

import { encodeVarint } from '../../src/content/filters/sp-encoder';

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
