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
    margin: 0 !important;
    padding: 0 !important;
    border-width: 0 !important;
    pointer-events: none;
  }
}`;

export function buildCss(settings: ZenSettings): string {
  if (!settings.enabled) return '';

  const selectors: string[] = [];

  for (const [key, rule] of Object.entries(HIDE_RULES)) {
    if (settings[key as ToggleKey]) {
      selectors.push(...rule.selectors);
    }
  }

  if (selectors.length === 0) return '';

  const selectorList = selectors.join(',\n');

  return `${KEYFRAMES}

${selectorList} {
  animation: yz-vanish 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
  overflow: hidden !important;
}

/* First-load override: hide instantly without playing the fade, so the
   initial page paint does not flash the hidden elements. main.ts removes
   the yz-initial class after the page settles. */
html.yz-initial ${selectors.join(',\nhtml.yz-initial ')} {
  animation-duration: 0s !important;
}`;
}
