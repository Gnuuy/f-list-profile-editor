import type { JSONContent } from '@tiptap/core';

export const EDITOR_DRAFT_STORAGE_KEY = 'f-list-profile-editor:draft:v1';

type StoredDraft = {
  version: 1;
  document: JSONContent;
};

export function loadEditorDraft(storage: Pick<Storage, 'getItem'> | null = browserStorage()): JSONContent | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(EDITOR_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<StoredDraft>;
    return draft.version === 1 && draft.document?.type === 'doc'
      ? draft.document
      : null;
  } catch {
    return null;
  }
}

export function saveEditorDraft(
  document: JSONContent,
  storage: Pick<Storage, 'setItem'> | null = browserStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(EDITOR_DRAFT_STORAGE_KEY, JSON.stringify({ version: 1, document }));
    return true;
  } catch {
    return false;
  }
}

export function clearEditorDraft(storage: Pick<Storage, 'removeItem'> | null = browserStorage()): void {
  try {
    storage?.removeItem(EDITOR_DRAFT_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
