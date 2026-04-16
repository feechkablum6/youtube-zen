import { HIDE_RULES } from '../../content/selectors';
import { GROUP_LABELS, type HideRule, type ToggleKey } from '../../shared/types';
import { countActiveRules, groupRulesByGroup } from '../utils';
import type { PopupSection } from '../sections';

const ALL_KEYS = Object.keys(HIDE_RULES) as ToggleKey[];
const GROUP_ORDER: HideRule['group'][] = ['feed', 'sidebar', 'video', 'footer'];

export const renderCleaner: PopupSection['render'] = function (container, settings) {
  container.innerHTML = '';

  // Section head with title + X / Y counter
  const head = document.createElement('div');
  head.className = 'section-head';

  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Очистка UI';

  const meta = document.createElement('div');
  meta.className = 'section-meta';
  const { active, total } = countActiveRules(settings, ALL_KEYS);
  meta.textContent = `${active} / ${total}`;

  head.appendChild(title);
  head.appendChild(meta);
  container.appendChild(head);

  // Groups
  const grouped = groupRulesByGroup(HIDE_RULES);

  for (const group of GROUP_ORDER) {
    const entries = grouped.get(group);
    if (!entries || entries.length === 0) continue;

    const groupEl = document.createElement('div');
    groupEl.className = 'group';

    const label = document.createElement('div');
    label.className = 'group-label';
    label.textContent = GROUP_LABELS[group];
    groupEl.appendChild(label);

    for (const entry of entries) {
      const row = document.createElement('label');
      row.className = 'row';

      const rowLabel = document.createElement('span');
      rowLabel.className = 'row-label';
      rowLabel.textContent = entry.label;

      const toggle = document.createElement('span');
      toggle.className = 'toggle';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = settings[entry.key];
      input.addEventListener('change', () => {
        chrome.storage.sync.set({ [entry.key]: input.checked });
      });

      const slider = document.createElement('span');
      slider.className = 'toggle-slider';

      toggle.appendChild(input);
      toggle.appendChild(slider);

      row.appendChild(rowLabel);
      row.appendChild(toggle);
      groupEl.appendChild(row);
    }

    container.appendChild(groupEl);
  }
};
