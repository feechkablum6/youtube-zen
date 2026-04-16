import { DEFAULT_SETTINGS } from '../../shared/defaults';
import type { PopupSection } from '../sections';

export const renderSettings: PopupSection['render'] = function (container) {
  container.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'section-head';
  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Настройки';
  head.appendChild(title);
  container.appendChild(head);

  // Reset button
  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn btn-secondary';
  resetBtn.type = 'button';
  resetBtn.textContent = 'Сбросить к дефолтам';
  resetBtn.addEventListener('click', () => {
    chrome.storage.sync.set(DEFAULT_SETTINGS as unknown as Record<string, unknown>);
  });
  container.appendChild(resetBtn);

  // About block
  const about = document.createElement('div');
  about.className = 'about';

  const version = document.createElement('div');
  version.className = 'about-line';
  const versionString = chrome.runtime?.getManifest?.().version ?? '—';
  version.textContent = `Версия ${versionString}`;

  const link = document.createElement('a');
  link.className = 'about-link';
  link.href = 'https://github.com';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'github';

  about.appendChild(version);
  about.appendChild(link);
  container.appendChild(about);
};
