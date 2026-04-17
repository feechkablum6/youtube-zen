import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  installNavListener,
  rewriteIfNeeded,
} from '../../src/content/filters/search-url-rewriter';
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

describe('installNavListener', () => {
  let replaceSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    replaceSpy = vi.spyOn(window.history, 'replaceState');
  });

  afterEach(() => {
    replaceSpy.mockRestore();
  });

  it('does nothing on yt-navigate-start when filters are default', () => {
    const dispose = installNavListener(() => DEFAULT_FILTERS);
    window.history.replaceState({}, '', '/results?search_query=a');
    replaceSpy.mockClear();
    window.dispatchEvent(new Event('yt-navigate-start'));
    expect(replaceSpy).not.toHaveBeenCalled();
    dispose();
  });

  it('replaces URL with sp= when filters non-default on /results without sp', () => {
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    const dispose = installNavListener(() => filters);
    window.history.replaceState({}, '', '/results?search_query=a');
    replaceSpy.mockClear();
    window.dispatchEvent(new Event('yt-navigate-start'));
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    const args = replaceSpy.mock.calls[0]!;
    const newUrl = String(args[2]);
    expect(newUrl).toContain('sp=');
    expect(newUrl).toContain('search_query=a');
    dispose();
  });

  it('dispose removes listener', () => {
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    const dispose = installNavListener(() => filters);
    dispose();
    window.history.replaceState({}, '', '/results?search_query=a');
    replaceSpy.mockClear();
    window.dispatchEvent(new Event('yt-navigate-start'));
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('ignores non-results paths', () => {
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    const dispose = installNavListener(() => filters);
    window.history.replaceState({}, '', '/feed/subscriptions');
    replaceSpy.mockClear();
    window.dispatchEvent(new Event('yt-navigate-start'));
    expect(replaceSpy).not.toHaveBeenCalled();
    dispose();
  });
});
