import type { PopupSection } from '../sections';

export function makeStub(sectionLabel: string, icon = '✧'): PopupSection['render'] {
  return function renderStub(container: HTMLElement) {
    container.innerHTML = '';

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
    curr.textContent = sectionLabel;
    bc.appendChild(curr);
    container.appendChild(bc);

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
    link.href = 'https://github.com';
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
