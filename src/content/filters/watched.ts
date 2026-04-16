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
