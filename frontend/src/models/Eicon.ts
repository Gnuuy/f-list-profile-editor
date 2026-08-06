const F_LIST_EICON_BASE_URL = 'https://static.f-list.net/images/eicon/';
const MAX_EICON_NAME_LENGTH = 128;

/**
 * Keep eicon names safe to place back between BBCode tags while retaining the
 * spelling F-list uses for its case-insensitive eicon filenames.
 */
export function normalizeEiconName(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized.length > MAX_EICON_NAME_LENGTH) return null;
  const hasControlCharacter = [...normalized].some(character => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });
  if (hasControlCharacter || normalized.includes('[') || normalized.includes(']')) {
    return null;
  }
  return normalized;
}

export function getFListEiconUrl(name: string): string | null {
  const normalized = normalizeEiconName(name);
  return normalized
    ? `${F_LIST_EICON_BASE_URL}${encodeURIComponent(normalized)}.gif`
    : null;
}
