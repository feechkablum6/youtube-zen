import type { PopupSection } from '../sections';
import { makeBreadcrumb } from './breadcrumb';

export function makeStub(sectionLabel: string, icon = '✧'): PopupSection['render'] {
  return function renderStub(container: HTMLElement) {
    container.innerHTML = '';

    container.appendChild(makeBreadcrumb(sectionLabel));

    const wrapper = document.createElement('div');
    wrapper.className = 'stub';

    const iconEl = document.createElement('span');
    iconEl.className = 'stub-icon';
    iconEl.textContent = icon;

    const title = document.createElement('div');
    title.className = 'stub-title';
    title.textContent = sectionLabel;

    const body = document.createElement('div');
    body.className = 'stub-body';
    body.textContent = 'Скоро. Следите за релизами.';

    const link = document.createElement('a');
    link.className = 'stub-link';
    link.href = 'https://github.com/feechkablum6/youtube-zen';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'github →';

    wrapper.appendChild(iconEl);
    wrapper.appendChild(title);
    wrapper.appendChild(body);
    wrapper.appendChild(link);
    container.appendChild(wrapper);
  };
}
