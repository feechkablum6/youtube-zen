import { afterEach, describe, expect, it } from 'vitest';

import { compactGridRows } from '../../src/content/filters/compact-grid';

afterEach(() => {
  document.body.innerHTML = '';
});

function buildGrid(): { grid: HTMLElement; children: HTMLElement[] } {
  const root = document.createElement('ytd-rich-grid-renderer');
  const contents = document.createElement('div');
  contents.id = 'contents';
  const children: HTMLElement[] = [];
  for (let i = 0; i < 5; i++) {
    const c = document.createElement('ytd-rich-item-renderer');
    c.dataset.idx = String(i);
    contents.appendChild(c);
    children.push(c);
  }
  root.appendChild(contents);
  document.body.appendChild(root);
  return { grid: contents, children };
}

describe('compactGridRows', () => {
  it('moves hidden children to the end, preserving visible order', () => {
    const { grid, children } = buildGrid();
    // hide indices 1 and 3
    children[1]!.style.display = 'none';
    children[3]!.style.display = 'none';
    compactGridRows(grid);
    const order = Array.from(grid.children).map(
      (c) => (c as HTMLElement).dataset.idx
    );
    expect(order).toEqual(['0', '2', '4', '1', '3']);
  });

  it('is idempotent when already compacted', () => {
    const { grid, children } = buildGrid();
    children[4]!.style.display = 'none';
    compactGridRows(grid);
    const firstPass = Array.from(grid.children).map(
      (c) => (c as HTMLElement).dataset.idx
    );
    compactGridRows(grid);
    const secondPass = Array.from(grid.children).map(
      (c) => (c as HTMLElement).dataset.idx
    );
    expect(secondPass).toEqual(firstPass);
  });

  it('does nothing when nothing is hidden', () => {
    const { grid, children } = buildGrid();
    compactGridRows(grid);
    const order = Array.from(grid.children).map(
      (c) => (c as HTMLElement).dataset.idx
    );
    expect(order).toEqual(children.map((_, i) => String(i)));
  });

  it('handles hidden-by-class (via yz-watched) too', () => {
    const { grid, children } = buildGrid();
    // Simulate CSS rule: html.yz-watched-filter-on .yz-watched { display: none }
    const styleEl = document.createElement('style');
    styleEl.textContent = '.yz-watched { display: none; }';
    document.head.appendChild(styleEl);
    children[2]!.classList.add('yz-watched');
    compactGridRows(grid);
    const order = Array.from(grid.children).map(
      (c) => (c as HTMLElement).dataset.idx
    );
    expect(order).toEqual(['0', '1', '3', '4', '2']);
    styleEl.remove();
  });
});
