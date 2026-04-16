import type { HideRule, ToggleKey } from '../shared/types';

export const HIDE_RULES: Record<ToggleKey, HideRule> = {
  shorts: {
    label: 'Shorts',
    group: 'feed',
    selectors: [
      'ytd-rich-shelf-renderer[is-shorts]',
      'ytd-reel-shelf-renderer',
    ],
  },
  playlists: {
    label: 'Плейлисты',
    group: 'sidebar',
    selectors: [
      'ytd-guide-section-renderer:has(> #header a[href="/feed/playlists"])',
      'ytd-mini-guide-entry-renderer:has(a[href="/feed/playlists"])',
    ],
  },
  liked: {
    label: 'Понравившиеся',
    group: 'sidebar',
    selectors: [
      'ytd-guide-entry-renderer:has(a[href="/playlist?list=LL"])',
      'ytd-mini-guide-entry-renderer:has(a[href="/playlist?list=LL"])',
    ],
  },
  yourVideos: {
    label: 'Ваши видео',
    group: 'sidebar',
    selectors: [
      'ytd-guide-entry-renderer:has(a[href*="/videos"])',
    ],
  },
  downloads: {
    label: 'Скачанные',
    group: 'sidebar',
    selectors: [
      'ytd-guide-entry-renderer:has(a[href="/feed/downloads"])',
    ],
  },
  subscriptions: {
    label: 'Подписки (список)',
    group: 'sidebar',
    selectors: [
      'ytd-guide-section-renderer:has(> #header a[href="/feed/channels"])',
    ],
  },
  navigator: {
    label: 'Навигатор',
    group: 'sidebar',
    selectors: [
      'ytd-guide-section-renderer:first-child',
      'ytd-mini-guide-renderer',
    ],
  },
  explore: {
    label: 'Другие возможности',
    group: 'sidebar',
    selectors: [
      'ytd-guide-section-renderer:has(> #header a[href="https://www.youtube.com/premium"])',
    ],
  },
  reportButton: {
    label: 'Кнопка жалобы',
    group: 'video',
    selectors: [
      'ytd-menu-service-item-renderer:has(path[d*="M13.18"])',
      'tp-yt-paper-item:has(yt-icon.report-icon)',
    ],
  },
  footer: {
    label: 'Футер',
    group: 'footer',
    selectors: [
      '#footer',
      'ytd-guide-renderer #footer',
    ],
  },
};
