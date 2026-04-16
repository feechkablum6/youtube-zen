// Flex-wrap grids on YouTube do not reflow when children become display:none
// mid-row. The row keeps its slot count but we leave holes where hidden
// items used to be, and the row before a full-width section stays
// partially empty. Moving hidden children to the end of the grid container
// lets flex-wrap recompute — every row is filled left-to-right with
// visible items, and hidden ones quietly pile up at the tail.

export const GRID_CONTAINER_SELECTORS = [
  'ytd-rich-grid-renderer #contents',
  'ytd-rich-grid-row #contents',
];

function isHidden(el: Element): boolean {
  // In jsdom `display` is a string prop even without a full layout engine;
  // in Chromium we get the real computed style. Both work.
  return getComputedStyle(el).display === 'none';
}

export function compactGridRows(grid: Element): void {
  // Two-pass to avoid mutating while iterating: collect first, move after.
  const toMove: Element[] = [];
  for (const child of Array.from(grid.children)) {
    if (isHidden(child)) toMove.push(child);
  }
  for (const el of toMove) {
    // appendChild of an existing child moves it to the end.
    grid.appendChild(el);
  }
}

export function compactAllGridRows(root: ParentNode = document): void {
  for (const sel of GRID_CONTAINER_SELECTORS) {
    root.querySelectorAll(sel).forEach((grid) => compactGridRows(grid));
  }
}
