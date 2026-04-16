import type { HideRule, ToggleKey } from '../shared/types';

export const HIDE_RULES: Record<ToggleKey, HideRule> = {
  shorts: {
    label: 'Shorts',
    group: 'feed',
    selectors: [
      'ytd-rich-shelf-renderer[is-shorts]',
      'ytd-reel-shelf-renderer',
      // Запись «Shorts» в сайдбаре (href отсутствует, идентифицируется по title)
      'ytd-guide-entry-renderer:has(a[title="Shorts"])',
    ],
  },
  playlists: {
    label: 'Плейлисты',
    group: 'sidebar',
    selectors: [
      // /feed/playlists — запись внутри раздела «ВЫ» (ytd-guide-collapsible-section-entry-renderer);
      // таргетируем конкретный ytd-guide-entry-renderer, а не всю секцию
      'ytd-guide-entry-renderer:has(a[href="/feed/playlists"])',
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
      // /feed/channels не существует в DOM; секция подписок содержит ссылку /feed/subscriptions
      // как первую запись, за которой следуют индивидуальные каналы — подтверждено Claude-in-Chrome
      'ytd-guide-section-renderer:has(ytd-guide-entry-renderer a[href="/feed/subscriptions"])',
    ],
  },
  navigator: {
    label: 'Навигатор',
    group: 'sidebar',
    selectors: [
      // :first-child скрывал секцию главной навигации; секция «Навигатор»
      // (Музыка/Фильмы/Видеоигры) идентифицируется по ссылке /gaming — подтверждено DOM
      'ytd-guide-section-renderer:has(ytd-guide-entry-renderer a[href="/gaming"])',
      'ytd-mini-guide-renderer',
    ],
  },
  explore: {
    label: 'Другие возможности',
    group: 'sidebar',
    selectors: [
      // #header не существует; секция «Другие возможности» содержит ссылку /premium
      'ytd-guide-section-renderer:has(ytd-guide-entry-renderer a[href="/premium"])',
    ],
  },
  reportButton: {
    label: 'Кнопка жалобы',
    group: 'sidebar',
    selectors: [
      // Скрываем запись «Жалобы» в сайдбаре (/reporthistory), подтверждено DOM-инспекцией
      'ytd-guide-entry-renderer:has(a[href="/reporthistory"])',
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
  actionPanel: {
    label: 'Панель действий',
    group: 'video',
    selectors: [
      // Хедер — голосовой поиск, кнопка «Создать», уведомления
      'ytd-masthead #voice-search-button',
      'ytd-masthead ytd-button-renderer:has(button[aria-label="Создать"])',
      'ytd-notification-topbar-button-renderer',
      // Под видео — Share (прямой потомок #top-level-buttons-computed)
      '#top-level-buttons-computed > yt-button-view-model',
      // Под видео — Сохранить + Создать клип + Скачать
      'ytd-watch-metadata #flexible-item-buttons',
      // Под видео — кнопка «⋯» (ещё)
      'ytd-watch-metadata ytd-menu-renderer > yt-icon-button#button',
      'ytd-watch-metadata ytd-menu-renderer > yt-button-shape',
      // Вкладки рекомендаций «Все видео / Автор / Похожий контент»
      'ytd-watch-flexy iron-selector#chips',
      // Кнопка экранной клавиатуры в поле поиска
      'ytd-text-input-assistant',
    ],
  },
  fixUblock: {
    label: 'Фикс uBlock',
    group: 'feed',
    selectors: [
      // CSS-фолбэк: прямое скрытие известных ad-врапперов до того, как uBlock
      // успеет их удалить. Если uBlock вырезает их из DOM — пустой контейнер
      // скрывает IntersectionObserver в ublock-cleaner.ts (JS).
      'ytd-ad-slot-renderer',
      'ytd-in-feed-ad-layout-renderer',
      '#masthead-ad',
      'ytd-display-ad-renderer',
      'ytd-banner-promo-renderer',
      // In-feed реклама, ещё содержащая маркер :has() — на случай когда uBlock
      // не отработал (например, отключён или медленно стартовал).
      'ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer)',
      'ytd-rich-section-renderer:has(ytd-in-feed-ad-layout-renderer)',
    ],
  },
};
