import type { ToggleKey, ZenSettings } from '../shared/types';

export function resolveActiveSection(
  stored: string,
  knownIds: readonly string[]
): string {
  if (knownIds.includes(stored)) return stored;
  return knownIds[0] ?? '';
}

export function countActiveRules(
  settings: ZenSettings,
  keys: readonly ToggleKey[]
): { active: number; total: number } {
  let active = 0;
  for (const k of keys) {
    if (settings[k]) active++;
  }
  return { active, total: keys.length };
}
