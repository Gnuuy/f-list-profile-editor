import {
  createEmptyEiconPreferences,
  EICON_PREFERENCES_STORAGE_KEY,
  parseEiconPreferences,
} from '../models/EiconPreferences';
import type { EiconPreferences } from '../models/EiconPreferences';

export function loadEiconPreferences(): EiconPreferences {
  if (typeof window === 'undefined') return createEmptyEiconPreferences();

  try {
    return parseEiconPreferences(window.localStorage.getItem(EICON_PREFERENCES_STORAGE_KEY));
  } catch {
    return createEmptyEiconPreferences();
  }
}

export function saveEiconPreferences(preferences: EiconPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      EICON_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
    );
  } catch {
    // Private-browsing and storage quota failures must not break the editor.
  }
}
