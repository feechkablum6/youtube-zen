import type {
  DurationOpt,
  SettingsKey,
  SortOpt,
  TypeOpt,
  UploadDateOpt,
  ZenSettings,
} from '../../shared/types';

export const BTN_ID = 'yz-filters-btn';
export const PANEL_ID = 'yz-filters-panel';
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

interface SelectSpec {
  key: SettingsKey;
  label: string;
  options: ReadonlyArray<readonly [string, string]>;
}

const UPLOAD_OPTS: ReadonlyArray<readonly [UploadDateOpt, string]> = [
  ['any', 'Любая'],
  ['hour', 'За час'],
  ['today', 'Сегодня'],
  ['week', 'За неделю'],
  ['month', 'За месяц'],
  ['year', 'За год'],
];

const DURATION_OPTS: ReadonlyArray<readonly [DurationOpt, string]> = [
  ['any', 'Любая'],
  ['short', 'Короткие (до 4 мин)'],
  ['medium', 'Средние (4–20 мин)'],
  ['long', 'Длинные (более 20 мин)'],
];

const SORT_OPTS: ReadonlyArray<readonly [SortOpt, string]> = [
  ['relevance', 'По релевантности'],
  ['date', 'По дате загрузки'],
  ['views', 'По просмотрам'],
  ['rating', 'По рейтингу'],
];

const TYPE_OPTS: ReadonlyArray<readonly [TypeOpt, string]> = [
  ['any', 'Любой'],
  ['video', 'Видео'],
  ['channel', 'Канал'],
  ['playlist', 'Плейлист'],
  ['movie', 'Фильм'],
];

const SELECT_SPECS: ReadonlyArray<SelectSpec> = [
  { key: 'filterSearchUploadDate', label: 'Дата загрузки', options: UPLOAD_OPTS },
  { key: 'filterSearchDuration',   label: 'Длительность', options: DURATION_OPTS },
  { key: 'filterSearchSort',       label: 'Сортировка',   options: SORT_OPTS },
  { key: 'filterSearchType',       label: 'Тип',          options: TYPE_OPTS },
];

function buildSelect(spec: SelectSpec, value: string): HTMLLabelElement {
  const row = document.createElement('label');
  row.className = 'yz-row yz-row--select';

  const label = document.createElement('span');
  label.className = 'yz-row__label';
  label.textContent = spec.label;

  const select = document.createElement('select');
  select.dataset.key = spec.key;
  for (const [optValue, optLabel] of spec.options) {
    const opt = document.createElement('option');
    opt.value = optValue;
    opt.textContent = optLabel;
    select.appendChild(opt);
  }
  select.value = value;

  row.appendChild(label);
  row.appendChild(select);
  return row;
}

function buildToggleRow(checked: boolean): HTMLLabelElement {
  const row = document.createElement('label');
  row.className = 'yz-row yz-row--toggle';

  const label = document.createElement('span');
  label.className = 'yz-row__label';
  label.textContent = 'Скрывать просмотренные';

  const wrap = document.createElement('span');
  wrap.className = 'yz-toggle';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.dataset.key = 'filterWatchedEnabled';
  input.checked = checked;
  const slider = document.createElement('span');
  slider.className = 'yz-toggle-slider';
  wrap.appendChild(input);
  wrap.appendChild(slider);

  row.appendChild(label);
  row.appendChild(wrap);
  return row;
}

export function createPanel(settings: ZenSettings): HTMLElement {
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.className = 'yz-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Фильтры');
  panel.setAttribute('aria-modal', 'false');

  const feedGroup = document.createElement('section');
  feedGroup.className = 'yz-group';
  const feedTitle = document.createElement('h3');
  feedTitle.className = 'yz-group__title';
  feedTitle.textContent = 'Фильтры ленты';
  feedGroup.appendChild(feedTitle);
  feedGroup.appendChild(buildToggleRow(settings.filterWatchedEnabled));
  panel.appendChild(feedGroup);

  const searchGroup = document.createElement('section');
  searchGroup.className = 'yz-group';
  const searchTitle = document.createElement('h3');
  searchTitle.className = 'yz-group__title';
  searchTitle.textContent = 'Фильтры поиска';
  searchGroup.appendChild(searchTitle);
  for (const spec of SELECT_SPECS) {
    const value = settings[spec.key] as string;
    searchGroup.appendChild(buildSelect(spec, value));
  }
  panel.appendChild(searchGroup);

  return panel;
}

export function openPanel(
  btn: HTMLElement,
  settings: ZenSettings
): HTMLElement {
  const existing = document.getElementById(PANEL_ID);
  if (existing) return existing;
  const panel = createPanel(settings);
  document.body.appendChild(panel);
  btn.setAttribute('aria-expanded', 'true');
  return panel;
}

export function closePanel(btn: HTMLElement): void {
  const panel = document.getElementById(PANEL_ID);
  if (panel) panel.remove();
  btn.setAttribute('aria-expanded', 'false');
}

export function syncPanelInputs(
  panel: HTMLElement,
  settings: ZenSettings
): void {
  const toggle = panel.querySelector<HTMLInputElement>(
    'input[data-key="filterWatchedEnabled"]'
  );
  if (toggle) toggle.checked = settings.filterWatchedEnabled;

  for (const spec of SELECT_SPECS) {
    const select = panel.querySelector<HTMLSelectElement>(
      `select[data-key="${spec.key}"]`
    );
    if (!select) continue;
    const value = settings[spec.key] as string;
    if (select.value !== value) select.value = value;
  }
}
