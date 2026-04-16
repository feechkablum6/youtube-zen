export type ProgressSpec = number | null | 'invalid' | 'missing-style';
export type ProgressLayout = 'legacy' | 'material';

function buildLegacyOverlay(spec: ProgressSpec): HTMLElement | null {
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

function buildMaterialOverlay(spec: ProgressSpec): HTMLElement | null {
  if (spec === null) return null;
  const host = document.createElement('yt-thumbnail-overlay-progress-bar-view-model');
  host.className =
    'ytThumbnailOverlayProgressBarHost ytThumbnailOverlayProgressBarHostLarge';
  const bar = document.createElement('div');
  bar.className =
    'ytThumbnailOverlayProgressBarHostWatchedProgressBar ytThumbnailOverlayProgressBarHostUseLegacyBar';
  const segment = document.createElement('div');
  segment.className = 'ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment';
  if (spec === 'invalid') {
    segment.setAttribute('style', 'width: auto');
  } else if (spec === 'missing-style') {
    // no style attr at all
  } else {
    segment.setAttribute('style', `width: ${spec}%`);
  }
  bar.appendChild(segment);
  host.appendChild(bar);
  return host;
}

function buildCard(
  tag: string,
  progress: ProgressSpec,
  layout: ProgressLayout
): HTMLElement {
  const card = document.createElement(tag);
  const thumb = document.createElement('ytd-thumbnail');
  const overlay =
    layout === 'material'
      ? buildMaterialOverlay(progress)
      : buildLegacyOverlay(progress);
  if (overlay) thumb.appendChild(overlay);
  card.appendChild(thumb);
  return card;
}

export function homeCard(
  progress: ProgressSpec = null,
  layout: ProgressLayout = 'material'
): HTMLElement {
  return buildCard('ytd-rich-item-renderer', progress, layout);
}

export function searchCard(
  progress: ProgressSpec = null,
  layout: ProgressLayout = 'legacy'
): HTMLElement {
  return buildCard('ytd-video-renderer', progress, layout);
}

export function lockupCard(
  progress: ProgressSpec = null,
  layout: ProgressLayout = 'material'
): HTMLElement {
  return buildCard('yt-lockup-view-model', progress, layout);
}
