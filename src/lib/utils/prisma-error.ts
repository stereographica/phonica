/**
 * Utility helpers for interpreting Prisma unique constraint metadata.
 */

/**
 * Normalizes Prisma's meta.target (string or string[]) into a plain string array.
 */
export function normalizeConstraintTargets(target: unknown): string[] {
  if (!target) {
    return [];
  }

  if (typeof target === 'string') {
    return [target];
  }

  if (Array.isArray(target)) {
    return target.filter((value): value is string => typeof value === 'string');
  }

  return [];
}

/**
 * Checks whether any constraint target contains the provided keyword (case-insensitive).
 */
export function constraintTargetIncludes(target: unknown, keyword: string): boolean {
  if (!keyword) {
    return false;
  }

  const normalizedTargets = normalizeConstraintTargets(target);
  const normalizedKeyword = keyword.toLowerCase();

  return normalizedTargets.some((value) => value.toLowerCase().includes(normalizedKeyword));
}
