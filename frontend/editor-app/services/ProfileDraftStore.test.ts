import { describe, expect, it } from 'vitest';

import { draftCharacter } from '../models/ProfileDrafts';
import { EDITOR_DRAFT_STORAGE_KEY } from './EditorDraftStorage';
import {
  ACTIVE_DRAFT_STORAGE_KEY,
  createDraftStore,
  memoryBackend,
} from './ProfileDraftStore';
import type { DraftBackend } from './ProfileDraftStore';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    values,
  };
}

/** A memory backend that reports itself as persistent, like IndexedDB. */
function persistentBackend(): DraftBackend {
  return { ...memoryBackend(), persistent: true };
}

function clock(start = 1_000) {
  let now = start;
  return () => (now += 1_000);
}

const legacyDocument = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'My old profile' }] }],
};

describe('profile draft store', () => {
  it('moves the old single autosaved draft into the first draft', async () => {
    const storage = memoryStorage({
      [EDITOR_DRAFT_STORAGE_KEY]: JSON.stringify({ version: 1, document: legacyDocument }),
    });
    const store = createDraftStore(persistentBackend(), storage, clock());

    const draft = await store.openActive();

    expect(draft).toMatchObject({ name: 'My draft', document: legacyDocument, character: null });
    expect(await store.list()).toHaveLength(1);
    expect(storage.values.get(ACTIVE_DRAFT_STORAGE_KEY)).toBe(draft.id);
    expect(storage.values.has(EDITOR_DRAFT_STORAGE_KEY)).toBe(false);
  });

  it('keeps the old draft when the browser cannot persist the new one', async () => {
    const storage = memoryStorage({
      [EDITOR_DRAFT_STORAGE_KEY]: JSON.stringify({ version: 1, document: legacyDocument }),
    });
    const store = createDraftStore(memoryBackend(), storage, clock());

    await store.openActive();

    expect(storage.values.has(EDITOR_DRAFT_STORAGE_KEY)).toBe(true);
  });

  it('creates only one first draft when opened twice at once', async () => {
    const store = createDraftStore(persistentBackend(), memoryStorage(), clock());

    const [first, second] = await Promise.all([store.openActive(), store.openActive()]);

    expect(first.id).toBe(second.id);
    expect(await store.list()).toHaveLength(1);
  });

  it('reopens the active draft, then the most recent one once it is deleted', async () => {
    const storage = memoryStorage();
    const store = createDraftStore(persistentBackend(), storage, clock());
    const older = await store.create({ name: 'Older' });
    const newer = await store.create({ name: 'Newer' });
    store.activate(older.id);

    expect((await store.openActive()).id).toBe(older.id);

    await store.remove(older.id);
    expect((await store.openActive()).id).toBe(newer.id);
    expect(storage.values.get(ACTIVE_DRAFT_STORAGE_KEY)).toBe(newer.id);
  });

  it('saves documents and recreates a draft deleted in another tab', async () => {
    const store = createDraftStore(persistentBackend(), memoryStorage(), clock());
    const draft = await store.create({ name: 'Mine', character: draftCharacter('Alice') });

    const saved = await store.saveDocument(draft, legacyDocument);
    expect(saved.document).toEqual(legacyDocument);
    expect(saved.updatedAt).toBeGreaterThan(draft.updatedAt);

    await store.remove(draft.id);
    const recreated = await store.saveDocument(draft, legacyDocument);
    expect(recreated).toMatchObject({ id: draft.id, name: 'Mine', document: legacyDocument });
    expect(await store.list()).toHaveLength(1);
  });

  it('updates details and duplicates drafts', async () => {
    const store = createDraftStore(persistentBackend(), memoryStorage(), clock());
    const draft = await store.create({ name: 'Main' });

    const updated = await store.updateDetails(draft.id, { name: ' Main v2 ', character: draftCharacter('Bob') });
    expect(updated).toMatchObject({ name: 'Main v2', character: { name: 'Bob' } });

    const copy = await store.duplicate(draft.id);
    expect(copy).toMatchObject({ name: 'Main v2 (copy)', character: { name: 'Bob' } });
    expect(copy?.id).not.toBe(draft.id);
  });

  it('restores a backup into the store', async () => {
    const source = createDraftStore(persistentBackend(), memoryStorage(), clock());
    await source.create({ name: 'Backed up', character: draftCharacter('Alice') });
    const backup = await source.backup();

    const target = createDraftStore(persistentBackend(), memoryStorage(), clock(50_000));
    await target.create({ name: 'Already here' });
    const merge = await target.restore(backup);

    expect(merge).toMatchObject({ added: 1, updated: 0, unchanged: 0 });
    expect((await target.list()).map(d => d.name).sort()).toEqual(['Already here', 'Backed up']);
    // Restoring the same file again changes nothing.
    expect(await target.restore(backup)).toMatchObject({ added: 0, unchanged: 1 });
  });
});
