import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { JSONContent } from '@tiptap/core';

import type { DraftBackupMerge, DraftDetails, ProfileDraft } from '../models/ProfileDrafts';
import { browserDraftStore } from '../services/ProfileDraftStore';
import type { DraftStore, NewDraftInput } from '../services/ProfileDraftStore';
import { toast } from '../utilities/Toast';

type ProfileDrafts = {
  status: 'loading' | 'ready' | 'error';
  /** False when this browser won't store drafts beyond the current visit. */
  persistent: boolean;
  drafts: ProfileDraft[];
  activeDraft: ProfileDraft | null;
  openDraft: (id: string) => void;
  /** Creates a draft and opens it in the editor. */
  createDraft: (input: NewDraftInput) => Promise<ProfileDraft>;
  saveDraftDocument: (draft: ProfileDraft, document: JSONContent) => Promise<void>;
  updateDraftDetails: (id: string, details: DraftDetails) => Promise<void>;
  duplicateDraft: (id: string) => Promise<void>;
  deleteDraft: (id: string) => Promise<void>;
  backupDrafts: () => Promise<string>;
  restoreDrafts: (text: string) => Promise<DraftBackupMerge>;
};

const Ctx = createContext<ProfileDrafts | null>(null);

function replaceDraft(drafts: ProfileDraft[], next: ProfileDraft): ProfileDraft[] {
  return drafts.some(draft => draft.id === next.id)
    ? drafts.map(draft => (draft.id === next.id ? next : draft))
    : [...drafts, next];
}

export function ProfileDraftsProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<DraftStore | null>(null);
  const saveFailedRef = useRef(false);
  const [status, setStatus] = useState<ProfileDrafts['status']>('loading');
  const [persistent, setPersistent] = useState(true);
  const [drafts, setDrafts] = useState<ProfileDraft[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const store = await browserDraftStore();
      const active = await store.openActive();
      const list = await store.list();
      if (cancelled) return;
      storeRef.current = store;
      setPersistent(store.persistent);
      setDrafts(replaceDraft(list, active));
      setActiveId(active.id);
      setStatus('ready');
    })().catch(error => {
      console.error('Drafts could not be loaded:', error);
      if (!cancelled) setStatus('error');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const requireStore = useCallback(() => {
    const store = storeRef.current;
    if (!store) throw new Error('Drafts are still loading.');
    return store;
  }, []);

  const openDraft = useCallback((id: string) => {
    requireStore().activate(id);
    setActiveId(id);
  }, [requireStore]);

  const createDraft = useCallback(async (input: NewDraftInput) => {
    const store = requireStore();
    const draft = await store.create(input);
    store.activate(draft.id);
    setDrafts(current => replaceDraft(current, draft));
    setActiveId(draft.id);
    return draft;
  }, [requireStore]);

  const saveDraftDocument = useCallback(async (draft: ProfileDraft, document: JSONContent) => {
    try {
      const saved = await requireStore().saveDocument(draft, document);
      saveFailedRef.current = false;
      setDrafts(current => replaceDraft(current, saved));
    } catch (error) {
      console.error('Draft could not be saved:', error);
      // Autosave runs on every pause in typing; only say so once per failure streak.
      if (!saveFailedRef.current) {
        toast('This draft could not be saved in your browser. Back up your drafts to keep a copy.', 'error');
      }
      saveFailedRef.current = true;
    }
  }, [requireStore]);

  const updateDraftDetails = useCallback(async (id: string, details: DraftDetails) => {
    const updated = await requireStore().updateDetails(id, details);
    if (updated) setDrafts(current => replaceDraft(current, updated));
  }, [requireStore]);

  const duplicateDraft = useCallback(async (id: string) => {
    const copy = await requireStore().duplicate(id);
    if (copy) setDrafts(current => replaceDraft(current, copy));
  }, [requireStore]);

  const deleteDraft = useCallback(async (id: string) => {
    const store = requireStore();
    await store.remove(id);
    setDrafts(current => current.filter(draft => draft.id !== id));
    if (id !== activeId) return;

    // The editor always needs a draft, so open the next one (or a fresh one).
    const next = await store.openActive();
    setDrafts(current => replaceDraft(current, next));
    setActiveId(next.id);
  }, [activeId, requireStore]);

  const backupDrafts = useCallback(() => requireStore().backup(), [requireStore]);

  const restoreDrafts = useCallback(async (text: string) => {
    const store = requireStore();
    const merge = await store.restore(text);
    setDrafts(await store.list());
    return merge;
  }, [requireStore]);

  const activeDraft = useMemo(
    () => drafts.find(draft => draft.id === activeId) ?? null,
    [activeId, drafts],
  );

  const value = useMemo<ProfileDrafts>(() => ({
    status,
    persistent,
    drafts,
    activeDraft,
    openDraft,
    createDraft,
    saveDraftDocument,
    updateDraftDetails,
    duplicateDraft,
    deleteDraft,
    backupDrafts,
    restoreDrafts,
  }), [
    status, persistent, drafts, activeDraft,
    openDraft, createDraft, saveDraftDocument, updateDraftDetails,
    duplicateDraft, deleteDraft, backupDrafts, restoreDrafts,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfileDrafts() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProfileDrafts must be used inside <ProfileDraftsProvider>');
  return ctx;
}
