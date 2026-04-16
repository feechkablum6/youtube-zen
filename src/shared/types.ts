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
}

export type SettingsKey = keyof ZenSettings;
export type ToggleKey = Exclude<SettingsKey, 'enabled'>;

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
