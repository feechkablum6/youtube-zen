export const CHIP_ID = 'yz-chip-watched';
const LABEL = 'Скрыть просмотренные';
const VISIBLE_PATHS = ['/', '/results', '/watch'];

export function createChip(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = CHIP_ID;
  btn.className = 'yz-chip';
  btn.dataset.active = 'false';
  btn.setAttribute('aria-pressed', 'false');
  btn.setAttribute('aria-label', LABEL);
  btn.type = 'button';

  const icon = document.createElement('span');
  icon.className = 'yz-chip__icon';
  icon.textContent = '◑';

  const label = document.createElement('span');
  label.className = 'yz-chip__label';
  label.textContent = 'Просмотренные';

  btn.appendChild(icon);
  btn.appendChild(label);

  return btn;
}

export function syncChipState(chip: HTMLElement, enabled: boolean): void {
  chip.dataset.active = enabled ? 'true' : 'false';
  chip.setAttribute('aria-pressed', enabled ? 'true' : 'false');
}

export function isPathVisible(pathname: string): boolean {
  return VISIBLE_PATHS.includes(pathname);
}

export function applyChipVisibility(
  chip: HTMLElement,
  pathname: string
): void {
  chip.style.display = isPathVisible(pathname) ? '' : 'none';
}

export function mountChip(): HTMLButtonElement | null {
  const existing = document.getElementById(CHIP_ID) as HTMLButtonElement | null;
  if (existing) return existing;

  const end = document.querySelector('ytd-masthead #end');
  if (!end) return null;

  const chip = createChip();
  const buttons = end.querySelector('#buttons');
  if (buttons) {
    end.insertBefore(chip, buttons);
  } else {
    end.appendChild(chip);
  }
  return chip;
}
