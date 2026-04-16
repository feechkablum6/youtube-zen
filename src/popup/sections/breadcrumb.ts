/**
 * Renders a "YouTube Zen › <current>" breadcrumb. Shared across every
 * section so its markup stays consistent.
 */
export function makeBreadcrumb(current: string): HTMLElement {
  const bc = document.createElement('div');
  bc.className = 'breadcrumb';

  const root = document.createElement('span');
  root.className = 'breadcrumb-link';
  root.textContent = 'YouTube Zen';
  bc.appendChild(root);

  const sep = document.createElement('span');
  sep.className = 'breadcrumb-sep';
  sep.textContent = '›';
  bc.appendChild(sep);

  const curr = document.createElement('span');
  curr.className = 'breadcrumb-current';
  curr.textContent = current;
  bc.appendChild(curr);

  return bc;
}
