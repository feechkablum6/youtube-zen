import type { HideRule, SidebarList, ToggleKey } from '../shared/types';

// HIDE_RULES теперь содержит только плоские (не-вложенные) правила. Ключи,
// которые раньше были здесь (navigator, explore, playlists, liked, yourVideos,
// downloads) переехали в SIDEBAR_LISTS и рендерятся popup'ом как вложенные
// аккордеоны. Тип остался ToggleKey, но Partial — потому что не каждого
// ToggleKey обязательно есть запись в плоском реестре.
export const HIDE_RULES: Partial<Record<ToggleKey, HideRule>> = {
  shorts: {
    label: 'Shorts',
    group: 'feed',
    selectors: [
      // Старая раскладка — dedicated shelf с атрибутом is-shorts
      'ytd-rich-shelf-renderer[is-shorts]',
      'ytd-reel-shelf-renderer',
      // Новая раскладка (A/B, подтверждено Claude-in-Chrome 2026-04-17): Shorts
      // едут как индивидуальные плитки в общей ленте с ytm-shorts-lockup-view-model-v2
      // внутри, без атрибута is-shorts. Плюс новый shelf-вариант того же контейнера.
      'ytd-rich-item-renderer:has(ytm-shorts-lockup-view-model-v2)',
      'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
      'ytd-rich-section-renderer:has(ytm-shorts-lockup-view-model-v2)',
      'ytd-rich-section-renderer:has(ytd-reel-shelf-renderer)',
      'ytd-rich-shelf-renderer:has(ytm-shorts-lockup-view-model-v2)',
      // Запись «Shorts» в сайдбаре (href отсутствует, идентифицируется по title)
      'ytd-guide-entry-renderer:has(a[title="Shorts"])',
    ],
  },
  home: {
    label: 'Кнопка «Главная»',
    group: 'sidebar',
    selectors: [
      // Запись «Главная» в сайдбаре — единственная со ссылкой href="/"
      // (подтверждено DOM-инспекцией). YouTube-логотип всё равно ведёт на главную.
      'ytd-guide-entry-renderer:has(a[href="/"])',
      'ytd-mini-guide-entry-renderer:has(a[href="/"])',
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

// Вложенные списки сайдбара. Семантика рендера CSS — в css-injector.ts:
//   - master OFF → ничего из списка не скрывается
//   - master ON + все дети ON → sectionSelectors (целиком вся секция)
//   - master ON + частично → selectors только включённых детей
//   - master ON + ни одного ребёнка → ничего
// Селекторы подтверждены живым DOM, каждый матчит ровно 1 элемент.
export const SIDEBAR_LISTS: SidebarList[] = [
  {
    masterKey: 'youList',
    label: 'Вы',
    sectionSelectors: [
      'ytd-guide-section-renderer:has(a[href="/feed/you"])',
    ],
    children: [
      {
        key: 'youMyChannel',
        label: 'Мой канал',
        selectors: [
          'ytd-guide-section-renderer:has(a[href="/feed/you"]) ytd-guide-entry-renderer:has(a[href^="/@"])',
        ],
      },
      {
        key: 'youHistory',
        label: 'История',
        selectors: [
          'ytd-guide-entry-renderer:has(a[href="/feed/history"])',
        ],
      },
      {
        key: 'playlists',
        label: 'Плейлисты',
        selectors: [
          // /feed/playlists — запись внутри раздела «ВЫ» (ytd-guide-collapsible-section-entry-renderer);
          // таргетируем конкретный ytd-guide-entry-renderer, а не всю секцию
          'ytd-guide-entry-renderer:has(a[href="/feed/playlists"])',
        ],
      },
      {
        key: 'youWatchLater',
        label: 'Смотреть позже',
        selectors: [
          'ytd-guide-entry-renderer:has(a[href="/playlist?list=WL"])',
        ],
      },
      {
        key: 'liked',
        label: 'Понравившиеся',
        selectors: [
          'ytd-guide-entry-renderer:has(a[href="/playlist?list=LL"])',
          'ytd-mini-guide-entry-renderer:has(a[href="/playlist?list=LL"])',
        ],
      },
      {
        key: 'yourVideos',
        label: 'Ваши видео',
        selectors: [
          'ytd-guide-entry-renderer:has(a[href*="/videos"])',
        ],
      },
      {
        key: 'downloads',
        label: 'Скачанные',
        selectors: [
          'ytd-guide-entry-renderer:has(a[href="/feed/downloads"])',
        ],
      },
    ],
  },
  {
    masterKey: 'navigator',
    label: 'Навигатор',
    sectionSelectors: [
      // :first-child скрывал секцию главной навигации; секция «Навигатор»
      // (Музыка/Фильмы/Трансляции) идентифицируется по ссылке «Фильмы» (/feed/storefront).
      // YouTube заменил пункт «Видеоигры» (/gaming) на «Фильмы» — оставляем /gaming как A/B fallback.
      'ytd-guide-section-renderer:has(ytd-guide-entry-renderer a[href^="/feed/storefront"])',
      'ytd-guide-section-renderer:has(ytd-guide-entry-renderer a[href="/gaming"])',
    ],
    children: [
      {
        key: 'navMusic',
        label: 'Музыка',
        selectors: [
          'ytd-guide-entry-renderer:has(a[href="/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ"])',
        ],
      },
      {
        key: 'navFilms',
        label: 'Фильмы',
        selectors: [
          'ytd-guide-entry-renderer:has(a[href^="/feed/storefront"])',
        ],
      },
      {
        key: 'navLive',
        label: 'Трансляции',
        selectors: [
          'ytd-guide-entry-renderer:has(a[href="/channel/UC4R8DWoMoI7CAwX8_LjQHig"])',
        ],
      },
    ],
  },
  {
    masterKey: 'explore',
    label: 'Другие возможности',
    sectionSelectors: [
      // Секция «Другие возможности» (YouTube Music / YouTube Детям) идентифицируется
      // по внешней ссылке music.youtube.com. YouTube убрал из неё пункт Premium (/premium) —
      // оставляем /premium как fallback на случай A/B.
      'ytd-guide-section-renderer:has(ytd-guide-entry-renderer a[href^="https://music.youtube.com"])',
      'ytd-guide-section-renderer:has(ytd-guide-entry-renderer a[href="/premium"])',
    ],
    children: [
      {
        key: 'exploreMusic',
        label: 'YouTube Music',
        selectors: [
          'ytd-guide-entry-renderer:has(a[href^="https://music.youtube.com"])',
        ],
      },
      {
        key: 'exploreKids',
        label: 'YouTube Детям',
        selectors: [
          'ytd-guide-entry-renderer:has(a[href^="https://www.youtubekids.com"])',
        ],
      },
    ],
  },
];
