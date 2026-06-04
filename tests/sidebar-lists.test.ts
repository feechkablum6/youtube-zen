import { describe, expect, it } from 'vitest';

import { HIDE_RULES, SIDEBAR_LISTS } from '../src/content/selectors';
import type { ToggleKey } from '../src/shared/types';

describe('SIDEBAR_LISTS', () => {
  it('exports exactly 3 sidebar lists', () => {
    expect(SIDEBAR_LISTS).toHaveLength(3);
  });

  it('has master key + non-empty children for every list', () => {
    for (const list of SIDEBAR_LISTS) {
      expect(typeof list.masterKey, 'masterKey must be string').toBe('string');
      expect(list.masterKey.length).toBeGreaterThan(0);
      expect(list.label.length).toBeGreaterThan(0);
      expect(list.children.length).toBeGreaterThan(0);
      expect(list.sectionSelectors.length).toBeGreaterThan(0);
    }
  });

  it('has unique master keys and unique child keys across all lists', () => {
    const masterKeys = SIDEBAR_LISTS.map((l) => l.masterKey);
    const childKeys = SIDEBAR_LISTS.flatMap((l) => l.children.map((c) => c.key));
    expect(new Set(masterKeys).size, 'duplicate master keys').toBe(masterKeys.length);
    expect(new Set(childKeys).size, 'duplicate child keys').toBe(childKeys.length);
  });

  it('«Вы» list uses youList as master', () => {
    const you = SIDEBAR_LISTS.find((l) => l.label === 'Вы');
    expect(you).toBeDefined();
    expect(you!.masterKey).toBe('youList');
  });

  it('«Вы» list has 7 children in spec order: myChannel, history, playlists, watchLater, liked, yourVideos, downloads', () => {
    const you = SIDEBAR_LISTS.find((l) => l.label === 'Вы')!;
    expect(you.children.map((c) => c.key)).toEqual([
      'youMyChannel',
      'youHistory',
      'playlists',
      'youWatchLater',
      'liked',
      'yourVideos',
      'downloads',
    ]);
  });

  it('«Навигатор» list uses navigator as master and has 3 children: music, films, live', () => {
    const nav = SIDEBAR_LISTS.find((l) => l.label === 'Навигатор');
    expect(nav).toBeDefined();
    expect(nav!.masterKey).toBe('navigator');
    expect(nav!.children.map((c) => c.key)).toEqual(['navMusic', 'navFilms', 'navLive']);
  });

  it('«Другие возможности» list uses explore as master and has 2 children: music, kids', () => {
    const ex = SIDEBAR_LISTS.find((l) => l.label === 'Другие возможности');
    expect(ex).toBeDefined();
    expect(ex!.masterKey).toBe('explore');
    expect(ex!.children.map((c) => c.key)).toEqual(['exploreMusic', 'exploreKids']);
  });

  it('«Вы» section selectors target /feed/you section', () => {
    const you = SIDEBAR_LISTS.find((l) => l.label === 'Вы')!;
    expect(
      you.sectionSelectors.some(
        (s) => s.includes('ytd-guide-section-renderer') && s.includes('/feed/you')
      )
    ).toBe(true);
  });

  it('«Навигатор» section selectors include /feed/storefront and /gaming fallbacks', () => {
    const nav = SIDEBAR_LISTS.find((l) => l.label === 'Навигатор')!;
    expect(
      nav.sectionSelectors.some(
        (s) => s.includes('ytd-guide-section-renderer') && s.includes('/feed/storefront')
      )
    ).toBe(true);
    expect(
      nav.sectionSelectors.some(
        (s) => s.includes('ytd-guide-section-renderer') && s.includes('/gaming')
      )
    ).toBe(true);
  });

  it('«Другие возможности» section selectors include music.youtube.com and /premium fallbacks', () => {
    const ex = SIDEBAR_LISTS.find((l) => l.label === 'Другие возможности')!;
    expect(
      ex.sectionSelectors.some(
        (s) => s.includes('ytd-guide-section-renderer') && s.includes('https://music.youtube.com')
      )
    ).toBe(true);
    expect(
      ex.sectionSelectors.some(
        (s) => s.includes('ytd-guide-section-renderer') && s.includes('/premium')
      )
    ).toBe(true);
  });

  it('every child has a non-empty label and a non-empty selectors array', () => {
    for (const list of SIDEBAR_LISTS) {
      for (const child of list.children) {
        expect(child.label.length, `${list.masterKey} → ${child.key} label`).toBeGreaterThan(0);
        expect(child.selectors.length, `${list.masterKey} → ${child.key} selectors`).toBeGreaterThan(0);
      }
    }
  });

  it('«Вы» playlists child uses the /feed/playlists selector (reuses the existing key)', () => {
    const you = SIDEBAR_LISTS.find((l) => l.label === 'Вы')!;
    const playlists = you.children.find((c) => c.key === 'playlists')!;
    expect(playlists.label).toBe('Плейлисты');
    expect(
      playlists.selectors.some(
        (s) => s.includes('ytd-guide-entry-renderer') && s.includes('/feed/playlists')
      )
    ).toBe(true);
  });

  it('«Вы» liked child covers /playlist?list=LL in both guide and mini-guide', () => {
    const you = SIDEBAR_LISTS.find((l) => l.label === 'Вы')!;
    const liked = you.children.find((c) => c.key === 'liked')!;
    expect(liked.label).toBe('Понравившиеся');
    expect(
      liked.selectors.some(
        (s) => s.includes('ytd-guide-entry-renderer') && s.includes('/playlist?list=LL')
      )
    ).toBe(true);
    expect(
      liked.selectors.some(
        (s) => s.includes('ytd-mini-guide-entry-renderer') && s.includes('/playlist?list=LL')
      )
    ).toBe(true);
  });
});

describe('HIDE_RULES — после рефакторинга', () => {
  it('больше не содержит плоских записей для вложенных списков', () => {
    const removed: ToggleKey[] = [
      'navigator',
      'explore',
      'playlists',
      'liked',
      'yourVideos',
      'downloads',
    ];
    for (const k of removed) {
      expect(HIDE_RULES, `${k} должна быть убрана из HIDE_RULES`).not.toHaveProperty(k);
    }
  });

  it('оставшиеся плоские правила — sidebar: subscriptions, reportButton', () => {
    expect(HIDE_RULES).toHaveProperty('subscriptions');
    expect(HIDE_RULES).toHaveProperty('reportButton');
  });

  it('оставшиеся плоские правила — feed: shorts, fixUblock', () => {
    expect(HIDE_RULES).toHaveProperty('shorts');
    expect(HIDE_RULES).toHaveProperty('fixUblock');
  });

  it('оставшиеся плоские правила — video: actionPanel, footer: footer', () => {
    expect(HIDE_RULES).toHaveProperty('actionPanel');
    expect(HIDE_RULES).toHaveProperty('footer');
  });
});
