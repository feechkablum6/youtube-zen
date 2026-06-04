import { describe, expect, it } from 'vitest';

import { buildCss } from '../src/content/css-injector';
import { DEFAULT_SETTINGS } from '../src/shared/defaults';
import type { ZenSettings } from '../src/shared/types';

const ALL_OFF: ZenSettings = {
  ...DEFAULT_SETTINGS,
  enabled: true,
  // Плоские тумблеры
  shorts: false,
  subscriptions: false,
  reportButton: false,
  footer: false,
  fixUblock: false,
  actionPanel: false,
  // Master-ключи вложенных списков
  navigator: false,
  explore: false,
  youList: false,
  // Под-тумблеры
  youMyChannel: false,
  youHistory: false,
  youWatchLater: false,
  playlists: false,
  liked: false,
  yourVideos: false,
  downloads: false,
  navMusic: false,
  navFilms: false,
  navLive: false,
  exploreMusic: false,
  exploreKids: false,
};

describe('buildCss — семантика вложенных списков сайдбара', () => {
  describe('Список «Навигатор» (navigator / navMusic / navFilms / navLive)', () => {
    it('master ВЫКЛ → ни один селектор «Навигатора» не в выводе', () => {
      const settings: ZenSettings = {
        ...ALL_OFF,
        navigator: false,
        navMusic: true,
        navFilms: true,
        navLive: true,
      };
      const css = buildCss(settings);
      expect(css).not.toContain('/feed/storefront');
      expect(css).not.toContain('/gaming');
      expect(css).not.toContain('UC-9-kyTW8ZkZNDHQJ6FgpwQ');
      expect(css).not.toContain('UC4R8DWoMoI7CAwX8_LjQHig');
      expect(css).not.toContain('ytd-mini-guide-renderer');
    });

    it('master ВКЛ + только navMusic ВКЛ → есть селектор Музыки, НЕТ sectionSelectors «Навигатора»', () => {
      const settings: ZenSettings = {
        ...ALL_OFF,
        navigator: true,
        navMusic: true,
        navFilms: false,
        navLive: false,
      };
      const css = buildCss(settings);
      // Селектор музыки присутствует
      expect(
        css.includes('UC-9-kyTW8ZkZNDHQJ6FgpwQ') ||
          css.includes('ytd-guide-entry-renderer:has(a[href=\"/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ\"])')
      ).toBe(true);
      // Section-селекторов нет (только /feed/storefront от master+child, не section)
      // Но селектор Музыки — это ytd-guide-entry-renderer, а не ytd-guide-section-renderer.
      // Section селекторы содержат /feed/storefront как префикс внутри ytd-guide-section-renderer.
      const hasStorefront = css.includes('/feed/storefront');
      const hasGaming = css.includes('/gaming');
      const hasFilmsEntry = css.includes('ytd-guide-entry-renderer:has(a[href^=\"/feed/storefront\"])');
      const hasLiveEntry = css.includes('UC4R8DWoMoI7CAwX8_LjQHig');
      expect(hasFilmsEntry).toBe(false);
      expect(hasLiveEntry).toBe(false);
      // /feed/storefront встречается ТОЛЬКО в section-селекторах, и они не должны быть в CSS
      expect(hasStorefront).toBe(false);
      expect(hasGaming).toBe(false);
    });

    it('master ВКЛ + navMusic/navFilms/navLive ВСЕ ВКЛ → есть sectionSelectors «Навигатора», НЕТ отдельных селекторов пунктов', () => {
      const settings: ZenSettings = {
        ...ALL_OFF,
        navigator: true,
        navMusic: true,
        navFilms: true,
        navLive: true,
      };
      const css = buildCss(settings);
      // Section-селектор присутствует
      expect(css).toContain('ytd-guide-section-renderer:has(ytd-guide-entry-renderer a[href^=\"/feed/storefront\"])');
      // Отдельных entry-селекторов пунктов НЕТ
      expect(css).not.toContain('UC-9-kyTW8ZkZNDHQJ6FgpwQ');
      expect(css).not.toContain('UC4R8DWoMoI7CAwX8_LjQHig');
      // ytd-mini-guide-renderer не появляется (он был в старом плоском «navigator», но не должен быть в новой семантике)
      expect(css).not.toContain('ytd-mini-guide-renderer');
    });
  });

  describe('Список «Другие возможности» (explore / exploreMusic / exploreKids)', () => {
    it('master ВКЛ + только exploreMusic ВКЛ → есть селектор YT Music, НЕТ sectionSelectors', () => {
      const settings: ZenSettings = {
        ...ALL_OFF,
        explore: true,
        exploreMusic: true,
        exploreKids: false,
      };
      const css = buildCss(settings);
      expect(
        css.includes('ytd-guide-entry-renderer:has(a[href^=\"https://music.youtube.com\"])')
      ).toBe(true);
      expect(css).not.toContain('/premium');
      // Не должно быть section-renderer
      expect(css).not.toContain('ytd-guide-section-renderer:has(ytd-guide-entry-renderer a[href^=\"https://music.youtube.com\"])');
    });

    it('master ВКЛ + exploreMusic + exploreKids ВКЛ → sectionSelectors присутствуют, отдельных нет', () => {
      const settings: ZenSettings = {
        ...ALL_OFF,
        explore: true,
        exploreMusic: true,
        exploreKids: true,
      };
      const css = buildCss(settings);
      expect(css).toContain('ytd-guide-section-renderer:has(ytd-guide-entry-renderer a[href^=\"https://music.youtube.com\"])');
      expect(css).toContain('ytd-guide-section-renderer:has(ytd-guide-entry-renderer a[href=\"/premium\"])');
      expect(css).not.toContain('ytd-guide-entry-renderer:has(a[href^=\"https://music.youtube.com\"])');
      expect(css).not.toContain('youtubekids');
    });
  });

  describe('Список «Вы» (youList + 7 children)', () => {
    it('youList ВЫКЛ → ни «Вы»-пунктов, ни секции', () => {
      const settings: ZenSettings = {
        ...ALL_OFF,
        youList: false,
        // Все дети включены — но master off, поэтому ничего не должно скрыться
        youMyChannel: true,
        youHistory: true,
        youWatchLater: true,
        playlists: true,
        liked: true,
        yourVideos: true,
        downloads: true,
      };
      const css = buildCss(settings);
      expect(css).not.toContain('/feed/you');
      expect(css).not.toContain('/feed/history');
      expect(css).not.toContain('/feed/playlists');
      expect(css).not.toContain('/playlist?list=WL');
      expect(css).not.toContain('/playlist?list=LL');
      expect(css).not.toContain('/videos');
      expect(css).not.toContain('/feed/downloads');
    });

    it('youList ВКЛ, все 7 детей ВКЛ → есть sectionSelectors «Вы», нет отдельных пунктов', () => {
      const settings: ZenSettings = {
        ...ALL_OFF,
        youList: true,
        youMyChannel: true,
        youHistory: true,
        youWatchLater: true,
        playlists: true,
        liked: true,
        yourVideos: true,
        downloads: true,
      };
      const css = buildCss(settings);
      expect(css).toContain('ytd-guide-section-renderer:has(a[href=\"/feed/you\"])');
      // Отдельных entry-селекторов нет
      expect(css).not.toContain('ytd-guide-entry-renderer:has(a[href=\"/feed/history\"])');
      expect(css).not.toContain('ytd-guide-entry-renderer:has(a[href=\"/feed/playlists\"])');
      expect(css).not.toContain('ytd-guide-entry-renderer:has(a[href=\"/playlist?list=WL\"])');
      expect(css).not.toContain('ytd-guide-entry-renderer:has(a[href=\"/playlist?list=LL\"])');
      expect(css).not.toContain('ytd-guide-entry-renderer:has(a[href*=\"/videos\"])');
      expect(css).not.toContain('ytd-guide-entry-renderer:has(a[href=\"/feed/downloads\"])');
    });

    it('youList ВКЛ, частично → есть только включённые пункты, нет section', () => {
      const settings: ZenSettings = {
        ...ALL_OFF,
        youList: true,
        youMyChannel: false,
        youHistory: true,
        youWatchLater: false,
        playlists: true,
        liked: false,
        yourVideos: false,
        downloads: true,
      };
      const css = buildCss(settings);
      // Включённые пункты присутствуют
      expect(css).toContain('ytd-guide-entry-renderer:has(a[href=\"/feed/history\"])');
      expect(css).toContain('ytd-guide-entry-renderer:has(a[href=\"/feed/playlists\"])');
      expect(css).toContain('ytd-guide-entry-renderer:has(a[href=\"/feed/downloads\"])');
      // Выключенные — нет
      expect(css).not.toContain('ytd-guide-entry-renderer:has(a[href=\"/playlist?list=WL\"])');
      expect(css).not.toContain('ytd-guide-entry-renderer:has(a[href=\"/playlist?list=LL\"])');
      expect(css).not.toContain('ytd-guide-entry-renderer:has(a[href*=\"/videos\"])');
      // Section-селектор не появляется (не все дети включены)
      expect(css).not.toContain('ytd-guide-section-renderer:has(a[href=\"/feed/you\"])');
    });
  });

  describe('Анимация и инстант-хайд', () => {
    it('CSS содержит @keyframes yz-vanish, когда есть хотя бы один активный аккордеон', () => {
      const settings: ZenSettings = {
        ...ALL_OFF,
        navigator: true,
        navMusic: true,
      };
      const css = buildCss(settings);
      expect(css).toContain('@keyframes yz-vanish');
      expect(css).toMatch(/animation:\s*yz-vanish/);
    });

    it('CSS содержит html.yz-initial инстант-хайд override', () => {
      const settings: ZenSettings = {
        ...ALL_OFF,
        navigator: true,
        navMusic: true,
      };
      const css = buildCss(settings);
      expect(css).toContain('html.yz-initial');
      expect(css).toMatch(/animation-duration:\s*0s/);
    });
  });
});
