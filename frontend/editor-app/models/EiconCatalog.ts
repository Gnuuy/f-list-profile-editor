import { normalizeEiconName } from './Eicon';

export const EICON_CATALOG_PROXY_URL = '/api/eicons';
export const XARIAH_EICON_DATABASE_URL =
  'https://xariah.net/eicons/Home/EiconsDataBase/base.doc';

export type EiconCatalog = {
  names: string[];
  asOfTimestamp: number;
};

export function parseEiconDatabase(source: string): EiconCatalog {
  const lines = source.split(/\r?\n/);
  const asOfLine = lines.find(line => line.startsWith('# As Of: '));
  const parsedTimestamp = asOfLine
    ? Number.parseInt(asOfLine.substring('# As Of: '.length), 10)
    : 0;
  const names = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const normalized = normalizeEiconName(trimmed.split('\t', 1)[0] ?? '');
    if (normalized) names.add(normalized);
  }

  return {
    names: [...names],
    asOfTimestamp: Number.isFinite(parsedTimestamp) ? parsedTimestamp : 0,
  };
}

export function normalizeEiconSearch(value: string): string {
  const normalized = value.trim().toLowerCase();
  const bbcodeMatch = normalized.match(/^\[eicon\](.*?)\[\/eicon\]\s*$/i);
  return (bbcodeMatch?.[1] ?? normalized).trim().toLowerCase();
}

export function searchEicons(names: readonly string[], value: string): string[] {
  const query = normalizeEiconSearch(value);
  if (!query) return [];

  return names
    .filter(name => name.includes(query))
    .sort((left, right) => {
      const leftStartsWithQuery = left.startsWith(query);
      const rightStartsWithQuery = right.startsWith(query);
      if (leftStartsWithQuery !== rightStartsWithQuery) {
        return leftStartsWithQuery ? -1 : 1;
      }
      return left.localeCompare(right);
    });
}
