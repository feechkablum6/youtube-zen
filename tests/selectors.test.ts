import { describe, expect, it } from 'vitest';

import { HIDE_RULES } from '../src/content/selectors';
import type { HideRule, ToggleKey } from '../src/shared/types';

describe('HIDE_RULES', () => {
  // Плоские правила после рефакторинга (вложенные списки уехали в SIDEBAR_LISTS).
  const expectedKeys: ToggleKey[] = [
    'shorts',
    'home',
    'subscriptions',
    'reportButton',
    'footer',
    'fixUblock',
    'actionPanel',
    'headerMenuButton',
  ];

  it('has a flat entry for every non-nested toggle', () => {
    for (const key of expectedKeys) {
      expect(HIDE_RULES, `${key} missing`).toHaveProperty(key);
    }
  });

  it('has no extra flat keys beyond the non-nested set', () => {
    expect(Object.keys(HIDE_RULES).sort()).toEqual([...expectedKeys].sort());
  });

  it('every flat rule has non-empty selectors array', () => {
    for (const [key, rule] of Object.entries(HIDE_RULES)) {
      const def = rule as HideRule;
      expect(def.selectors.length, `${key} has empty selectors`).toBeGreaterThan(0);
    }
  });

  it('every flat rule has a non-empty label', () => {
    for (const [key, rule] of Object.entries(HIDE_RULES)) {
      const def = rule as HideRule;
      expect(def.label.length, `${key} has empty label`).toBeGreaterThan(0);
    }
  });

  it('every flat rule has a valid group', () => {
    const validGroups = ['feed', 'sidebar', 'video', 'footer', 'header'];
    for (const [key, rule] of Object.entries(HIDE_RULES)) {
      const def = rule as HideRule;
      expect(validGroups, `${key} has invalid group "${def.group}"`).toContain(def.group);
    }
  });

  it('every selector is a non-empty string', () => {
    for (const [key, rule] of Object.entries(HIDE_RULES)) {
      const def = rule as HideRule;
      for (const selector of def.selectors) {
        expect(typeof selector).toBe('string');
        expect(selector.length, `${key} has empty selector`).toBeGreaterThan(0);
      }
    }
  });

  it('every selector is syntactically valid', () => {
    for (const [key, rule] of Object.entries(HIDE_RULES)) {
      const def = rule as HideRule;
      for (const selector of def.selectors) {
        expect(
          () => document.querySelector(selector),
          `${key}: ${selector}`
        ).not.toThrow();
      }
    }
  });

  // ── Проверки конкретных селекторов по данным DOM-инспекции ──────────────────

  describe('shorts — лента и сайдбар', () => {
    const rule = HIDE_RULES.shorts as HideRule;
    const selectors = rule.selectors;

    it('скрывает запись Shorts в сайдбаре (ytd-guide-entry-renderer с title="Shorts")', () => {
      expect(selectors.some(s => s.includes('ytd-guide-entry-renderer') && s.includes('title="Shorts"'))).toBe(true);
    });

    it('ловит новую раскладку Shorts (ytm-shorts-lockup-view-model-v2) — подтверждено Claude-in-Chrome', () => {
      expect(
        selectors.some(
          (s) => s.includes('ytd-rich-item-renderer') && s.includes('ytm-shorts-lockup-view-model-v2')
        )
      ).toBe(true);
    });

    it('ловит shelf новой раскладки (ytd-rich-shelf-renderer с ytm-shorts-lockup-view-model-v2)', () => {
      expect(
        selectors.some(
          (s) => s.includes('ytd-rich-shelf-renderer') && s.includes('ytm-shorts-lockup-view-model-v2')
        )
      ).toBe(true);
    });

    it('скрывает внешний ytd-rich-section-renderer, чтобы полка Shorts не оставляла пустую строку', () => {
      expect(
        selectors.some(
          (s) => s.startsWith('ytd-rich-section-renderer') && s.includes('ytd-rich-shelf-renderer')
        )
      ).toBe(true);
    });

    it('ловит полку Shorts на странице поиска', () => {
      expect(
        selectors.some(
          (s) => s.startsWith('grid-shelf-view-model') && s.includes('ytm-shorts-lockup-view-model-v2')
        )
      ).toBe(true);
    });

    it('сохраняет старые селекторы для совместимости', () => {
      expect(selectors).toContain('ytd-rich-shelf-renderer[is-shorts]');
      expect(selectors).toContain('ytd-reel-shelf-renderer');
    });
  });

  describe('home — кнопка «Главная» в сайдбаре', () => {
    const rule = HIDE_RULES.home as HideRule;

    it('таргетирует запись «Главная» по ссылке href="/"', () => {
      expect(
        rule.selectors.some(
          (s) => s.includes('ytd-guide-entry-renderer') && s.includes('a[href="/"]')
        )
      ).toBe(true);
    });

    it('относится к группе sidebar', () => {
      expect(rule.group).toBe('sidebar');
    });
  });

  describe('subscriptions — секция в сайдбаре', () => {
    const rule = HIDE_RULES.subscriptions as HideRule;
    const selectors = rule.selectors;

    it('не использует несуществующий #header', () => {
      const hasDeadPattern = selectors.some(s => s.includes('> #header'));
      expect(hasDeadPattern).toBe(false);
    });

    it('находит секцию по ссылке /feed/subscriptions — /feed/channels не существует в DOM (подтверждено Claude-in-Chrome)', () => {
      const hasWrong = selectors.some(s => s.includes('/feed/channels'));
      expect(hasWrong, '/feed/channels не существует в guide — используй /feed/subscriptions').toBe(false);

      const hasCorrect = selectors.some(
        s => s.includes('ytd-guide-section-renderer') && s.includes('/feed/subscriptions')
      );
      expect(hasCorrect).toBe(true);
    });
  });

  describe('reportButton — кнопка жалобы в сайдбаре', () => {
    const rule = HIDE_RULES.reportButton as HideRule;

    it('имеет группу sidebar, а не video', () => {
      expect(rule.group).toBe('sidebar');
    });

    it('таргетирует /reporthistory в сайдбаре (подтверждено DOM-инспекцией)', () => {
      const hasCorrect = rule.selectors.some(s => s.includes('/reporthistory'));
      expect(hasCorrect).toBe(true);
    });

    it('не таргетирует ytd-menu-service-item-renderer (контекстное меню под видео)', () => {
      const hasVideoMenu = rule.selectors.some(s => s.includes('ytd-menu-service-item-renderer'));
      expect(hasVideoMenu).toBe(false);
    });
  });

  describe('fixUblock — чистка пустых рекламных контейнеров', () => {
    const rule = HIDE_RULES.fixUblock as HideRule;

    it('существует правило fixUblock', () => {
      expect(HIDE_RULES).toHaveProperty('fixUblock');
    });

    it('имеет группу feed', () => {
      expect(rule.group).toBe('feed');
    });

    it('таргетирует прямые ad-врапперы (CSS-фолбэк до того как uBlock их удалит)', () => {
      const selectors = rule.selectors;
      expect(selectors).toContain('ytd-ad-slot-renderer');
      expect(selectors).toContain('ytd-in-feed-ad-layout-renderer');
      expect(selectors).toContain('#masthead-ad');
    });

    it('не использует :has(ytd-ad-slot-renderer) — uBlock удаляет ad-slot из DOM, :has() ломается', () => {
      // Anti-pattern: после удаления ad-slot через uBlock селектор
      // `:has(ytd-ad-slot-renderer)` больше не матчит, и пустой
      // ytd-rich-item-renderer снова становится видимым. Скрытие таких
      // «трупов» делает JS-наблюдатель ublock-cleaner.ts.
      const selectors = rule.selectors;
      expect(selectors.some(s => s.includes(':has(ytd-ad-slot-renderer)'))).toBe(false);
    });

    it('таргетирует in-feed рекламу ytd-in-feed-ad-layout-renderer', () => {
      const selectors = rule.selectors;
      expect(selectors.some(s => s.includes('ytd-in-feed-ad-layout-renderer'))).toBe(true);
    });
  });

  describe('headerMenuButton — гамбургер (троеполосие) в хедере', () => {
    const rule = HIDE_RULES.headerMenuButton as HideRule;

    it('существует правило headerMenuButton', () => {
      expect(HIDE_RULES).toHaveProperty('headerMenuButton');
    });

    it('таргетирует кнопку меню в masthead (#guide-button) — подтверждено DOM-инспекцией 2026-06-06', () => {
      expect(
        rule.selectors.some((s) => s.includes('ytd-masthead') && s.includes('#guide-button'))
      ).toBe(true);
    });

    it('относится к группе header', () => {
      expect(rule.group).toBe('header');
    });
  });

  describe('actionPanel — кнопки хедера и под видео', () => {
    const rule = HIDE_RULES.actionPanel as HideRule;
    const selectors = rule.selectors;

    it('существует правило actionPanel', () => {
      expect(HIDE_RULES).toHaveProperty('actionPanel');
    });
    it('имеет группу video', () => {
      expect(rule.group).toBe('video');
    });
    it('скрывает голосовой поиск в хедере', () => {
      expect(selectors.some(s => s.includes('#voice-search-button'))).toBe(true);
    });
    it('скрывает кнопку Создать в хедере', () => {
      expect(selectors.some(s => s.includes('ytd-masthead') && s.includes('Создать'))).toBe(true);
    });
    it('скрывает уведомления', () => {
      expect(selectors.some(s => s.includes('ytd-notification-topbar-button-renderer'))).toBe(true);
    });
    it('скрывает Поделиться (#top-level-buttons-computed > yt-button-view-model)', () => {
      expect(selectors.some(s => s.includes('#top-level-buttons-computed') && s.includes('yt-button-view-model'))).toBe(true);
    });
    it('скрывает #flexible-item-buttons (Сохранить / Клип / Скачать)', () => {
      expect(selectors.some(s => s.includes('#flexible-item-buttons'))).toBe(true);
    });
    it('скрывает вкладки рекомендаций (iron-selector#chips)', () => {
      expect(selectors.some(s => s.includes('iron-selector#chips'))).toBe(true);
    });
    it('скрывает кнопку экранной клавиатуры в поиске (ytd-text-input-assistant)', () => {
      expect(selectors.some(s => s.includes('ytd-text-input-assistant'))).toBe(true);
    });
  });
});
