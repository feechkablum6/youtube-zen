import type { SearchFilters } from '../../shared/types';
import { encodeSp } from './sp-encoder';

export function rewriteIfNeeded(url: URL, filters: SearchFilters): URL {
  if (url.pathname !== '/results') return url;
  if (url.searchParams.has('sp')) return url;
  const sp = encodeSp(filters);
  if (!sp) return url;
  const next = new URL(url.toString());
  next.searchParams.set('sp', decodeURIComponent(sp));
  return next;
}

export function installNavListener(
  getFilters: () => SearchFilters
): () => void {
  const onNav = (): void => {
    const current = new URL(window.location.href);
    const rewritten = rewriteIfNeeded(current, getFilters());
    if (rewritten.toString() !== current.toString()) {
      window.history.replaceState(
        window.history.state,
        '',
        rewritten.toString()
      );
    }
  };
  window.addEventListener('yt-navigate-start', onNav);
  return () => window.removeEventListener('yt-navigate-start', onNav);
}
