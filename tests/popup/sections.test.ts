import { describe, expect, it } from 'vitest';

import { SECTIONS } from '../../src/popup/sections';

describe('SECTIONS registry', () => {
  it('has exactly 5 sections', () => {
    expect(SECTIONS).toHaveLength(5);
  });

  it('contains all expected ids in order', () => {
    const ids = SECTIONS.map((s) => s.id);
    expect(ids).toEqual(['cleaner', 'filters', 'tools', 'themes', 'settings']);
  });

  it('settings section has position "bottom"', () => {
    const settings = SECTIONS.find((s) => s.id === 'settings');
    expect(settings?.position).toBe('bottom');
  });

  it('all non-settings sections have position "top"', () => {
    for (const s of SECTIONS.filter((x) => x.id !== 'settings')) {
      expect(s.position).toBe('top');
    }
  });

  it('every section has a non-empty label and icon', () => {
    for (const s of SECTIONS) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.icon.length).toBeGreaterThan(0);
    }
  });

  it('every section has a render function', () => {
    for (const s of SECTIONS) {
      expect(typeof s.render).toBe('function');
    }
  });

  it('ids are unique', () => {
    const ids = SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('filters section is no longer a stub', async () => {
    const { renderFilters } = await import('../../src/popup/sections/filters');
    const filters = SECTIONS.find((s) => s.id === 'filters');
    expect(filters?.render).toBe(renderFilters);
  });
});
