import { describe, expect, it } from 'vitest';

import {
  createEmptyEiconPreferences,
  getFrequentlyUsedEicons,
  parseEiconPreferences,
  recordEiconUse,
  toggleFavouriteEicon,
} from './EiconPreferences';

describe('eicon preferences', () => {
  it('recovers safely from malformed local data', () => {
    expect(parseEiconPreferences('{not-json')).toEqual({ favourites: [], usage: {} });
  });

  it('normalizes and toggles favourite names without duplicates', () => {
    const empty = createEmptyEiconPreferences();
    const pinned = toggleFavouriteEicon(empty, ' R03Chug ');
    expect(pinned.favourites).toEqual(['r03chug']);
    expect(toggleFavouriteEicon(pinned, 'r03chug').favourites).toEqual([]);
  });

  it('ranks frequent eicons by use count and then recency', () => {
    let preferences = createEmptyEiconPreferences();
    preferences = recordEiconUse(preferences, 'alpha', 100);
    preferences = recordEiconUse(preferences, 'beta', 200);
    preferences = recordEiconUse(preferences, 'alpha', 300);
    preferences = recordEiconUse(preferences, 'gamma', 250);

    expect(getFrequentlyUsedEicons(preferences.usage)).toEqual([
      'alpha',
      'gamma',
      'beta',
    ]);
  });

  it('drops invalid stored records while retaining valid local data', () => {
    const parsed = parseEiconPreferences(JSON.stringify({
      favourites: ['Valid', '', 'valid', '[bad]'],
      usage: {
        Valid: { count: 2, lastUsedAt: 50 },
        broken: { count: 0, lastUsedAt: 10 },
      },
    }));

    expect(parsed).toEqual({
      favourites: ['valid'],
      usage: { valid: { count: 2, lastUsedAt: 50 } },
    });
  });
});
