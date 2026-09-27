import { normalizeEiconName } from './Eicon';

export const EICON_PREFERENCES_STORAGE_KEY = 'f-list-profile-editor.eicons.v1';
const MAX_STORED_EICONS = 256;

export type EiconUsageRecord = {
  count: number;
  lastUsedAt: number;
};

export type EiconPreferences = {
  favourites: string[];
  usage: Record<string, EiconUsageRecord>;
};

export function createEmptyEiconPreferences(): EiconPreferences {
  return { favourites: [], usage: {} };
}

function normalizeUniqueNames(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  const names = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const name = normalizeEiconName(value);
    if (name) names.add(name);
    if (names.size === MAX_STORED_EICONS) break;
  }
  return [...names];
}

export function parseEiconPreferences(source: string | null): EiconPreferences {
  if (!source) return createEmptyEiconPreferences();

  try {
    const parsed = JSON.parse(source) as {
      favourites?: unknown;
      usage?: unknown;
    };
    const usage: Record<string, EiconUsageRecord> = {};

    if (parsed.usage && typeof parsed.usage === 'object' && !Array.isArray(parsed.usage)) {
      for (const [rawName, rawRecord] of Object.entries(parsed.usage)) {
        const name = normalizeEiconName(rawName);
        if (!name || !rawRecord || typeof rawRecord !== 'object') continue;

        const record = rawRecord as Partial<EiconUsageRecord>;
        if (
          typeof record.count !== 'number'
          || !Number.isFinite(record.count)
          || record.count <= 0
          || typeof record.lastUsedAt !== 'number'
          || !Number.isFinite(record.lastUsedAt)
          || record.lastUsedAt < 0
        ) continue;

        usage[name] = {
          count: Math.floor(record.count),
          lastUsedAt: Math.floor(record.lastUsedAt),
        };
      }
    }

    const orderedUsage = Object.entries(usage)
      .sort(([, left], [, right]) => right.lastUsedAt - left.lastUsedAt)
      .slice(0, MAX_STORED_EICONS);

    return {
      favourites: normalizeUniqueNames(parsed.favourites),
      usage: Object.fromEntries(orderedUsage),
    };
  } catch {
    return createEmptyEiconPreferences();
  }
}

export function toggleFavouriteEicon(
  preferences: EiconPreferences,
  value: string,
): EiconPreferences {
  const name = normalizeEiconName(value);
  if (!name) return preferences;

  const isFavourite = preferences.favourites.includes(name);
  return {
    ...preferences,
    favourites: isFavourite
      ? preferences.favourites.filter(candidate => candidate !== name)
      : [name, ...preferences.favourites].slice(0, MAX_STORED_EICONS),
  };
}

export function recordEiconUse(
  preferences: EiconPreferences,
  value: string,
  usedAt = Date.now(),
): EiconPreferences {
  const name = normalizeEiconName(value);
  if (!name || !Number.isFinite(usedAt) || usedAt < 0) return preferences;

  const current = preferences.usage[name];
  const usage = {
    ...preferences.usage,
    [name]: {
      count: (current?.count ?? 0) + 1,
      lastUsedAt: Math.floor(usedAt),
    },
  };
  const trimmedUsage = Object.fromEntries(
    Object.entries(usage)
      .sort(([, left], [, right]) => right.lastUsedAt - left.lastUsedAt)
      .slice(0, MAX_STORED_EICONS),
  );

  return { ...preferences, usage: trimmedUsage };
}

export function getFrequentlyUsedEicons(
  usage: Readonly<Record<string, EiconUsageRecord>>,
): string[] {
  return Object.entries(usage)
    .sort(([leftName, left], [rightName, right]) => (
      right.count - left.count
      || right.lastUsedAt - left.lastUsedAt
      || leftName.localeCompare(rightName)
    ))
    .map(([name]) => name);
}
