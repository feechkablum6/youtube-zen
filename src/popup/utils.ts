export function resolveActiveSection(
  stored: string,
  knownIds: readonly string[]
): string {
  if (knownIds.includes(stored)) return stored;
  return knownIds[0] ?? '';
}
