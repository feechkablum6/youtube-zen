import { getSettings, setSetting, subscribeSettings } from './storage';
import { SECTIONS, type PopupSection } from './sections';
import { resolveActiveSection } from './utils';
import type { ZenSettings } from '../shared/types';

function findSection(id: string): PopupSection {
  return SECTIONS.find((s) => s.id === id) ?? SECTIONS[0];
}

function renderRail(
  railEl: HTMLElement,
  activeId: string,
  onSelect: (id: string) => void
): void {
  railEl.innerHTML = '';

  const top = SECTIONS.filter((s) => s.position === 'top');
  const bottom = SECTIONS.filter((s) => s.position === 'bottom');

  const appendBtns = (sections: PopupSection[]) => {
    for (const s of sections) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rail-btn' + (s.id === activeId ? ' active' : '');
      btn.textContent = s.icon;
      btn.title = s.label;
      btn.setAttribute('aria-label', s.label);
      btn.addEventListener('click', () => onSelect(s.id));
      railEl.appendChild(btn);
    }
  };

  appendBtns(top);

  const spacer = document.createElement('div');
  spacer.className = 'rail-spacer';
  railEl.appendChild(spacer);

  appendBtns(bottom);
}

function renderContent(
  contentEl: HTMLElement,
  activeId: string,
  settings: ZenSettings
): void {
  const section = findSection(activeId);
  // Restart CSS fade-in animation
  contentEl.style.animation = 'none';
  // Force reflow to commit the animation reset
  void contentEl.offsetHeight;
  contentEl.style.animation = '';
  section.render(contentEl, settings);
}

function applyDisabledState(bodyEl: HTMLElement, enabled: boolean): void {
  bodyEl.classList.toggle('disabled', !enabled);
}

async function init(): Promise<void> {
  const masterInput = document.querySelector<HTMLInputElement>('#master');
  const railEl = document.querySelector<HTMLElement>('#rail');
  const contentEl = document.querySelector<HTMLElement>('#content');
  const bodyEl = document.querySelector<HTMLElement>('.popup-body');

  if (!masterInput || !railEl || !contentEl || !bodyEl) return;

  let settings = await getSettings();
  const knownIds = SECTIONS.map((s) => s.id);
  let activeId = resolveActiveSection(settings.activeSection, knownIds);

  masterInput.checked = settings.enabled;
  applyDisabledState(bodyEl, settings.enabled);
  renderRail(railEl, activeId, handleSelect);
  renderContent(contentEl, activeId, settings);

  masterInput.addEventListener('change', () => {
    void setSetting('enabled', masterInput.checked);
  });

  subscribeSettings((changes) => {
    void getSettings().then((latest) => {
      settings = latest;

      if ('enabled' in changes) {
        masterInput.checked = settings.enabled;
        applyDisabledState(bodyEl, settings.enabled);
      }

      if ('activeSection' in changes) {
        const next = resolveActiveSection(settings.activeSection, knownIds);
        if (next !== activeId) {
          activeId = next;
          renderRail(railEl, activeId, handleSelect);
        }
      }

      renderContent(contentEl, activeId, settings);
    });
  });

  function handleSelect(id: string): void {
    if (id === activeId) return;
    activeId = id;
    void setSetting('activeSection', id);
    renderRail(railEl!, activeId, handleSelect);
    renderContent(contentEl!, activeId, settings);
  }
}

document.addEventListener('DOMContentLoaded', init);
