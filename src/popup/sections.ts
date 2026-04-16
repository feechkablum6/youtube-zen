import type { ZenSettings } from '../shared/types';
import { renderSettings } from './sections/settings';
import { makeStub } from './sections/stub';

export interface PopupSection {
  id: string;
  label: string;
  icon: string;
  position: 'top' | 'bottom';
  render(container: HTMLElement, settings: ZenSettings): void;
}

// Placeholder — replaced by renderCleaner in Task 9
const noop: PopupSection['render'] = () => {};

export const SECTIONS: PopupSection[] = [
  { id: 'cleaner',  label: 'Очистка UI',    icon: '✦', position: 'top',    render: noop },
  { id: 'filters',  label: 'Фильтры ленты', icon: '◎', position: 'top',    render: makeStub('Фильтры ленты') },
  { id: 'tools',    label: 'Инструменты',   icon: '▶', position: 'top',    render: makeStub('Инструменты') },
  { id: 'themes',   label: 'Темы',          icon: '◐', position: 'top',    render: makeStub('Темы') },
  { id: 'settings', label: 'Настройки',     icon: '⚙', position: 'bottom', render: renderSettings },
];
