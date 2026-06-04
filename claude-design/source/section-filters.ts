import type { PopupSection } from '../sections';
import { makeBreadcrumb } from './breadcrumb';

const DEBOUNCE_MS = 150;

export const renderFilters: PopupSection['render'] = function (
  container,
  settings
) {
  container.innerHTML = '';
  container.appendChild(makeBreadcrumb('Фильтры ленты'));

  const group = document.createElement('div');
  group.className = 'group';

  const head = document.createElement('div');
  head.className = 'group-head';
  const label = document.createElement('span');
  label.className = 'group-label';
  label.textContent = 'Просмотренные видео';
  head.appendChild(label);
  group.appendChild(head);

  const items = document.createElement('div');
  items.className = 'group-items';

  const toggleRow = document.createElement('label');
  toggleRow.className = 'row';

  const toggleLabel = document.createElement('span');
  toggleLabel.className = 'row-label';
  toggleLabel.textContent = 'Скрывать просмотренные';

  const toggle = document.createElement('span');
  toggle.className = 'toggle';

  const toggleInput = document.createElement('input');
  toggleInput.type = 'checkbox';
  toggleInput.dataset.key = 'filterWatchedEnabled';
  toggleInput.checked = settings.filterWatchedEnabled;
  toggleInput.addEventListener('change', () => {
    chrome.storage.sync.set({ filterWatchedEnabled: toggleInput.checked });
  });

  const toggleSlider = document.createElement('span');
  toggleSlider.className = 'toggle-slider';

  toggle.appendChild(toggleInput);
  toggle.appendChild(toggleSlider);
  toggleRow.appendChild(toggleLabel);
  toggleRow.appendChild(toggle);
  items.appendChild(toggleRow);

  const sliderWrap = document.createElement('div');
  sliderWrap.className = 'row row--stack';

  const sliderLabel = document.createElement('span');
  sliderLabel.className = 'row-label';
  sliderLabel.textContent = 'Порог «просмотрено»';

  const range = document.createElement('input');
  range.type = 'range';
  range.min = '0';
  range.max = '100';
  range.step = '5';
  range.value = String(settings.filterWatchedThreshold);
  range.setAttribute(
    'aria-valuetext',
    `Порог ${settings.filterWatchedThreshold}%`
  );

  const hint = document.createElement('p');
  hint.className = 'yz-hint';
  const setHintText = (value: number): void => {
    hint.textContent = `Видео с прогрессом ≥ ${value}% считается просмотренным`;
  };
  setHintText(settings.filterWatchedThreshold);

  let debounceTimer: number | null = null;
  range.addEventListener('input', () => {
    const value = parseInt(range.value, 10);
    setHintText(value);
    range.setAttribute('aria-valuetext', `Порог ${value}%`);
    if (debounceTimer !== null) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      chrome.storage.sync.set({ filterWatchedThreshold: value });
      debounceTimer = null;
    }, DEBOUNCE_MS);
  });

  sliderWrap.appendChild(sliderLabel);
  sliderWrap.appendChild(range);
  sliderWrap.appendChild(hint);
  items.appendChild(sliderWrap);

  const footnote = document.createElement('p');
  footnote.className = 'yz-hint yz-hint--muted';
  footnote.textContent = 'Фильтры поиска доступны рядом с поиском YouTube.';
  items.appendChild(footnote);

  group.appendChild(items);
  container.appendChild(group);
};
