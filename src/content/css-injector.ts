import type { ToggleKey, ZenSettings } from '../shared/types';

import { HIDE_RULES } from './selectors';

// "Disintegrate & fly out" animation. The final keyframe collapses
// max-height / margin / padding to zero so the hidden element releases
// its layout space once the animation ends. `pointer-events: none` on
// the final frame prevents interaction during the fade.
const KEYFRAMES = `@keyframes yz-vanish {
  0% {
    opacity: 1;
    transform: none;
    filter: blur(0);
    max-height: 100vh;
  }
  45% {
    opacity: 0;
    transform: scale(0.88) translateY(-24px) rotate(1.5deg);
    filter: blur(8px);
    max-height: 100vh;
  }
  100% {
    opacity: 0;
    transform: scale(0.88) translateY(-24px) rotate(1.5deg);
    filter: blur(8px);
    max-height: 0;
    margin: 0 !important;
    padding: 0 !important;
    border-width: 0 !important;
    overflow: hidden;
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
