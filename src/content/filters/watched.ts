const PROGRESS_SELECTOR =
  'ytd-thumbnail-overlay-resume-playback-renderer #progress';
const PERCENT_RE = /([0-9]+(?:\.[0-9]+)?)\s*%/;

export function parseProgressPercent(card: Element): number | null {
  const progress = card.querySelector<HTMLElement>(PROGRESS_SELECTOR);
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
