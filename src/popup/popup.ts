import { DEFAULT_SETTINGS } from '../shared/defaults';
import type { ToggleKey, ZenSettings } from '../shared/types';
import { GROUP_LABELS } from '../shared/types';
import { HIDE_RULES } from '../content/selectors';

const DEFAULT_SETTINGS_RECORD = DEFAULT_SETTINGS as unknown as Record<string, unknown>;

function renderToggles(container: HTMLElement, settings: ZenSettings): void {
  container.innerHTML = '';

  const groups = new Map<string, { key: ToggleKey; label: string }[]>();

  for (const [key, rule] of Object.entries(HIDE_RULES)) {
    const group = rule.group;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push({ key: key as ToggleKey, label: rule.label });
  }

  for (const [group, items] of groups) {
    const groupEl = document.createElement('div');
    groupEl.className = 'toggle-group';

    const labelEl = document.createElement('div');
    labelEl.className = 'group-label';
    labelEl.textContent = GROUP_LABELS[group as keyof typeof GROUP_LABELS] ?? group;
    groupEl.appendChild(labelEl);

    const itemsEl = document.createElement('div');
    itemsEl.className = 'group-items';

    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'toggle-row';

      const rowLabel = document.createElement('span');
      rowLabel.className = 'toggle-row-label';
      rowLabel.textContent = item.label;

      const toggle = document.createElement('label');
      toggle.className = 'toggle';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = settings[item.key];
      input.addEventListener('change', () => {
        chrome.storage.sync.set({ [item.key]: input.checked });
      });

      const slider = document.createElement('span');
      slider.className = 'toggle-slider';

      toggle.appendChild(input);
      toggle.appendChild(slider);

      row.appendChild(rowLabel);
      row.appendChild(toggle);
      itemsEl.appendChild(row);
    }

    groupEl.appendChild(itemsEl);
    container.appendChild(groupEl);
  }

  container.classList.toggle('disabled', !settings.enabled);
}

function init(): void {
  const masterInput = document.querySelector<HTMLInputElement>(
    '.master-toggle input'
  );
  const container = document.getElementById('toggles-container');

  if (!masterInput || !container) return;

  chrome.storage.sync.get(DEFAULT_SETTINGS_RECORD, (stored) => {
    const settings = stored as ZenSettings;

    masterInput.checked = settings.enabled;
    renderToggles(container, settings);

    masterInput.addEventListener('change', () => {
      chrome.storage.sync.set({ enabled: masterInput.checked });
      container.classList.toggle('disabled', !masterInput.checked);
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
