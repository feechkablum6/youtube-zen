import { HIDE_RULES } from '../../content/selectors';
import { GROUP_LABELS, type HideRule, type ToggleKey, type ZenSettings } from '../../shared/types';
import { countActiveRules, groupRulesByGroup, type GroupedRule } from '../utils';
import type { PopupSection } from '../sections';

const ALL_KEYS = Object.keys(HIDE_RULES) as ToggleKey[];
const GROUP_ORDER: HideRule['group'][] = ['feed', 'sidebar', 'video', 'footer'];

// Preserved across re-renders (e.g. when storage changes) so user's
// collapsed groups stay collapsed. Default: all expanded.
const collapsedGroups = new Set<HideRule['group']>();

export const renderCleaner: PopupSection['render'] = function (container, settings) {
  container.innerHTML = '';

  container.appendChild(makeBreadcrumb('Очистка UI'));
  container.appendChild(makeSectionHead('Очистка UI', settings));

  const grouped = groupRulesByGroup(HIDE_RULES);
  for (const group of GROUP_ORDER) {
    const entries = grouped.get(group);
    if (!entries || entries.length === 0) continue;
    container.appendChild(makeGroup(group, entries, settings));
  }
};

function makeBreadcrumb(current: string): HTMLElement {
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

function makeSectionHead(title: string, settings: ZenSettings): HTMLElement {
  const head = document.createElement('div');
  head.className = 'section-head';

  const titleEl = document.createElement('div');
  titleEl.className = 'section-title';
  titleEl.textContent = title;

  const meta = document.createElement('div');
  meta.className = 'section-meta';
  const { active, total } = countActiveRules(settings, ALL_KEYS);
  meta.textContent = `${active} / ${total}`;

  head.appendChild(titleEl);
  head.appendChild(meta);
  return head;
}

function makeGroup(
  group: HideRule['group'],
  entries: GroupedRule[],
  settings: ZenSettings
): HTMLElement {
  const groupEl = document.createElement('div');
  groupEl.className = 'group';
  if (collapsedGroups.has(group)) groupEl.classList.add('collapsed');

  const head = document.createElement('div');
  head.className = 'group-head';

  const chevron = document.createElement('span');
  chevron.className = 'group-chevron';
  chevron.textContent = '▾';

  const label = document.createElement('span');
  label.className = 'group-label';
  label.textContent = GROUP_LABELS[group];

  const activeInGroup = entries.filter((e) => settings[e.key]).length;
  const count = document.createElement('span');
  count.className = 'group-count';
  count.textContent = `${activeInGroup}/${entries.length}`;

  head.appendChild(chevron);
  head.appendChild(label);
  head.appendChild(count);
  head.addEventListener('click', () => {
    const isCollapsed = groupEl.classList.toggle('collapsed');
    if (isCollapsed) collapsedGroups.add(group);
    else collapsedGroups.delete(group);
  });

  const items = document.createElement('div');
  items.className = 'group-items';

  for (const entry of entries) {
    items.appendChild(makeRow(entry, settings));
  }

  groupEl.appendChild(head);
  groupEl.appendChild(items);
  return groupEl;
}

function makeRow(entry: GroupedRule, settings: ZenSettings): HTMLElement {
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
  return row;
}
