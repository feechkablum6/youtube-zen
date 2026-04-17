import { describe, expect, it } from 'vitest';

import { rewriteIfNeeded } from '../../src/content/filters/search-url-rewriter';
import type { SearchFilters } from '../../src/shared/types';

const DEFAULT_FILTERS: SearchFilters = {
  uploadDate: 'any',
  duration: 'any',
  sort: 'relevance',
  type: 'any',
};

describe('rewriteIfNeeded', () => {
  it('returns same URL when pathname is not /results', () => {
    const url = new URL('https://www.youtube.com/feed/subscriptions');
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    expect(rewriteIfNeeded(url, filters).toString()).toBe(url.toString());
  });

  it('returns same URL when all filters are default', () => {
    const url = new URL('https://www.youtube.com/results?search_query=cats');
    expect(rewriteIfNeeded(url, DEFAULT_FILTERS).toString()).toBe(
      url.toString()
    );
  });

  it('returns same URL when sp= is already present', () => {
    const url = new URL(
      'https://www.youtube.com/results?search_query=cats&sp=CAI%3D'
    );
    const filters: SearchFilters = { ...DEFAULT_FILTERS, uploadDate: 'week' };
    expect(rewriteIfNeeded(url, filters).toString()).toBe(url.toString());
  });

  it('adds sp= to /results without sp= when filters are non-default', () => {
    const url = new URL('https://www.youtube.com/results?search_query=cats');
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    const next = rewriteIfNeeded(url, filters);
    expect(next.searchParams.get('sp')).toBe('CAI=');
    expect(next.searchParams.get('search_query')).toBe('cats');
  });

  it('returns a new URL instance, does not mutate input', () => {
    const url = new URL('https://www.youtube.com/results?search_query=x');
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    const next = rewriteIfNeeded(url, filters);
    expect(next).not.toBe(url);
    expect(url.searchParams.has('sp')).toBe(false);
  });
});
