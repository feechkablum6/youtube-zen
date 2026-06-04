// Two known progress-overlay layouts on YouTube (verified 2026-04):
//   - Material (new, home + `yt-lockup-view-model` sidebar):
//       yt-thumbnail-overlay-progress-bar-view-model
//         └─ .ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment[style="width: N%"]
//   - Legacy (older pages / A/B buckets):
//       ytd-thumbnail-overlay-resume-playback-renderer
//         └─ #progress[style="width: N%"]
const MATERIAL_HOST = 'yt-thumbnail-overlay-progress-bar-view-model';
const MATERIAL_SEGMENT =
  '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment';
const LEGACY_OVERLAY = 'ytd-thumbnail-overlay-resume-playback-renderer';
const PERCENT_RE = /([0-9]+(?:\.[0-9]+)?)\s*%/;

function readWidthPercent(el: Element | null): number | null {
  if (!el) return null;
  const style = el.getAttribute('style');
  if (!style) return null;
  const match = PERCENT_RE.exec(style);
  if (!match) return null;
  const parsed = parseFloat(match[1]!);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseProgressPercent(card: Element): number | null {
  // Two-step lookup: ids and class names repeat across cards, so compound
  // descendant selectors can leak across subtrees. Scope explicitly via
  // the overlay host element first.
  const materialHost = card.querySelector<HTMLElement>(MATERIAL_HOST);
  if (materialHost) {
    const segment = materialHost.querySelector<HTMLElement>(MATERIAL_SEGMENT);
    const percent = readWidthPercent(segment);
    if (percent !== null) return percent;
  }

  const legacy = card.querySelector<HTMLElement>(LEGACY_OVERLAY);
  if (legacy) {
    const progress = legacy.querySelector<HTMLElement>('#progress');
    const percent = readWidthPercent(progress);
    if (percent !== null) return percent;
  }

  return null;
}

export function shouldHide(card: Element, threshold: number): boolean {
  const percent = parseProgressPercent(card);
  if (percent === null) return false;
  return percent >= threshold;
}

export const CARD_SELECTORS: readonly string[] = [
  'ytd-rich-item-renderer',
  'ytd-video-renderer',
  'yt-lockup-view-model',
];

export function applyWatchedClass(card: Element, threshold: number): void {
  card.classList.toggle('yz-watched', shouldHide(card, threshold));
}

// On /feed/history every card is by definition watched, so the filter would
// hide the entire page. Disable it on that path regardless of the toggle.
export function isWatchedFilterActive(
  enabled: boolean,
  pathname: string
): boolean {
  if (!enabled) return false;
  return !pathname.startsWith('/feed/history');
}

// `yt-navigate-start` carries the destination URL in event.detail.url before
// YouTube paints the new page — extract its pathname so we can update the
// html-class gate ahead of render and avoid a flash of hidden cards.
export function pathnameFromNavDetail(
  detail: unknown,
  origin: string
): string | null {
  if (!detail || typeof detail !== 'object') return null;
  const url = (detail as { url?: unknown }).url;
  if (typeof url !== 'string' || url.length === 0) return null;
  try {
    return new URL(url, origin).pathname;
  } catch {
    return null;
  }
}
