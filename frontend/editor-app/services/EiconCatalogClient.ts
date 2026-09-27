import {
  EICON_CATALOG_PROXY_URL,
  parseEiconDatabase,
  XARIAH_EICON_DATABASE_URL,
} from '../models/EiconCatalog';
import type { EiconCatalog } from '../models/EiconCatalog';

let cachedCatalog: Promise<EiconCatalog> | null = null;

async function fetchCatalogFrom(source: string): Promise<EiconCatalog> {
  const response = await fetch(source, {
    headers: { Accept: 'text/plain' },
  });
  if (!response.ok) {
    throw new Error(`The eicon index returned HTTP ${response.status}.`);
  }

  const catalog = parseEiconDatabase(await response.text());
  if (catalog.names.length === 0 || catalog.asOfTimestamp <= 0) {
    throw new Error('The eicon index did not contain valid catalog data.');
  }
  return catalog;
}

async function fetchCatalog(): Promise<EiconCatalog> {
  const sources = [EICON_CATALOG_PROXY_URL, XARIAH_EICON_DATABASE_URL];
  let lastError: unknown;

  for (const source of sources) {
    try {
      return await fetchCatalogFrom(source);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('The eicon index could not be loaded.');
}

export function loadEiconCatalog(): Promise<EiconCatalog> {
  cachedCatalog ??= fetchCatalog().catch(error => {
    cachedCatalog = null;
    throw error;
  });
  return cachedCatalog;
}

export function clearEiconCatalogCache(): void {
  cachedCatalog = null;
}
