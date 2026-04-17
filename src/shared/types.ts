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
  group: 'feed' | 'sidebar' | 'video' | 'footer';
  selectors: string[];
}

export const GROUP_LABELS: Record<HideRule['group'], string> = {
  feed: 'Лента',
  sidebar: 'Сайдбар',
  video: 'Страница видео',
  footer: 'Подвал',
};
