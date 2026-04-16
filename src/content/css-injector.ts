import type { ToggleKey, ZenSettings } from '../shared/types';

import { HIDE_RULES } from './selectors';

export function buildCss(settings: ZenSettings): string {
  if (!settings.enabled) return '';

  const selectors: string[] = [];

  for (const [key, rule] of Object.entries(HIDE_RULES)) {
    if (settings[key as ToggleKey]) {
      selectors.push(...rule.selectors);
    }
  }

  if (selectors.length === 0) return '';

  return `${selectors.join(',\n')} {\n  display: none !important;\n}`;
}
