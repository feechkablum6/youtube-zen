import { HIDE_RULES, SIDEBAR_LISTS } from '../../content/selectors';
import { GROUP_LABELS, type HideRule, type ToggleKey, type ZenSettings } from '../../shared/types';
import { countActiveRules, groupRulesByGroup, type GroupedRule } from '../utils';
import type { PopupSection } from '../sections';
import { makeBreadcrumb } from './breadcrumb';

const ALL_KEYS: ToggleKey[] = [
  // Плоские тумблеры (HIDE_RULES)
  'shorts', 'subscriptions', 'reportButton', 'footer', 'fixUblock', 'actionPanel',
  // Master + дети вложенных аккордеонов
  'youList', 'youMyChannel', 'youHistory', 'youWatchLater',
  'navigator', 'navMusic', 'navFilms', 'navLive',
  'explore', 'exploreMusic', 'exploreKids',
  // Переиспользованные ключи в качестве детей «Вы»
  'playlists', 'liked', 'yourVideos', 'downloads',
];

const GROUP_ORDER: HideRule['group'][] = ['feed', 'sidebar', 'video', 'footer'];

// Preserved across re-renders (e.g. section switch) so user's collapsed /
// expanded groups stay stable. Default: all collapsed.
const collapsedGroups = new Set<HideRule['group']>(GROUP_ORDER);

// State of each sidebar accordion (collapsed/expanded). Preserved across
// re-renders. Default: all collapsed.
const collapsedAccords = new Set<ToggleKey>(
  SIDEBAR_LISTS.map((list) => list.masterKey)
);

export const renderCleaner: PopupSection['render'] = function (container, settings) {
  container.innerHTML = '';

  container.appendChild(makeBreadcrumb('Очистка UI'));
  container.appendChild(makeSectionHead('Очистка UI', settings));

  // Кэш активности master-ключей для применения disabled к детям
  const isMasterOn = (master: ToggleKey): boolean => Boolean(settings[master]);

  // Сначала группа «Сайдбар» — рендерим её руками, чтобы вставить аккордеоны
  // перед плоскими строками
  const grouped = groupRulesByGroup(HIDE_RULES);
  for (const group of GROUP_ORDER) {
    const entries = grouped.get(group);
    if (!entries || entries.length === 0) continue;
    if (group === 'sidebar') {
      container.appendChild(
        makeSidebarGroup(container, group, entries, settings, isMasterOn)
      );
    } else {
      container.appendChild(makeGroup(container, group, entries, settings));
    }
  }
};

/**
 * Called by popup orchestrator when only toggle keys changed (no enabled /
 * activeSection flip). Updates input.checked for changed keys, syncs
 * master→child disabled state for accordions, and recounts group / section
 * meta. No DOM recreation → no flicker.
 */
export const onCleanerStoragePatch: NonNullable<PopupSection['onStoragePatch']> =
  function (container, settings, changes) {
    const changedKeys = Object.keys(changes);

    // 1) Обновляем .checked для всех изменившихся ключей (и плоские, и аккордеоны)
    for (const key of changedKeys) {
      const input = container.querySelector<HTMLInputElement>(
        `input[data-key="${key}"]`
      );
      if (!input) continue;
      if (key in settings) {
        const next = settings[key as ToggleKey];
        if (input.checked !== next) input.checked = next;
      }
    }

    // 2) Синхронизируем disabled-состояние детей при изменении master.
    // Если поменялся master-ключ аккордеона — пройтись по детям и обновить disabled.
    for (const list of SIDEBAR_LISTS) {
      if (!changedKeys.includes(list.masterKey)) continue;
      const enabled = Boolean(settings[list.masterKey]);
      for (const child of list.children) {
        const childInput = container.querySelector<HTMLInputElement>(
          `input[data-key="${child.key}"]`
        );
        if (childInput && childInput.disabled !== !enabled) {
          childInput.disabled = !enabled;
        }
      }
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

function makeSidebarGroup(
  root: HTMLElement,
  group: 'sidebar',
  entries: GroupedRule[],
  settings: ZenSettings,
  isMasterOn: (master: ToggleKey) => boolean
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

  const count = document.createElement('span');
  count.className = 'group-count';
  count.textContent = `${countSidebarActive(settings)}/${sidebarTotal(settings)}`;

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

  // 1) Вложенные аккордеоны
  for (const list of SIDEBAR_LISTS) {
    items.appendChild(makeAccordion(root, list, settings, isMasterOn));
  }

  // 2) Плоские строки (после аккордеонов)
  for (const entry of entries) {
    items.appendChild(makeRow(root, entry, settings));
  }

  groupEl.appendChild(head);
  groupEl.appendChild(items);
  return groupEl;
}

function countSidebarActive(settings: ZenSettings): number {
  let n = 0;
  for (const list of SIDEBAR_LISTS) {
    if (settings[list.masterKey]) {
      for (const c of list.children) if (settings[c.key]) n++;
    }
  }
  for (const key of ['subscriptions', 'reportButton'] as const) {
    if (settings[key]) n++;
  }
  return n;
}

function sidebarTotal(settings: ZenSettings): number {
  let n = 0;
  for (const list of SIDEBAR_LISTS) {
    n += list.children.length;
  }
  n += 2; // subscriptions + reportButton
  return n;
}

function makeAccordion(
  root: HTMLElement,
  list: ReturnType<typeof SIDEBAR_LISTS[number] extends infer T ? () => T : never> | (typeof SIDEBAR_LISTS)[number],
  settings: ZenSettings,
  isMasterOn: (master: ToggleKey) => boolean
): HTMLElement {
  const acc = document.createElement('div');
  acc.className = 'accordion';
  acc.dataset.accordion = list.masterKey;
  if (collapsedAccords.has(list.masterKey)) acc.classList.add('collapsed');

  const accHead = document.createElement('div');
  accHead.className = 'accordion-head';

  const accChevron = document.createElement('span');
  accChevron.className = 'accordion-chevron';
  accChevron.textContent = '▾';

  const accLabel = document.createElement('span');
  accLabel.className = 'accordion-label';
  accLabel.textContent = list.label;

  const masterEnabled = isMasterOn(list.masterKey);
  accHead.appendChild(accChevron);
  accHead.appendChild(accLabel);

  // Master-тумблер (НЕ внутри label — клик по нему не должен сворачивать аккордеон)
  const masterToggleWrap = document.createElement('span');
  masterToggleWrap.className = 'toggle';
  const masterInput = document.createElement('input');
  masterInput.type = 'checkbox';
  masterInput.dataset.key = list.masterKey;
  masterInput.checked = masterEnabled;
  masterInput.addEventListener('change', () => {
    chrome.storage.sync.set({ [list.masterKey]: masterInput.checked });
    // Оптимистично обновить disabled детей
    const enabled = masterInput.checked;
    for (const child of list.children) {
      const childInput = root.querySelector<HTMLInputElement>(
        `input[data-key="${child.key}"]`
      );
      if (childInput) childInput.disabled = !enabled;
    }
    const optimistic: ZenSettings = { ...settings, [list.masterKey]: masterInput.checked };
    recount(root, optimistic);
  });
  const masterSlider = document.createElement('span');
  masterSlider.className = 'toggle-slider';
  masterToggleWrap.appendChild(masterInput);
  masterToggleWrap.appendChild(masterSlider);

  accHead.appendChild(masterToggleWrap);

  // Клик по шапке (но не по тумблеру) — раскрыть/свернуть
  accHead.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('input[type="checkbox"]')) return;
    if (target.closest('.toggle')) return;
    const collapsed = acc.classList.toggle('collapsed');
    if (collapsed) collapsedAccords.add(list.masterKey);
    else collapsedAccords.delete(list.masterKey);
  });

  const accItems = document.createElement('div');
  accItems.className = 'accordion-items';

  for (const child of list.children) {
    accItems.appendChild(makeChildRow(root, child, settings, masterEnabled));
  }

  acc.appendChild(accHead);
  acc.appendChild(accItems);
  return acc;
}

function makeChildRow(
  root: HTMLElement,
  child: { key: ToggleKey; label: string },
  settings: ZenSettings,
  masterEnabled: boolean
): HTMLElement {
  const row = document.createElement('label');
  row.className = 'row row--child';

  const rowLabel = document.createElement('span');
  rowLabel.className = 'row-label';
  rowLabel.textContent = child.label;

  const toggle = document.createElement('span');
  toggle.className = 'toggle';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.dataset.key = child.key;
  input.checked = settings[child.key];
  input.disabled = !masterEnabled;
  input.addEventListener('change', () => {
    chrome.storage.sync.set({ [child.key]: input.checked });
    const optimistic: ZenSettings = { ...settings, [child.key]: input.checked };
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
