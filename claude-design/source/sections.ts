import type { ZenSettings } from '../shared/types';
import { onCleanerStoragePatch, renderCleaner } from './sections/cleaner';
import { renderFilters } from './sections/filters';
import { renderSettings } from './sections/settings';
import { makeStub } from './sections/stub';

type StorageChanges = Record<string, chrome.storage.StorageChange>;

export interface PopupSection {
  id: string;
  label: string;
  icon: string;
  position: 'top' | 'bottom';
  render(container: HTMLElement, settings: ZenSettings): void;
  /**
   * Optional: patch DOM in place in response to storage changes,
   * avoiding a full re-render. Called only when enabled/activeSection
   * didn't change (so no structural change is required).
   */
  onStoragePatch?(
    container: HTMLElement,
    settings: ZenSettings,
    changes: StorageChanges
  ): void;
}

export const SECTIONS: PopupSection[] = [
  { id: 'cleaner',  label: 'Очистка UI',    icon: '✦', position: 'top',    render: renderCleaner, onStoragePatch: onCleanerStoragePatch },
  { id: 'filters',  label: 'Фильтры ленты', icon: '◎', position: 'top',    render: renderFilters },
  { id: 'tools',    label: 'Инструменты',   icon: '▶', position: 'top',    render: makeStub('Инструменты', '▶') },
  { id: 'themes',   label: 'Темы',          icon: '◐', position: 'top',    render: makeStub('Темы', '◐') },
  { id: 'settings', label: 'Настройки',     icon: '⚙', position: 'bottom', render: renderSettings },
];
