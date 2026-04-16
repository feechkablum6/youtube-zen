import type { PopupSection } from '../sections';

export function makeStub(sectionLabel: string): PopupSection['render'] {
  return function renderStub(container: HTMLElement) {
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'stub';

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

    wrapper.appendChild(title);
    wrapper.appendChild(body);
    wrapper.appendChild(link);
    container.appendChild(wrapper);
  };
}
