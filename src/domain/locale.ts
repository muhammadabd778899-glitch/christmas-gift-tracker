export const FALLBACK_LOCALE = 'en-US';

export function isValidLocale(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed || trimmed.length > 35) {
    return false;
  }

  try {
    Intl.getCanonicalLocales(trimmed);
    return true;
  } catch {
    return false;
  }
}

export function normalizeLocale(
  value: string | null | undefined,
  fallback = FALLBACK_LOCALE,
): string {
  if (value && isValidLocale(value)) {
    return Intl.getCanonicalLocales(value)[0] ?? fallback;
  }

  return fallback;
}
