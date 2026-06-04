import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applySearchFiltersToUrl,
  applyOnLoad,
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

  it('returns same URL when sp= is already present and filters are default', () => {
    const url = new URL(
      'https://www.youtube.com/results?search_query=cats&sp=CAI%3D'
    );
    expect(rewriteIfNeeded(url, DEFAULT_FILTERS).toString()).toBe(
      url.toString()
    );
  });

  it('replaces existing sp= when filters are non-default', () => {
    const url = new URL(
      'https://www.youtube.com/results?search_query=cats&sp=CAI%3D'
    );
    const next = rewriteIfNeeded(url, {
      ...DEFAULT_FILTERS,
      uploadDate: 'week',
    });
    expect(next.searchParams.get('sp')).toBe('EgIIAw==');
    expect(next.searchParams.get('search_query')).toBe('cats');
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

describe('applySearchFiltersToUrl', () => {
  it('adds upload date sp= to /results', () => {
    const url = new URL('https://www.youtube.com/results?search_query=cats');
    const next = applySearchFiltersToUrl(url, {
      ...DEFAULT_FILTERS,
      uploadDate: 'week',
    });
    expect(next.searchParams.get('sp')).toBe('EgIIAw==');
    expect(next.searchParams.get('search_query')).toBe('cats');
  });

  it('replaces existing sp= when upload date changes', () => {
    const url = new URL(
      'https://www.youtube.com/results?search_query=cats&sp=EgIIAw%3D%3D'
    );
    const next = applySearchFiltersToUrl(url, {
      ...DEFAULT_FILTERS,
      uploadDate: 'month',
    });
    expect(next.searchParams.get('sp')).toBe('EgIIBA==');
    expect(next.searchParams.get('search_query')).toBe('cats');
  });

  it('removes sp= when upload date returns to any and no search filters are active', () => {
    const url = new URL(
      'https://www.youtube.com/results?search_query=cats&sp=EgIIAw%3D%3D'
    );
    const next = applySearchFiltersToUrl(url, DEFAULT_FILTERS);
    expect(next.searchParams.has('sp')).toBe(false);
    expect(next.searchParams.get('search_query')).toBe('cats');
  });

  it('does not change non-results URLs', () => {
    const url = new URL('https://www.youtube.com/feed/subscriptions?sp=old');
    const next = applySearchFiltersToUrl(url, {
      ...DEFAULT_FILTERS,
      uploadDate: 'week',
    });
    expect(next.toString()).toBe(url.toString());
  });

  it('does not mutate input URL', () => {
    const url = new URL('https://www.youtube.com/results?search_query=cats');
    applySearchFiltersToUrl(url, { ...DEFAULT_FILTERS, uploadDate: 'week' });
    expect(url.searchParams.has('sp')).toBe(false);
  });
});

describe('installNavListener', () => {
  function dispatchNavStart(detailUrl: string): CustomEvent {
    const detail: {
      url: string;
      endpoint?: {
        commandMetadata?: { webCommandMetadata?: { url?: string } };
      };
    } = {
      url: detailUrl,
      endpoint: {
        commandMetadata: { webCommandMetadata: { url: detailUrl } },
      },
    };
    const ev = new CustomEvent('yt-navigate-start', { detail });
    window.dispatchEvent(ev);
    return ev;
  }

  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('does nothing on yt-navigate-start when filters are default', () => {
    const dispose = installNavListener(() => DEFAULT_FILTERS);
    const ev = dispatchNavStart('/results?search_query=a');
    expect(ev.detail.url).toBe('/results?search_query=a');
    expect(
      ev.detail.endpoint.commandMetadata.webCommandMetadata.url
    ).toBe('/results?search_query=a');
    dispose();
  });

  it('mutates event.detail.url with sp= when filters non-default on /results without sp', () => {
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    const dispose = installNavListener(() => filters);
    const ev = dispatchNavStart('/results?search_query=a');
    expect(ev.detail.url).toContain('sp=');
    expect(ev.detail.url).toContain('search_query=a');
    expect(
      ev.detail.endpoint.commandMetadata.webCommandMetadata.url
    ).toBe(ev.detail.url);
    dispose();
  });

  it('does not call history.replaceState (YouTube overwrites it)', () => {
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    const spy = vi.spyOn(window.history, 'replaceState');
    const dispose = installNavListener(() => filters);
    dispatchNavStart('/results?search_query=a');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    dispose();
  });

  it('replaces detail.url sp= when filters are already selected before search', () => {
    const filters: SearchFilters = { ...DEFAULT_FILTERS, uploadDate: 'week' };
    const dispose = installNavListener(() => filters);
    const ev = dispatchNavStart('/results?search_query=a&sp=CAI%3D');
    expect(ev.detail.url).toContain('search_query=a');
    expect(ev.detail.url).toContain('sp=EgIIAw==');
    const next = new URL(ev.detail.url, window.location.origin);
    expect(next.searchParams.get('sp')).toBe('EgIIAw==');
    dispose();
  });

  it('dispose removes listener', () => {
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    const dispose = installNavListener(() => filters);
    dispose();
    const ev = dispatchNavStart('/results?search_query=a');
    expect(ev.detail.url).toBe('/results?search_query=a');
  });

  it('ignores non-results detail.url', () => {
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    const dispose = installNavListener(() => filters);
    const ev = dispatchNavStart('/feed/subscriptions');
    expect(ev.detail.url).toBe('/feed/subscriptions');
    dispose();
  });

  it('does nothing when event lacks detail.url', () => {
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    const dispose = installNavListener(() => filters);
    expect(() =>
      window.dispatchEvent(new CustomEvent('yt-navigate-start'))
    ).not.toThrow();
    dispose();
  });
});

describe('applyOnLoad', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('rewrites /results URL when sp missing and filters non-default', () => {
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    window.history.replaceState({}, '', '/results?search_query=a');
    const spy = vi.spyOn(window.history, 'replaceState');
    applyOnLoad(() => filters);
    expect(spy).toHaveBeenCalled();
    const newUrl = String(spy.mock.calls.at(-1)![2]);
    expect(newUrl).toContain('sp=');
    spy.mockRestore();
  });

  it('does nothing when not on /results', () => {
    window.history.replaceState({}, '', '/');
    const spy = vi.spyOn(window.history, 'replaceState');
    applyOnLoad(() => ({ ...DEFAULT_FILTERS, sort: 'date' }));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does not run twice in the same session', () => {
    const filters: SearchFilters = { ...DEFAULT_FILTERS, sort: 'date' };
    window.history.replaceState({}, '', '/results?search_query=a');
    applyOnLoad(() => filters);
    const spy = vi.spyOn(window.history, 'replaceState');
    applyOnLoad(() => filters);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('replaces existing sp when filters are non-default', () => {
    window.history.replaceState(
      {},
      '',
      '/results?search_query=a&sp=CAI%3D'
    );
    const spy = vi.spyOn(window.history, 'replaceState');
    applyOnLoad(() => ({ ...DEFAULT_FILTERS, sort: 'views' }));
    expect(spy).toHaveBeenCalled();
    const newUrl = String(spy.mock.calls.at(-1)![2]);
    expect(new URL(newUrl).searchParams.get('sp')).toBe('CAM=');
    spy.mockRestore();
  });
});
