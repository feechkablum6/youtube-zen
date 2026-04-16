import { describe, expect, it } from 'vitest';

import { resolveActiveSection } from '../../src/popup/utils';

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
