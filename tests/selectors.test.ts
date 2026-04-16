import { describe, expect, it } from 'vitest';

import { HIDE_RULES } from '../src/content/selectors';
import type { HideRule, ToggleKey } from '../src/shared/types';

describe('HIDE_RULES', () => {
  const expectedKeys: ToggleKey[] = [
    'shorts',
    'playlists',
    'liked',
    'yourVideos',
    'downloads',
    'subscriptions',
    'navigator',
    'explore',
    'reportButton',
    'footer',
    'fixUblock',
    'actionPanel',
  ];

  it('has an entry for every ToggleKey', () => {
    for (const key of expectedKeys) {
      expect(HIDE_RULES).toHaveProperty(key);
    }
  });

  it('has no extra keys beyond ToggleKey', () => {
    expect(Object.keys(HIDE_RULES).sort()).toEqual([...expectedKeys].sort());
  });

  it('every rule has non-empty selectors array', () => {
    for (const [key, rule] of Object.entries(HIDE_RULES)) {
      expect(rule.selectors.length, `${key} has empty selectors`).toBeGreaterThan(0);
    }
  });

  it('every rule has a non-empty label', () => {
    for (const [key, rule] of Object.entries(HIDE_RULES)) {
      expect(rule.label.length, `${key} has empty label`).toBeGreaterThan(0);
    }
  });

  it('every rule has a valid group', () => {
    const validGroups = ['feed', 'sidebar', 'video', 'footer'];
    for (const [key, rule] of Object.entries(HIDE_RULES)) {
      expect(validGroups, `${key} has invalid group "${rule.group}"`).toContain(rule.group);
    }
  });

  it('every selector is a non-empty string', () => {
    for (const [key, rule] of Object.entries(HIDE_RULES)) {
      for (const selector of rule.selectors) {
        expect(typeof selector).toBe('string');
        expect(selector.length, `${key} has empty selector`).toBeGreaterThan(0);
      }
    }
  });

  // ── Проверки конкретных селекторов по данным DOM-инспекции ──────────────────

  describe('shorts — лента и сайдбар', () => {
    it('скрывает запись Shorts в сайдбаре (ytd-guide-entry-renderer с title="Shorts")', () => {
      const selectors = HIDE_RULES.shorts.selectors;
      expect(selectors.some(s => s.includes('ytd-guide-entry-renderer') && s.includes('title="Shorts"'))).toBe(true);
    });
  });

  describe('playlists — запись в разделе «ВЫ»', () => {
    it('не таргетирует ytd-guide-section-renderer (скрывает весь раздел ВЫ)', () => {
      const selectors = HIDE_RULES.playlists.selectors;
      const hidesWholeSection = selectors.some(
        s => s.startsWith('ytd-guide-section-renderer') && s.includes('/feed/playlists')
      );
      expect(hidesWholeSection, 'ytd-guide-section-renderer:has(/feed/playlists) скрывает весь раздел ВЫ').toBe(false);
    });

    it('таргетирует конкретный ytd-guide-entry-renderer с /feed/playlists', () => {
      const selectors = HIDE_RULES.playlists.selectors;
      const hasCorrect = selectors.some(
        s => s.startsWith('ytd-guide-entry-renderer') && s.includes('/feed/playlists')
      );
      expect(hasCorrect).toBe(true);
    });
  });

  describe('subscriptions — секция в сайдбаре', () => {
    it('не использует несуществующий #header', () => {
      const selectors = HIDE_RULES.subscriptions.selectors;
      const hasDeadPattern = selectors.some(s => s.includes('> #header'));
      expect(hasDeadPattern).toBe(false);
    });

    it('находит секцию по ссылке /feed/subscriptions — /feed/channels не существует в DOM (подтверждено Claude-in-Chrome)', () => {
      const selectors = HIDE_RULES.subscriptions.selectors;
      const hasWrong = selectors.some(s => s.includes('/feed/channels'));
      expect(hasWrong, '/feed/channels не существует в guide — используй /feed/subscriptions').toBe(false);

      const hasCorrect = selectors.some(
        s => s.includes('ytd-guide-section-renderer') && s.includes('/feed/subscriptions')
      );
      expect(hasCorrect).toBe(true);
    });
  });

  describe('navigator — секция «Навигатор» (Музыка/Фильмы/Игры)', () => {
    it('не использует :first-child (скрывает главную навигацию вместо Навигатора)', () => {
      const selectors = HIDE_RULES.navigator.selectors;
      const hasFirstChild = selectors.some(s => s.includes(':first-child'));
      expect(hasFirstChild).toBe(false);
    });

    it('таргетирует секцию «Навигатор» по ссылке /gaming (подтверждено DOM-инспекцией)', () => {
      const selectors = HIDE_RULES.navigator.selectors;
      const hasCorrect = selectors.some(
        s => s.includes('ytd-guide-section-renderer') && s.includes('/gaming')
      );
      expect(hasCorrect).toBe(true);
    });
  });

  describe('reportButton — кнопка жалобы в сайдбаре', () => {
    it('имеет группу sidebar, а не video', () => {
      expect(HIDE_RULES.reportButton.group).toBe('sidebar');
    });

    it('таргетирует /reporthistory в сайдбаре (подтверждено DOM-инспекцией)', () => {
      const selectors = HIDE_RULES.reportButton.selectors;
      const hasCorrect = selectors.some(s => s.includes('/reporthistory'));
      expect(hasCorrect).toBe(true);
    });

    it('не таргетирует ytd-menu-service-item-renderer (контекстное меню под видео)', () => {
      const selectors = HIDE_RULES.reportButton.selectors;
      const hasVideoMenu = selectors.some(s => s.includes('ytd-menu-service-item-renderer'));
      expect(hasVideoMenu).toBe(false);
    });
  });

  describe('fixUblock — чистка пустых рекламных контейнеров', () => {
    it('существует правило fixUblock', () => {
      expect(HIDE_RULES).toHaveProperty('fixUblock');
    });

    it('имеет группу feed', () => {
      expect(HIDE_RULES.fixUblock.group).toBe('feed');
    });

    it('таргетирует прямые ad-врапперы (CSS-фолбэк до того как uBlock их удалит)', () => {
      const selectors = HIDE_RULES.fixUblock.selectors;
      expect(selectors).toContain('ytd-ad-slot-renderer');
      expect(selectors).toContain('ytd-in-feed-ad-layout-renderer');
      expect(selectors).toContain('#masthead-ad');
    });

    it('не использует :has(ytd-ad-slot-renderer) — uBlock удаляет ad-slot из DOM, :has() ломается', () => {
      // Anti-pattern: после удаления ad-slot через uBlock селектор
      // `:has(ytd-ad-slot-renderer)` больше не матчит, и пустой
      // ytd-rich-item-renderer снова становится видимым. Скрытие таких
      // «трупов» делает JS-наблюдатель ublock-cleaner.ts.
      const selectors = HIDE_RULES.fixUblock.selectors;
      expect(selectors.some(s => s.includes(':has(ytd-ad-slot-renderer)'))).toBe(false);
    });

    it('таргетирует in-feed рекламу ytd-in-feed-ad-layout-renderer', () => {
      const selectors = HIDE_RULES.fixUblock.selectors;
      expect(selectors.some(s => s.includes('ytd-in-feed-ad-layout-renderer'))).toBe(true);
    });
  });

  describe('actionPanel — кнопки хедера и под видео', () => {
    it('существует правило actionPanel', () => {
      expect(HIDE_RULES).toHaveProperty('actionPanel');
    });
    it('имеет группу video', () => {
      expect(HIDE_RULES.actionPanel.group).toBe('video');
    });
    it('скрывает голосовой поиск в хедере', () => {
      expect(HIDE_RULES.actionPanel.selectors.some(s => s.includes('#voice-search-button'))).toBe(true);
    });
    it('скрывает кнопку Создать в хедере', () => {
      expect(HIDE_RULES.actionPanel.selectors.some(s => s.includes('ytd-masthead') && s.includes('Создать'))).toBe(true);
    });
    it('скрывает уведомления', () => {
      expect(HIDE_RULES.actionPanel.selectors.some(s => s.includes('ytd-notification-topbar-button-renderer'))).toBe(true);
    });
    it('скрывает Поделиться (#top-level-buttons-computed > yt-button-view-model)', () => {
      expect(HIDE_RULES.actionPanel.selectors.some(s => s.includes('#top-level-buttons-computed') && s.includes('yt-button-view-model'))).toBe(true);
    });
    it('скрывает #flexible-item-buttons (Сохранить / Клип / Скачать)', () => {
      expect(HIDE_RULES.actionPanel.selectors.some(s => s.includes('#flexible-item-buttons'))).toBe(true);
    });
    it('скрывает вкладки рекомендаций (iron-selector#chips)', () => {
      expect(HIDE_RULES.actionPanel.selectors.some(s => s.includes('iron-selector#chips'))).toBe(true);
    });
    it('скрывает кнопку экранной клавиатуры в поиске (ytd-text-input-assistant)', () => {
      expect(HIDE_RULES.actionPanel.selectors.some(s => s.includes('ytd-text-input-assistant'))).toBe(true);
    });
  });

  describe('explore — секция «Другие возможности»', () => {
    it('не использует несуществующий #header', () => {
      const selectors = HIDE_RULES.explore.selectors;
      const hasDeadPattern = selectors.some(s => s.includes('> #header'));
      expect(hasDeadPattern).toBe(false);
    });

    it('находит секцию по ссылке /premium внутри ytd-guide-entry-renderer', () => {
      const selectors = HIDE_RULES.explore.selectors;
      const hasCorrect = selectors.some(
        s => s.includes('ytd-guide-section-renderer') && s.includes('/premium')
      );
      expect(hasCorrect).toBe(true);
    });
  });
});
