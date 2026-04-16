import { HIDE_RULES } from '../../content/selectors';
import { GROUP_LABELS, type HideRule, type ToggleKey, type ZenSettings } from '../../shared/types';
import { countActiveRules, groupRulesByGroup, type GroupedRule } from '../utils';
import type { PopupSection } from '../sections';

const ALL_KEYS = Object.keys(HIDE_RULES) as ToggleKey[];
const GROUP_ORDER: HideRule['group'][] = ['feed', 'sidebar', 'video', 'footer'];

// Preserved across re-renders (e.g. section switch) so user's
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
    container.appendChild(makeGroup(container, group, entries, settings));
  }
};

/**
 * Called by popup orchestrator when only toggle keys changed (no enabled /
 * activeSection flip). Updates input.checked for changed keys and recounts
 * group / section meta. No DOM recreation → no flicker.
 */
export const onCleanerStoragePatch: NonNullable<PopupSection['onStoragePatch']> =
  function (container, settings, changes) {
    for (const key of Object.keys(changes)) {
      if (!(key in HIDE_RULES)) continue;
      const input = container.querySelector<HTMLInputElement>(
        `input[data-key="${key}"]`
      );
      if (!input) continue;
      const next = settings[key as ToggleKey];
      if (input.checked !== next) input.checked = next;
    }
    recount(container, settings);
  };

function recount(root: HTMLElement, settings: ZenSettings): void {
  // Section meta (X / Y across all rules)
  const { active, total } = countActiveRules(settings, ALL_KEYS);
  const meta = root.querySelector<HTMLElement>('.section-meta');
  if (meta) meta.textContent = `${active} / ${total}`;

  // Per-group counts
  const grouped = groupRulesByGroup(HIDE_RULES);
  root.querySelectorAll<HTMLElement>('.group').forEach((groupEl) => {
    const name = groupEl.dataset.group as HideRule['group'] | undefined;
    if (!name) return;
    const entries = grouped.get(name) ?? [];
    const activeInGroup = entries.filter((e) => settings[e.key]).length;
    const count = groupEl.querySelector<HTMLElement>('.group-count');
    if (count) count.textContent = `${activeInGroup}/${entries.length}`;
  });
}

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
  root: HTMLElement,
  group: HideRule['group'],
  entries: GroupedRule[],
  settings: ZenSettings
): HTMLElement {
  const groupEl = document.createElement('div');
  groupEl.className = 'group';
  groupEl.dataset.group = group;
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
    items.appendChild(makeRow(root, entry, settings));
  }

  groupEl.appendChild(head);
  groupEl.appendChild(items);
  return groupEl;
}

function makeRow(
  root: HTMLElement,
  entry: GroupedRule,
  settings: ZenSettings
): HTMLElement {
  const row = document.createElement('label');
  row.className = 'row';

  const rowLabel = document.createElement('span');
  rowLabel.className = 'row-label';
  rowLabel.textContent = entry.label;

  const toggle = document.createElement('span');
  toggle.className = 'toggle';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.dataset.key = entry.key;
  input.checked = settings[entry.key];
  input.addEventListener('change', () => {
    // Write to storage (content script will pick it up and update CSS).
    chrome.storage.sync.set({ [entry.key]: input.checked });
    // Optimistic local recount — the storage event will arrive and call
    // onCleanerStoragePatch, which is idempotent, so no harm.
    const optimistic: ZenSettings = { ...settings, [entry.key]: input.checked };
    recount(root, optimistic);
  });

  const slider = document.createElement('span');
  slider.className = 'toggle-slider';

  toggle.appendChild(input);
  toggle.appendChild(slider);

  row.appendChild(rowLabel);
  row.appendChild(toggle);
  return row;
}
