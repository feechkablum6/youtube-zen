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

const BUTTON_AND_PANEL_CSS = `#yz-filters-btn {
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
  opacity: .75;
  cursor: pointer;
  position: relative;
  transition: opacity .15s, background .15s, border-color .15s;
}
#yz-filters-btn:hover { opacity: 1; }
#yz-filters-btn:focus-visible {
  outline: 2px solid var(--yt-spec-call-to-action, #3ea6ff);
  outline-offset: 2px;
}
#yz-filters-btn[data-has-active="true"] {
  opacity: 1;
  border-color: var(--yt-spec-call-to-action, #3ea6ff);
  color: var(--yt-spec-call-to-action, #3ea6ff);
}
.yz-btn__icon { font-size: 14px; line-height: 1; }
.yz-btn__label { line-height: 1; }
.yz-btn__badge {
  position: absolute;
  top: 4px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--yt-spec-call-to-action, #3ea6ff);
  font-size: 0;
  line-height: 0;
}
.yz-btn__badge[hidden] { display: none; }

#yz-filters-panel {
  background: var(--yt-spec-brand-background-primary, #0f0f0f);
  color: var(--yt-spec-text-primary, #fff);
  border: 1px solid var(--yt-spec-10-percent-layer, rgba(255,255,255,.1));
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,.3);
  padding: 12px 14px;
  min-width: 280px;
  max-width: 360px;
  z-index: 2200;
  font: inherit;
  font-size: 13px;
}
#yz-filters-panel .yz-group { padding: 4px 0; }
#yz-filters-panel .yz-group + .yz-group {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--yt-spec-10-percent-layer, rgba(255,255,255,.08));
}
#yz-filters-panel .yz-group__title {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--yt-spec-text-secondary, #aaa);
}
#yz-filters-panel .yz-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  cursor: pointer;
}
#yz-filters-panel .yz-row__label { flex: 1; }
#yz-filters-panel select {
  background: transparent;
  color: inherit;
  border: 1px solid var(--yt-spec-10-percent-layer, rgba(255,255,255,.14));
  border-radius: 6px;
  padding: 4px 6px;
  font: inherit;
  font-size: 13px;
  max-width: 60%;
}
#yz-filters-panel .yz-toggle {
  position: relative;
  display: inline-block;
  width: 32px;
  height: 18px;
}
#yz-filters-panel .yz-toggle input {
  position: absolute;
  opacity: 0;
  inset: 0;
  margin: 0;
  cursor: pointer;
}
#yz-filters-panel .yz-toggle-slider {
  position: absolute;
  inset: 0;
  border-radius: 18px;
  background: var(--yt-spec-10-percent-layer, rgba(255,255,255,.2));
  transition: background .15s;
}
#yz-filters-panel .yz-toggle-slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform .15s;
}
#yz-filters-panel .yz-toggle input:checked + .yz-toggle-slider {
  background: var(--yt-spec-call-to-action, #3ea6ff);
}
#yz-filters-panel .yz-toggle input:checked + .yz-toggle-slider::before {
  transform: translateX(14px);
}`;

export function buildCss(settings: ZenSettings): string {
  if (!settings.enabled) return '';

  const cleanerSelectors: string[] = [];

  for (const [key, rule] of Object.entries(HIDE_RULES)) {
    if (settings[key as ToggleKey]) {
      cleanerSelectors.push(...rule.selectors);
    }
  }

  const hasCleaner = cleanerSelectors.length > 0;
  const hasWatched = settings.filterWatchedEnabled === true;

  const parts: string[] = [];

  if (hasCleaner) {
    const selectorList = cleanerSelectors.join(',\n');
    parts.push(KEYFRAMES);
    parts.push(`${selectorList} {
  animation: yz-vanish 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
  overflow: hidden !important;
}

/* First-load override: hide instantly without playing the fade, so the
   initial page paint does not flash the hidden elements. main.ts removes
   the yz-initial class after the page settles. */
html.yz-initial ${cleanerSelectors.join(',\nhtml.yz-initial ')} {
  animation-duration: 0s !important;
}`);
  }

  // Filters button and panel styles are always injected when the extension
  // is enabled — the button is always visible, even if every filter is in
  // its default state.
  parts.push(BUTTON_AND_PANEL_CSS);

  if (hasWatched) {
    // Watched cards are hidden instantly (display: none) — no animation.
    // Reason: Cleaner shelves animate out with yz-vanish for 0.45s. If a
    // watched card next to such a shelf also animates for 0.45s on its own
    // timeline, YouTube grid spends that window with mismatched cell sizes
    // and leaves visual gaps. Instant collapse reflows the grid in a single
    // tick with no intermediate states.
    parts.push(`html.yz-watched-filter-on .yz-watched {
  display: none !important;
}`);
  }

  return parts.join('\n\n');
}
