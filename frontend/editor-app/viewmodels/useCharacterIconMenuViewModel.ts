import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { FListCharacterIcon } from '../models/FListProfile';
import { normalizeFListCharacterName } from '../models/FListProfile';
import { lookupFListCharacterIcon } from '../services/FListCharacterClient';

export function useCharacterIconMenuViewModel(open: boolean) {
  const [query, setQueryState] = useState('');
  const [result, setResult] = useState<FListCharacterIcon | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef<AbortController | null>(null);

  const normalizedQuery = useMemo(
    () => normalizeFListCharacterName(query),
    [query],
  );

  const setQuery = useCallback((value: string) => {
    requestRef.current?.abort();
    setQueryState(value);
    setResult(null);
    setLoading(false);
    setError('');
  }, []);

  const lookup = useCallback(async () => {
    if (!normalizedQuery) {
      setError('Enter a valid F-list character name.');
      return;
    }

    requestRef.current?.abort();
    const request = new AbortController();
    requestRef.current = request;
    setLoading(true);
    setResult(null);
    setError('');

    try {
      setResult(await lookupFListCharacterIcon(normalizedQuery, request.signal));
    } catch (lookupError) {
      if (request.signal.aborted) return;
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : 'The F-list character could not be found.',
      );
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }, [normalizedQuery]);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    if (!open) requestRef.current?.abort();
  }, [open]);

  return {
    query,
    setQuery,
    result,
    loading,
    error,
    canLookup: normalizedQuery !== null && !loading,
    lookup,
  };
}
