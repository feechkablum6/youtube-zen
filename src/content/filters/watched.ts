const OVERLAY_SELECTOR = 'ytd-thumbnail-overlay-resume-playback-renderer';
const PERCENT_RE = /([0-9]+(?:\.[0-9]+)?)\s*%/;

export function parseProgressPercent(card: Element): number | null {
  // Two-step lookup: id="progress" is duplicated across cards (YouTube
  // reuses the id inside every resume-playback overlay). A compound
  // descendant selector can leak across subtrees with duplicate ids;
  // scope explicitly via the overlay element first.
  const overlay = card.querySelector<HTMLElement>(OVERLAY_SELECTOR);
  if (!overlay) return null;
  const progress = overlay.querySelector<HTMLElement>('#progress');
  if (!progress) return null;
  const style = progress.getAttribute('style');
  if (!style) return null;
  const match = PERCENT_RE.exec(style);
  if (!match) return null;
  const parsed = parseFloat(match[1]!);
  return Number.isFinite(parsed) ? parsed : null;
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
