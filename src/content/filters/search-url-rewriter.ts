import type { SearchFilters } from '../../shared/types';
import { encodeSp } from './sp-encoder';

export function applySearchFiltersToUrl(url: URL, filters: SearchFilters): URL {
  if (url.pathname !== '/results') return url;

  const next = new URL(url.toString());
  const sp = encodeSp(filters);
  if (sp) next.searchParams.set('sp', decodeURIComponent(sp));
  else next.searchParams.delete('sp');
  return next;
}

export function rewriteIfNeeded(url: URL, filters: SearchFilters): URL {
  if (url.pathname !== '/results') return url;
  const sp = encodeSp(filters);
  if (!sp) return url;
  return applySearchFiltersToUrl(url, filters);
}

const APPLIED_FLAG = 'yz-sp-applied';

export function applyOnLoad(getFilters: () => SearchFilters): void {
  if (window.sessionStorage.getItem(APPLIED_FLAG)) return;
  const current = new URL(window.location.href);
  if (current.pathname !== '/results') return;
  const rewritten = rewriteIfNeeded(current, getFilters());
  if (rewritten.toString() === current.toString()) return;
  window.sessionStorage.setItem(APPLIED_FLAG, String(Date.now()));
  window.history.replaceState(
    window.history.state,
    '',
    rewritten.toString()
  );
}

interface YtNavStartDetail {
  url?: string;
  endpoint?: {
    commandMetadata?: { webCommandMetadata?: { url?: string } };
  };
}

function toYtNavigationRelativeUrl(url: URL): string {
  const search = url.searchParams.toString();
  const sp = url.searchParams.get('sp');
  const safeSearch = sp
    ? search.replace(`sp=${encodeURIComponent(sp)}`, `sp=${sp}`)
    : search;
  return `${url.pathname}${safeSearch ? `?${safeSearch}` : ''}${url.hash}`;
}

export function installNavListener(
  getFilters: () => SearchFilters
): () => void {
  const onNav = (e: Event): void => {
    const detail = (e as CustomEvent<YtNavStartDetail>).detail;
    const detailUrl = detail?.url;
    if (typeof detailUrl !== 'string' || detailUrl.length === 0) return;
    const target = new URL(detailUrl, window.location.origin);
    const rewritten = rewriteIfNeeded(target, getFilters());
    if (rewritten.toString() === target.toString()) return;
    const nextRelative = toYtNavigationRelativeUrl(rewritten);
    detail!.url = nextRelative;
    const meta = detail?.endpoint?.commandMetadata?.webCommandMetadata;
    if (meta && typeof meta.url === 'string') meta.url = nextRelative;
  };
  window.addEventListener('yt-navigate-start', onNav, true);
  return () =>
    window.removeEventListener('yt-navigate-start', onNav, true);
}
