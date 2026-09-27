import type { JSONContent } from '@tiptap/core';

import {
  createProfileDraft,
  mergeDraftBackup,
  normalizeDraftName,
  parseDraftBackup,
  serializeDraftBackup,
  UNTITLED_DRAFT_NAME,
} from '../models/ProfileDrafts';
import type {
  DraftBackupMerge,
  DraftCharacter,
  DraftDetails,
  ProfileDraft,
} from '../models/ProfileDrafts';
import { clearEditorDraft, loadEditorDraft } from './EditorDraftStorage';

// Drafts only ever live in this browser: IndexedDB holds the documents and
// localStorage remembers which one the editor has open.
const DB_NAME = 'f-list-profile-editor';
const DB_VERSION = 1;
const DRAFTS_STORE = 'drafts';
export const ACTIVE_DRAFT_STORAGE_KEY = 'f-list-profile-editor:active-draft:v1';

export type DraftBackend = {
  /** False when the browser refused IndexedDB and drafts only last this visit. */
  persistent: boolean;
  list(): Promise<ProfileDraft[]>;
  get(id: string): Promise<ProfileDraft | undefined>;
  put(drafts: readonly ProfileDraft[]): Promise<void>;
  /** Reads and writes one draft in a single transaction. */
  update(
    id: string,
    change: (current: ProfileDraft | undefined) => ProfileDraft | undefined,
  ): Promise<ProfileDraft | undefined>;
  remove(id: string): Promise<void>;
};

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type NewDraftInput = {
  name?: string;
  character?: DraftCharacter | null;
  document?: JSONContent;
};

export type DraftStore = ReturnType<typeof createDraftStore>;

export function createDraftStore(
  backend: DraftBackend,
  storage: KeyValueStorage | null,
  clock: () => number = Date.now,
) {
  let opening: Promise<ProfileDraft> | null = null;

  const readActiveId = () => {
    try {
      return storage?.getItem(ACTIVE_DRAFT_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  };
  const writeActiveId = (id: string) => {
    try {
      storage?.setItem(ACTIVE_DRAFT_STORAGE_KEY, id);
    } catch {
      // Without the pointer the editor opens the most recent draft instead.
    }
  };

  async function findOrCreateActive(): Promise<ProfileDraft> {
    const activeId = readActiveId();
    const active = activeId ? await backend.get(activeId) : undefined;
    if (active) return active;

    const [latest] = (await backend.list()).sort((a, b) => b.updatedAt - a.updatedAt);
    if (latest) {
      writeActiveId(latest.id);
      return latest;
    }

    // First run: carry over the single draft that earlier versions autosaved.
    const legacy = storage ? loadEditorDraft(storage) : null;
    const draft = createProfileDraft(
      { name: legacy ? 'My draft' : UNTITLED_DRAFT_NAME, document: legacy ?? undefined },
      clock(),
    );
    await backend.put([draft]);
    // Keep the old copy if this visit can't actually persist the new one.
    if (legacy && storage && backend.persistent) clearEditorDraft(storage);
    writeActiveId(draft.id);
    return draft;
  }

  return {
    persistent: backend.persistent,

    list: () => backend.list(),

    /** The draft the editor shows, creating (or migrating) one when needed. */
    openActive(): Promise<ProfileDraft> {
      // Shared so overlapping callers (e.g. React StrictMode) can't each create one.
      opening ??= findOrCreateActive().finally(() => {
        opening = null;
      });
      return opening;
    },

    activate(id: string) {
      writeActiveId(id);
    },

    async create(input: NewDraftInput): Promise<ProfileDraft> {
      const draft = createProfileDraft(input, clock());
      await backend.put([draft]);
      return draft;
    },

    /** Recreates the draft from `draft` if another tab deleted it meanwhile. */
    async saveDocument(draft: ProfileDraft, document: JSONContent): Promise<ProfileDraft> {
      const saved = await backend.update(draft.id, current => ({
        ...(current ?? draft),
        document,
        updatedAt: clock(),
      }));
      return saved ?? draft;
    },

    updateDetails(id: string, details: DraftDetails): Promise<ProfileDraft | undefined> {
      return backend.update(id, current => current && {
        ...current,
        name: normalizeDraftName(details.name),
        character: details.character,
        updatedAt: clock(),
      });
    },

    async duplicate(id: string): Promise<ProfileDraft | undefined> {
      const source = await backend.get(id);
      if (!source) return undefined;
      const copy = createProfileDraft({
        name: `${source.name} (copy)`,
        character: source.character,
        document: source.document,
      }, clock());
      await backend.put([copy]);
      return copy;
    },

    remove: (id: string) => backend.remove(id),

    async backup(): Promise<string> {
      return serializeDraftBackup(await backend.list(), clock());
    },

    async restore(text: string): Promise<DraftBackupMerge> {
      const merge = mergeDraftBackup(await backend.list(), parseDraftBackup(text));
      await backend.put(merge.changed);
      return merge;
    },
  };
}

let browserStore: Promise<DraftStore> | null = null;

export function browserDraftStore(): Promise<DraftStore> {
  browserStore ??= openIndexedDbBackend()
    .catch(error => {
      console.warn('IndexedDB is unavailable, so drafts will only last for this visit.', error);
      return memoryBackend();
    })
    .then(backend => createDraftStore(backend, browserStorage()));
  return browserStore;
}

export function openIndexedDbBackend(
  factory: IDBFactory | undefined = globalThis.indexedDB,
): Promise<DraftBackend> {
  return new Promise((resolve, reject) => {
    if (!factory) {
      reject(new Error('This browser does not support IndexedDB.'));
      return;
    }
    const open = factory.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      open.result.createObjectStore(DRAFTS_STORE, { keyPath: 'id' });
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      // Let a newer version of the editor in another tab upgrade the database.
      db.onversionchange = () => db.close();
      resolve(indexedDbBackend(db));
    };
  });
}

function indexedDbBackend(db: IDBDatabase): DraftBackend {
  const drafts = (mode: IDBTransactionMode) => {
    const transaction = db.transaction(DRAFTS_STORE, mode);
    return { transaction, store: transaction.objectStore(DRAFTS_STORE) };
  };

  return {
    persistent: true,
    list: () => requestResult<ProfileDraft[]>(drafts('readonly').store.getAll()),
    get: id => requestResult<ProfileDraft | undefined>(drafts('readonly').store.get(id)),
    async put(list) {
      const { transaction, store } = drafts('readwrite');
      for (const draft of list) store.put(draft);
      await transactionDone(transaction);
    },
    async update(id, change) {
      const { transaction, store } = drafts('readwrite');
      let next: ProfileDraft | undefined;
      const read = store.get(id);
      read.onsuccess = () => {
        next = change(read.result as ProfileDraft | undefined);
        if (next) store.put(next);
      };
      await transactionDone(transaction);
      return next;
    },
    async remove(id) {
      const { transaction, store } = drafts('readwrite');
      store.delete(id);
      await transactionDone(transaction);
    },
  };
}

export function memoryBackend(initial: readonly ProfileDraft[] = []): DraftBackend {
  const drafts = new Map(initial.map(draft => [draft.id, structuredClone(draft)]));
  const read = (id: string) => {
    const draft = drafts.get(id);
    return draft && structuredClone(draft);
  };

  return {
    persistent: false,
    list: async () => [...drafts.values()].map(draft => structuredClone(draft)),
    get: async id => read(id),
    async put(list) {
      for (const draft of list) drafts.set(draft.id, structuredClone(draft));
    },
    async update(id, change) {
      const next = change(read(id));
      if (next) drafts.set(id, structuredClone(next));
      return next && structuredClone(next);
    },
    async remove(id) {
      drafts.delete(id);
    },
  };
}

function requestResult<T>(request: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('The draft change was cancelled.'));
  });
}

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
