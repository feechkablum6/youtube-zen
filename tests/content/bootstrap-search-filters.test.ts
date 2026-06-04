import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyActiveUploadDateToCurrentSearch,
  applyUploadDateChangeToCurrentSearch,
  handleSearchButtonClick,
  handleSearchFormSubmit,
  handleSearchInputKeydown,
  PAGE_SEARCH_NAVIGATE_EVENT,
  PAGE_SEARCH_NAVIGATE_RESULT_EVENT,
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

describe('handleSearchFormSubmit', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    document.body.innerHTML = '';
  });

  function searchForm(query: string): {
    form: HTMLFormElement;
    input: HTMLInputElement;
    button: HTMLButtonElement;
  } {
    const form = document.createElement('form');
    const input = document.createElement('input');
    const button = document.createElement('button');
    input.name = 'search_query';
    input.value = query;
    button.type = 'button';
    button.className = 'ytSearchboxComponentSearchButton';
    form.appendChild(input);
    form.appendChild(button);
    document.body.appendChild(form);
    return { form, input, button };
  }

  it('prevents YouTube default search and assigns filtered URL when upload date is active', () => {
    const { form } = searchForm('cats today');
    const assigned: string[] = [];
    const event = new SubmitEvent('submit', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'target', { value: form });

    handleSearchFormSubmit(
      event,
      { ...DEFAULT_FILTERS, uploadDate: 'today' },
      (url) => assigned.push(url)
    );

    expect(event.defaultPrevented).toBe(true);
    expect(assigned).toHaveLength(1);
    const next = new URL(assigned[0]);
    expect(next.pathname).toBe('/results');
    expect(next.searchParams.get('search_query')).toBe('cats today');
    expect(next.searchParams.get('sp')).toBe('EgIIAg==');
  });

  it('does not intercept search submit when upload date is not active', () => {
    const { form } = searchForm('cats');
    const assigned: string[] = [];
    const event = new SubmitEvent('submit', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'target', { value: form });

    handleSearchFormSubmit(event, DEFAULT_FILTERS, (url) =>
      assigned.push(url)
    );

    expect(event.defaultPrevented).toBe(false);
    expect(assigned).toEqual([]);
  });

  it('prevents YouTube Enter search and assigns filtered URL when upload date is active', () => {
    const { input } = searchForm('cats enter');
    const assigned: string[] = [];
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
    });
    Object.defineProperty(event, 'target', { value: input });

    handleSearchInputKeydown(
      event,
      { ...DEFAULT_FILTERS, uploadDate: 'today' },
      (url) => assigned.push(url)
    );

    expect(event.defaultPrevented).toBe(true);
    expect(assigned).toHaveLength(1);
    const next = new URL(assigned[0]);
    expect(next.pathname).toBe('/results');
    expect(next.searchParams.get('search_query')).toBe('cats enter');
    expect(next.searchParams.get('sp')).toBe('EgIIAg==');
  });

  it('uses page bridge SPA navigation instead of fallback assign when available', () => {
    const { input } = searchForm('cats bridge');
    const assigned: string[] = [];
    let payload: {
      id: string;
      url: string;
      query: string;
      params?: string;
    } | null = null;
    const onNavigate = (event: Event): void => {
      payload = JSON.parse((event as CustomEvent).detail);
      window.dispatchEvent(
        new CustomEvent(PAGE_SEARCH_NAVIGATE_RESULT_EVENT, {
          detail: JSON.stringify({ id: payload!.id, handled: true }),
        })
      );
    };
    window.addEventListener(PAGE_SEARCH_NAVIGATE_EVENT, onNavigate, true);
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
    });
    Object.defineProperty(event, 'target', { value: input });

    try {
      handleSearchInputKeydown(
        event,
        { ...DEFAULT_FILTERS, uploadDate: 'week' },
        (url) => assigned.push(url)
      );
    } finally {
      window.removeEventListener(PAGE_SEARCH_NAVIGATE_EVENT, onNavigate, true);
    }

    expect(event.defaultPrevented).toBe(true);
    expect(assigned).toEqual([]);
    expect(payload).toMatchObject({
      url: '/results?search_query=cats+bridge&sp=EgIIAw==',
      query: 'cats bridge',
      params: 'EgIIAw==',
    });
  });

  it('uses direct YouTube SPA navigation if bridge is unavailable in the same JS world', () => {
    const { input } = searchForm('cats spa');
    const handleNavigate = vi.fn();
    const app = document.createElement('ytd-app') as HTMLElement & {
      handleNavigate: typeof handleNavigate;
    };
    app.handleNavigate = handleNavigate;
    document.body.appendChild(app);
    const assigned: string[] = [];
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
    });
    Object.defineProperty(event, 'target', { value: input });

    handleSearchInputKeydown(
      event,
      { ...DEFAULT_FILTERS, uploadDate: 'week' },
      (url) => assigned.push(url)
    );

    expect(event.defaultPrevented).toBe(true);
    expect(assigned).toEqual([]);
    expect(handleNavigate).toHaveBeenCalledTimes(1);
    const payload = handleNavigate.mock.calls[0][0];
    expect(payload.form).toEqual({ reload: false });
    expect(payload.command.commandMetadata.webCommandMetadata.url).toBe(
      '/results?search_query=cats+spa&sp=EgIIAw=='
    );
    expect(payload.command.searchEndpoint).toEqual({
      query: 'cats spa',
      params: 'EgIIAw==',
    });
  });

  it('does not intercept non-Enter search keydown', () => {
    const { input } = searchForm('cats');
    const assigned: string[] = [];
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'a',
    });
    Object.defineProperty(event, 'target', { value: input });

    handleSearchInputKeydown(
      event,
      { ...DEFAULT_FILTERS, uploadDate: 'today' },
      (url) => assigned.push(url)
    );

    expect(event.defaultPrevented).toBe(false);
    expect(assigned).toEqual([]);
  });

  it('prevents YouTube search button click and assigns filtered URL when upload date is active', () => {
    const { button } = searchForm('cats click');
    const assigned: string[] = [];
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'target', { value: button });

    handleSearchButtonClick(
      event,
      { ...DEFAULT_FILTERS, uploadDate: 'week' },
      (url) => assigned.push(url)
    );

    expect(event.defaultPrevented).toBe(true);
    expect(assigned).toHaveLength(1);
    const next = new URL(assigned[0]);
    expect(next.pathname).toBe('/results');
    expect(next.searchParams.get('search_query')).toBe('cats click');
    expect(next.searchParams.get('sp')).toBe('EgIIAw==');
  });

  it('does not intercept search button click when upload date is not active', () => {
    const { button } = searchForm('cats');
    const assigned: string[] = [];
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'target', { value: button });

    handleSearchButtonClick(event, DEFAULT_FILTERS, (url) =>
      assigned.push(url)
    );

    expect(event.defaultPrevented).toBe(false);
    expect(assigned).toEqual([]);
  });
});
