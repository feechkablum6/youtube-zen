import { beforeEach, describe, expect, it } from 'vitest';

import {
  applyActiveUploadDateToCurrentSearch,
  applyUploadDateChangeToCurrentSearch,
} from '../../src/content/filters/bootstrap';
import { DEFAULT_SETTINGS } from '../../src/shared/defaults';
import type { SearchFilters } from '../../src/shared/types';

const DEFAULT_FILTERS: SearchFilters = {
  uploadDate: 'any',
  duration: 'any',
  sort: 'relevance',
  type: 'any',
};

describe('applyUploadDateChangeToCurrentSearch', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    window.sessionStorage.clear();
  });

  it('assigns current /results page to URL with upload date sp', () => {
    window.history.replaceState({}, '', '/results?search_query=cats');
    const assigned: string[] = [];

    applyUploadDateChangeToCurrentSearch(
      { ...DEFAULT_FILTERS, uploadDate: 'week' },
      (url) => assigned.push(url)
    );

    expect(assigned).toHaveLength(1);
    const next = new URL(assigned[0]);
    expect(next.pathname).toBe('/results');
    expect(next.searchParams.get('search_query')).toBe('cats');
    expect(next.searchParams.get('sp')).toBe('EgIIAw==');
  });

  it('does not assign outside /results', () => {
    window.history.replaceState({}, '', '/watch?v=abc');
    const assigned: string[] = [];

    applyUploadDateChangeToCurrentSearch(
      { ...DEFAULT_FILTERS, uploadDate: 'week' },
      (url) => assigned.push(url)
    );

    expect(assigned).toEqual([]);
  });
});

describe('applyActiveUploadDateToCurrentSearch', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    window.sessionStorage.clear();
  });

  it('assigns /results to URL with sp when saved upload date is active', () => {
    window.history.replaceState({}, '', '/results?search_query=cats');
    const assigned: string[] = [];

    applyActiveUploadDateToCurrentSearch(
      { ...DEFAULT_SETTINGS, filterSearchUploadDate: 'today' },
      (url) => assigned.push(url)
    );

    expect(assigned).toHaveLength(1);
    const next = new URL(assigned[0]);
    expect(next.searchParams.get('sp')).toBe('EgIIAg==');
  });

  it('does not assign on /results when saved upload date is any', () => {
    window.history.replaceState({}, '', '/results?search_query=cats');
    const assigned: string[] = [];

    applyActiveUploadDateToCurrentSearch(DEFAULT_SETTINGS, (url) =>
      assigned.push(url)
    );

    expect(assigned).toEqual([]);
  });

  it('does not repeatedly assign the same fallback URL', () => {
    window.history.replaceState({}, '', '/results?search_query=cats');
    const assigned: string[] = [];
    const settings = { ...DEFAULT_SETTINGS, filterSearchUploadDate: 'today' };

    applyActiveUploadDateToCurrentSearch(settings, (url) => assigned.push(url));
    applyActiveUploadDateToCurrentSearch(settings, (url) => assigned.push(url));

    expect(assigned).toHaveLength(1);
  });

  it('allows a fallback assign for a different search query', () => {
    const assigned: string[] = [];
    const settings = { ...DEFAULT_SETTINGS, filterSearchUploadDate: 'today' };

    window.history.replaceState({}, '', '/results?search_query=cats');
    applyActiveUploadDateToCurrentSearch(settings, (url) => assigned.push(url));

    window.history.replaceState({}, '', '/results?search_query=dogs');
    applyActiveUploadDateToCurrentSearch(settings, (url) => assigned.push(url));

    expect(assigned).toHaveLength(2);
  });
});
