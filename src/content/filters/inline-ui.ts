export const BTN_ID = 'yz-filters-btn';
const LABEL = 'Фильтры';

export function createFiltersButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = BTN_ID;
  btn.className = 'yz-btn';
  btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', LABEL);
  btn.dataset.hasActive = 'false';

  const icon = document.createElement('span');
  icon.className = 'yz-btn__icon';
  icon.textContent = '⚙';

  const label = document.createElement('span');
  label.className = 'yz-btn__label';
  label.textContent = LABEL;

  const badge = document.createElement('span');
  badge.className = 'yz-btn__badge';
  badge.setAttribute('hidden', '');
  badge.textContent = '•';

  btn.appendChild(icon);
  btn.appendChild(label);
  btn.appendChild(badge);
  return btn;
}

export function syncButtonBadge(btn: HTMLElement, hasActive: boolean): void {
  btn.dataset.hasActive = hasActive ? 'true' : 'false';
  const badge = btn.querySelector<HTMLElement>('.yz-btn__badge');
  if (!badge) return;
  if (hasActive) badge.removeAttribute('hidden');
  else badge.setAttribute('hidden', '');
}

export function mountFiltersButton(): HTMLButtonElement | null {
  const existing = document.getElementById(BTN_ID) as HTMLButtonElement | null;
  if (existing) return existing;

  const end = document.querySelector('ytd-masthead #end');
  if (!end) return null;

  const btn = createFiltersButton();
  const buttons = end.querySelector('#buttons');
  if (buttons) end.insertBefore(btn, buttons);
  else end.appendChild(btn);
  return btn;
}
