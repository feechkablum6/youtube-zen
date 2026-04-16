/**
 * Fix-uBlock cleaner. YouTube renders ad slots as normal rich-item-renderer
 * tiles which uBlock then empties (sometimes removing the ad wrapper node
 * entirely). What remains is a sized DOM element with no loaded thumbnail
 * — a black rectangle in the feed grid.
 *
 * We can't distinguish these from a genuine lazy-loading tile through CSS
 * alone. Instead, we watch tiles as they enter the viewport and hide any
 * that still have no `img[src*="ytimg"]` after a grace period. Normal
 * lazy-loaded videos fetch their thumbnail almost immediately once in
 * view; true "empty" cells never do.
 */

export const EMPTY_GRACE_MS = 1500;
export const MIN_VISIBLE_HEIGHT = 50;

/**
 * Pure decision function used by the observer. Extracted so we can test
 * the rule without a DOM.
 */
export function isLikelyUblockEmpty(input: {
  height: number;
  hasThumbnail: boolean;
  ageMs: number;
}): boolean {
  if (input.height < MIN_VISIBLE_HEIGHT) return false;
  if (input.hasThumbnail) return false;
  return input.ageMs >= EMPTY_GRACE_MS;
}

const HIDDEN_CLASS = 'yz-ublock-hidden';
const STYLE_ID = 'yz-ublock-cleaner-style';
const GRID_SELECTOR =
  'ytd-rich-grid-renderer #contents > ytd-rich-item-renderer, ' +
  'ytd-rich-grid-renderer #contents > ytd-rich-section-renderer, ' +
  'ytd-rich-grid-row > #contents > ytd-rich-item-renderer';

interface CleanerState {
  io: IntersectionObserver;
  mo: MutationObserver;
  watchedAt: WeakMap<Element, number>;
  pending: Map<Element, ReturnType<typeof setTimeout>>;
}

let state: CleanerState | null = null;

function hasThumbnail(el: Element): boolean {
  return el.querySelector('img[src*="ytimg"]') !== null;
}

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `.${HIDDEN_CLASS}{display:none !important;}`;
  (document.head ?? document.documentElement).appendChild(s);
}

function scheduleCheck(el: Element): void {
  if (!state) return;
  if (state.pending.has(el)) return;

  const enteredAt = state.watchedAt.get(el) ?? Date.now();
  state.watchedAt.set(el, enteredAt);

  const delay = Math.max(0, EMPTY_GRACE_MS - (Date.now() - enteredAt));
  const handle = setTimeout(() => {
    state?.pending.delete(el);
    if (!document.contains(el)) return;
    if (el.classList.contains(HIDDEN_CLASS)) return;
    const r = (el as HTMLElement).getBoundingClientRect();
    if (
      isLikelyUblockEmpty({
        height: r.height,
        hasThumbnail: hasThumbnail(el),
        ageMs: Date.now() - enteredAt,
      })
    ) {
      el.classList.add(HIDDEN_CLASS);
    }
  }, delay);

  state.pending.set(el, handle);
}

function observeTile(el: Element): void {
  if (!state) return;
  state.io.observe(el);
}

function scanAndObserve(root: ParentNode): void {
  for (const el of root.querySelectorAll(GRID_SELECTOR)) {
    observeTile(el);
  }
}

export function startUblockCleaner(): void {
  if (state) return;
  ensureStyle();

  const watchedAt = new WeakMap<Element, number>();
  const pending = new Map<Element, ReturnType<typeof setTimeout>>();

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (!watchedAt.has(entry.target)) {
          watchedAt.set(entry.target, Date.now());
        }
        scheduleCheck(entry.target);
      }
    },
    { rootMargin: '200px 0px', threshold: 0 }
  );

  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.(GRID_SELECTOR)) observeTile(node);
        if (node.querySelectorAll) scanAndObserve(node);
      }
    }
  });

  state = { io, mo, watchedAt, pending };

  scanAndObserve(document);
  mo.observe(document.body ?? document.documentElement, {
    childList: true,
    subtree: true,
  });
}

export function stopUblockCleaner(): void {
  if (!state) return;
  state.io.disconnect();
  state.mo.disconnect();
  for (const handle of state.pending.values()) clearTimeout(handle);
  state.pending.clear();
  // Un-hide anything we hid so toggling off restores the feed.
  for (const el of document.querySelectorAll('.' + HIDDEN_CLASS)) {
    el.classList.remove(HIDDEN_CLASS);
  }
  state = null;
}
