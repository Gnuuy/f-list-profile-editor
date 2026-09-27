import { useCallback, useEffect, useMemo, useState } from 'react';

import { searchEicons } from '../models/EiconCatalog';
import type { EiconCatalog } from '../models/EiconCatalog';
import {
  getFrequentlyUsedEicons,
  recordEiconUse,
  toggleFavouriteEicon,
} from '../models/EiconPreferences';
import type { EiconPreferences } from '../models/EiconPreferences';
import {
  clearEiconCatalogCache,
  loadEiconCatalog,
} from '../services/EiconCatalogClient';
import {
  loadEiconPreferences,
  saveEiconPreferences,
} from '../services/EiconPreferencesStorage';

const SEARCH_DEBOUNCE_MS = 300;
export const EICON_GRID_COLUMNS = 7;
export const EICON_GRID_ROWS = 7;
export const EICON_GRID_CAPACITY = EICON_GRID_COLUMNS * EICON_GRID_ROWS;
export const EICON_RESULTS_BATCH_SIZE = EICON_GRID_CAPACITY * 2;

export type EiconMenuSection = 'search' | 'favourites' | 'frequent';

export function useEiconMenuViewModel(isOpen: boolean) {
  const [catalog, setCatalog] = useState<EiconCatalog | null>(null);
  const [preferences, setPreferences] = useState<EiconPreferences>(loadEiconPreferences);
  const [activeSection, setActiveSectionState] = useState<EiconMenuSection>('search');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(EICON_RESULTS_BATCH_SIZE);
  const [error, setError] = useState<string | null>(null);

  const loading = isOpen && activeSection === 'search' && !catalog && !error;

  useEffect(() => {
    if (!loading) return;

    let cancelled = false;
    void loadEiconCatalog()
      .then(nextCatalog => {
        if (!cancelled) setCatalog(nextCatalog);
      })
      .catch(() => {
        if (!cancelled) {
          setError('The eicon index could not be loaded. Try again in a moment.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loading]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
      setVisibleCount(EICON_RESULTS_BATCH_SIZE);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const frequentNames = useMemo(
    () => getFrequentlyUsedEicons(preferences.usage),
    [preferences.usage],
  );
  const hasQuery = debouncedQuery.trim().length > 0;
  const allResults = useMemo(() => {
    switch (activeSection) {
      case 'favourites':
        return hasQuery
          ? searchEicons(preferences.favourites, debouncedQuery)
          : preferences.favourites;
      case 'frequent':
        return hasQuery
          ? searchEicons(frequentNames, debouncedQuery)
          : frequentNames;
      default:
        return searchEicons(catalog?.names ?? [], debouncedQuery);
    }
  }, [activeSection, catalog, debouncedQuery, frequentNames, hasQuery, preferences.favourites]);
  const results = useMemo(
    () => allResults.slice(0, visibleCount),
    [allResults, visibleCount],
  );
  const favouriteSet = useMemo(
    () => new Set(preferences.favourites),
    [preferences.favourites],
  );

  const updatePreferences = useCallback(
    (update: (current: EiconPreferences) => EiconPreferences) => {
      setPreferences(current => {
        const next = update(current);
        saveEiconPreferences(next);
        return next;
      });
    },
    [],
  );

  const setActiveSection = useCallback((section: EiconMenuSection) => {
    setActiveSectionState(section);
    setQuery('');
    setDebouncedQuery('');
    setVisibleCount(EICON_RESULTS_BATCH_SIZE);
  }, []);

  const toggleFavourite = useCallback((name: string) => {
    updatePreferences(current => toggleFavouriteEicon(current, name));
  }, [updatePreferences]);

  const markUsed = useCallback((name: string) => {
    updatePreferences(current => recordEiconUse(current, name));
  }, [updatePreferences]);

  const retry = useCallback(() => {
    clearEiconCatalogCache();
    setCatalog(null);
    setError(null);
  }, []);

  return {
    activeSection,
    setActiveSection,
    query,
    setQuery,
    results,
    totalResults: allResults.length,
    loading,
    error: activeSection === 'search' ? error : null,
    hasQuery,
    hasMore: results.length < allResults.length,
    loadMore: () => setVisibleCount(count => count + EICON_GRID_CAPACITY),
    retry,
    favouriteCount: preferences.favourites.length,
    frequentCount: frequentNames.length,
    isFavourite: (name: string) => favouriteSet.has(name),
    toggleFavourite,
    markUsed,
  };
}
