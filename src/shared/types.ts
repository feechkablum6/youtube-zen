export type UploadDateOpt =
  | 'any' | 'hour' | 'today' | 'week' | 'month' | 'year';

export type DurationOpt =
  | 'any' | 'short' | 'medium' | 'long';

export type SortOpt =
  | 'relevance' | 'date' | 'views' | 'rating';

export type TypeOpt =
  | 'any' | 'video' | 'channel' | 'playlist' | 'movie';

export interface SearchFilters {
  uploadDate: UploadDateOpt;
  duration: DurationOpt;
  sort: SortOpt;
  type: TypeOpt;
}

export interface ZenSettings {
  enabled: boolean;
  shorts: boolean;
  home: boolean;
  playlists: boolean;
  liked: boolean;
  yourVideos: boolean;
  downloads: boolean;
  subscriptions: boolean;
  navigator: boolean;
  explore: boolean;
  reportButton: boolean;
  footer: boolean;
  fixUblock: boolean;
  actionPanel: boolean;
  headerMenuButton: boolean;
  youList: boolean;
  youMyChannel: boolean;
  youHistory: boolean;
  youWatchLater: boolean;
  navMusic: boolean;
  navFilms: boolean;
  navLive: boolean;
  exploreMusic: boolean;
  exploreKids: boolean;
  activeSection: string;
  filterWatchedEnabled: boolean;
  filterWatchedThreshold: number;
  filterSearchUploadDate: UploadDateOpt;
  filterSearchDuration: DurationOpt;
  filterSearchSort: SortOpt;
  filterSearchType: TypeOpt;
}

export type SettingsKey = keyof ZenSettings;
export type ToggleKey = Exclude<
  SettingsKey,
  | 'enabled'
  | 'activeSection'
  | 'filterWatchedEnabled'
  | 'filterWatchedThreshold'
  | 'filterSearchUploadDate'
  | 'filterSearchDuration'
  | 'filterSearchSort'
  | 'filterSearchType'
>;

export interface HideRule {
  label: string;
  group: 'feed' | 'sidebar' | 'video' | 'footer' | 'header';
  selectors: string[];
}

export interface SidebarChild {
  key: ToggleKey;
  label: string;
  selectors: string[];
}

export interface SidebarList {
  masterKey: ToggleKey;
  label: string;
  sectionSelectors: string[];
  children: SidebarChild[];
}

export const GROUP_LABELS: Record<HideRule['group'], string> = {
  header: 'Хедер',
  feed: 'Лента',
  sidebar: 'Сайдбар',
  video: 'Страница видео',
  footer: 'Подвал',
};
