import type { ToggleKey, ZenSettings } from '../shared/types';

import { HIDE_RULES } from './selectors';

// "Disintegrate on the spot" animation. The element stays in place while
// a mask gradient sweeps bottom-to-top (nether parts dissolve first,
// "ash flies up"), blur grows to suggest particles, and max-height
// collapses linearly across the whole duration so the container eases
// into the new layout instead of snapping at the end.
//
// max-height starts at 500px (covers nearly every YouTube sidebar /
// shelf / button-row we target). Elements larger than that will clip
// during the fade but still collapse to zero at the end.
const KEYFRAMES = `@keyframes yz-vanish {
  0% {
    opacity: 1;
    filter: blur(0);
    -webkit-mask-image: linear-gradient(to top, black 0%, black 100%);
    mask-image: linear-gradient(to top, black 0%, black 100%);
    max-height: 500px;
  }
  100% {
    opacity: 0;
    filter: blur(6px);
    -webkit-mask-image: linear-gradient(to top, transparent 100%, transparent 100%);
    mask-image: linear-gradient(to top, transparent 100%, transparent 100%);
    max-height: 0;
    /* Zero width/flex-basis/min-width so flex-wrapped rows reflow and do
       not leave an empty slot where the hidden shelf used to be. */
    width: 0;
    flex-basis: 0;
    min-width: 0;
    margin: 0 !important;
    padding: 0 !important;
    border-width: 0 !important;
    pointer-events: none;
  }
}`;

export function buildCss(settings: ZenSettings): string {
  if (!settings.enabled) return '';

  // Feed-group elements (Shorts shelf, in-feed ad slots) live inside
  // YouTube's flex-wrap grid. Animating them out with yz-vanish keeps the
  // flex slot for 0.45s and produces visible gaps around neighbouring
  // cards. Everything else (sidebar entries, footer, video-page chrome)
  // is in a block context where yz-vanish collapses cleanly.
  const instantSelectors: string[] = [];
  const animatedSelectors: string[] = [];

  for (const [key, rule] of Object.entries(HIDE_RULES)) {
    if (!settings[key as ToggleKey]) continue;
    const bucket = rule.group === 'feed' ? instantSelectors : animatedSelectors;
    bucket.push(...rule.selectors);
  }

  const hasInstant = instantSelectors.length > 0;
  const hasAnimated = animatedSelectors.length > 0;
  const hasCleaner = hasInstant || hasAnimated;
  const hasWatched = settings.filterWatchedEnabled === true;

  if (!hasCleaner && !hasWatched) return '';

  const parts: string[] = [KEYFRAMES];

  if (hasInstant) {
    parts.push(`${instantSelectors.join(',\n')} {
  display: none !important;
}`);
  }

  if (hasAnimated) {
    parts.push(`${animatedSelectors.join(',\n')} {
  animation: yz-vanish 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
  overflow: hidden !important;
}

/* First-load override: hide instantly without playing the fade, so the
   initial page paint does not flash the hidden elements. main.ts removes
   the yz-initial class after the page settles. */
html.yz-initial ${animatedSelectors.join(',\nhtml.yz-initial ')} {
  animation-duration: 0s !important;
}`);
  }

  if (hasWatched) {
    parts.push(`#yz-chip-watched {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  margin-right: 8px;
  border: 1px solid var(--yt-spec-10-percent-layer, rgba(255,255,255,.1));
  border-radius: 16px;
  background: transparent;
  color: var(--yt-spec-text-primary, inherit);
  font: inherit;
  font-size: 13px;
  opacity: .65;
  cursor: pointer;
  transition: opacity .15s, background .15s, border-color .15s;
}
#yz-chip-watched:hover { opacity: 1; }
#yz-chip-watched:focus-visible {
  outline: 2px solid var(--yt-spec-call-to-action, #3ea6ff);
  outline-offset: 2px;
}
#yz-chip-watched[data-active="true"] {
  opacity: 1;
  background: var(--yt-spec-call-to-action, #3ea6ff);
  color: #fff;
  border-color: transparent;
}
.yz-chip__icon { font-size: 14px; line-height: 1; }
.yz-chip__label { line-height: 1; }

/* Watched cards are hidden instantly (display: none) — no animation.
   Reason: Cleaner shelves animate out with yz-vanish for 0.45s. If a
   watched card next to such a shelf also animates for 0.45s on its own
   timeline, YouTube grid spends that window with mismatched cell sizes
   and leaves visual gaps. Instant collapse reflows the grid in a single
   tick with no intermediate states. */
html.yz-watched-filter-on .yz-watched {
  display: none !important;
}`);
  }

  return parts.join('\n\n');
}
