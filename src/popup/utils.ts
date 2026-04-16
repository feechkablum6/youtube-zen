import type { HideRule, ToggleKey, ZenSettings } from '../shared/types';

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

export interface GroupedRule {
  key: ToggleKey;
  label: string;
}

export function groupRulesByGroup(
  rules: Record<string, HideRule>
): Map<HideRule['group'], GroupedRule[]> {
  const result = new Map<HideRule['group'], GroupedRule[]>();
  for (const [key, rule] of Object.entries(rules)) {
    const bucket = result.get(rule.group) ?? [];
    bucket.push({ key: key as ToggleKey, label: rule.label });
    result.set(rule.group, bucket);
  }
  return result;
}
