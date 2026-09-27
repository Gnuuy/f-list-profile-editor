import { describe, expect, it } from 'vitest';

import {
  clearEditorDraft,
  EDITOR_DRAFT_STORAGE_KEY,
  loadEditorDraft,
  saveEditorDraft,
} from './EditorDraftStorage';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    values,
  };
}

describe('editor draft storage', () => {
  it('round-trips a versioned editor document and clears it', () => {
    const storage = memoryStorage();
    const document = { type: 'doc', content: [{ type: 'paragraph' }] };

    expect(saveEditorDraft(document, storage)).toBe(true);
    expect(loadEditorDraft(storage)).toEqual(document);
    expect(storage.values.has(EDITOR_DRAFT_STORAGE_KEY)).toBe(true);

    clearEditorDraft(storage);
    expect(loadEditorDraft(storage)).toBeNull();
  });

  it('ignores malformed and incompatible local drafts', () => {
    const storage = memoryStorage();
    storage.setItem(EDITOR_DRAFT_STORAGE_KEY, '{bad json');
    expect(loadEditorDraft(storage)).toBeNull();
    storage.setItem(EDITOR_DRAFT_STORAGE_KEY, JSON.stringify({ version: 2, document: { type: 'doc' } }));
    expect(loadEditorDraft(storage)).toBeNull();
  });
});
