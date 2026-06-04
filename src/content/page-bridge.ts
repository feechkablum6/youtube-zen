const REQUEST_EVENT = 'yz:search-navigate';
const RESPONSE_EVENT = 'yz:search-navigate-result';

interface SearchNavigatePayload {
  id: string;
  url: string;
  query: string;
  params?: string;
}

interface YtSearchEndpoint {
  commandMetadata: {
    webCommandMetadata: {
      url: string;
      webPageType: 'WEB_PAGE_TYPE_SEARCH';
      rootVe: 4724;
      apiUrl: '/youtubei/v1/search';
    };
  };
  searchEndpoint: {
    query: string;
    params?: string;
  };
}

interface YtdAppWithNavigation extends Element {
  handleNavigate?: (payload: {
    command: YtSearchEndpoint;
    form: { reload: false };
  }) => void;
}

const state = window as Window & { __yzSearchBridgeInstalled?: boolean };

function parsePayload(value: unknown): SearchNavigatePayload | null {
  if (typeof value !== 'string') return null;

  try {
    const parsed = JSON.parse(value) as Partial<SearchNavigatePayload>;
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.url !== 'string' ||
      typeof parsed.query !== 'string'
    ) {
      return null;
    }

    return {
      id: parsed.id,
      url: parsed.url,
      query: parsed.query,
      params: typeof parsed.params === 'string' ? parsed.params : undefined,
    };
  } catch {
    return null;
  }
}

function emitResult(id: string, handled: boolean): void {
  window.dispatchEvent(
    new CustomEvent(RESPONSE_EVENT, {
      detail: JSON.stringify({ id, handled }),
    })
  );
}

function navigate(payload: SearchNavigatePayload): boolean {
  const app = document.querySelector('ytd-app') as YtdAppWithNavigation | null;
  if (typeof app?.handleNavigate !== 'function') return false;

  const searchEndpoint: YtSearchEndpoint['searchEndpoint'] = {
    query: payload.query,
  };
  if (payload.params) searchEndpoint.params = payload.params;

  app.handleNavigate({
    command: {
      commandMetadata: {
        webCommandMetadata: {
          url: payload.url,
          webPageType: 'WEB_PAGE_TYPE_SEARCH',
          rootVe: 4724,
          apiUrl: '/youtubei/v1/search',
        },
      },
      searchEndpoint,
    },
    form: { reload: false },
  });
  return true;
}

if (!state.__yzSearchBridgeInstalled) {
  state.__yzSearchBridgeInstalled = true;
  window.addEventListener(
    REQUEST_EVENT,
    (event) => {
      const payload = parsePayload((event as CustomEvent).detail);
      if (!payload) return;

      try {
        emitResult(payload.id, navigate(payload));
      } catch {
        emitResult(payload.id, false);
      }
    },
    true
  );
}
