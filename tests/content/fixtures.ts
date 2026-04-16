export type ProgressSpec = number | null | 'invalid' | 'missing-style';

function buildProgressOverlay(spec: ProgressSpec): HTMLElement | null {
  if (spec === null) return null;
  const overlay = document.createElement('ytd-thumbnail-overlay-resume-playback-renderer');
  const progress = document.createElement('div');
  progress.id = 'progress';
  if (spec === 'invalid') {
    progress.setAttribute('style', 'width: auto');
  } else if (spec === 'missing-style') {
    // no style attr at all
  } else {
    progress.setAttribute('style', `width: ${spec}%`);
  }
  overlay.appendChild(progress);
  return overlay;
}

function buildCard(tag: string, progress: ProgressSpec): HTMLElement {
  const card = document.createElement(tag);
  const thumb = document.createElement('ytd-thumbnail');
  const overlay = buildProgressOverlay(progress);
  if (overlay) thumb.appendChild(overlay);
  card.appendChild(thumb);
  return card;
}

export function homeCard(progress: ProgressSpec = null): HTMLElement {
  return buildCard('ytd-rich-item-renderer', progress);
}

export function searchCard(progress: ProgressSpec = null): HTMLElement {
  return buildCard('ytd-video-renderer', progress);
}

export function lockupCard(progress: ProgressSpec = null): HTMLElement {
  return buildCard('yt-lockup-view-model', progress);
}
