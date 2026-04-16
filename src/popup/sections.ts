import type { ZenSettings } from '../shared/types';

export interface PopupSection {
  id: string;
  label: string;
  icon: string;
  position: 'top' | 'bottom';
  render(container: HTMLElement, settings: ZenSettings): void;
}

// Placeholder — real render functions wired in Tasks 7-9
const noop: PopupSection['render'] = () => {};

export const SECTIONS: PopupSection[] = [
  { id: 'cleaner',  label: 'Очистка UI',    icon: '✦', position: 'top',    render: noop },
  { id: 'filters',  label: 'Фильтры ленты', icon: '◎', position: 'top',    render: noop },
  { id: 'tools',    label: 'Инструменты',   icon: '▶', position: 'top',    render: noop },
  { id: 'themes',   label: 'Темы',          icon: '◐', position: 'top',    render: noop },
  { id: 'settings', label: 'Настройки',     icon: '⚙', position: 'bottom', render: noop },
];
