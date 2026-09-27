import type { JSONContent } from '@tiptap/core';

import {
  characterAvatarUrl,
  fListCharacterLocation,
} from './FListProfile';

export type DraftCharacter = {
  name: string;
  profileUrl: string;
  avatarUrl: string;
};

export type ProfileDraft = {
  id: string;
  name: string;
  character: DraftCharacter | null;
  document: JSONContent;
  createdAt: number;
  updatedAt: number;
};

export type DraftDetails = {
  name: string;
  character: DraftCharacter | null;
};

export type DraftGroup = {
  /** Lower-cased character name, or '' for drafts without a character. */
  key: string;
  character: DraftCharacter | null;
  drafts: ProfileDraft[];
};

export type DraftBackupMerge = {
  /** Drafts to write: new ones, and ones the backup has a newer copy of. */
  changed: ProfileDraft[];
  added: number;
  updated: number;
  unchanged: number;
};

export const UNTITLED_DRAFT_NAME = 'Untitled draft';

export const DEFAULT_DRAFT_DOCUMENT: JSONContent = {
  type: 'doc',
  content: [{
    type: 'paragraph',
    content: [{ type: 'text', text: 'Welcome to the Funny Site WYSIWYG Profile Editor!' }],
  }],
};

const MAX_DRAFT_NAME_LENGTH = 80;
const BACKUP_FORMAT = 'f-list-profile-editor-drafts';
const BACKUP_VERSION = 1;
const NOT_A_BACKUP = 'That file is not an F-list Profile Editor drafts backup.';

export function draftCharacter(name: string | null | undefined): DraftCharacter | null {
  if (!name) return null;
  const location = fListCharacterLocation(name);
  const avatarUrl = characterAvatarUrl(name);
  return location && avatarUrl
    ? { name: location.character, profileUrl: location.url, avatarUrl }
    : null;
}

export function normalizeDraftName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_DRAFT_NAME_LENGTH) || UNTITLED_DRAFT_NAME;
}

export function newDraftId(): string {
  // randomUUID only exists in secure contexts, e.g. not on plain-HTTP hosts.
  return globalThis.crypto?.randomUUID?.()
    ?? `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createProfileDraft(
  input: { name?: string; character?: DraftCharacter | null; document?: JSONContent },
  now = Date.now(),
  id = newDraftId(),
): ProfileDraft {
  return {
    id,
    name: normalizeDraftName(input.name ?? ''),
    character: input.character ?? null,
    document: input.document ?? DEFAULT_DRAFT_DOCUMENT,
    createdAt: now,
    updatedAt: now,
  };
}

export function importedDraftName(
  kind: 'profile' | 'bbcode',
  now = Date.now(),
  locale?: string,
): string {
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(now);
  return kind === 'profile' ? `Imported ${date}` : `Pasted BBCode ${date}`;
}

/**
 * Characters sorted by name with "no character" last; each character's drafts
 * are sorted most recently edited first.
 */
export function groupDraftsByCharacter(drafts: readonly ProfileDraft[]): DraftGroup[] {
  const groups = new Map<string, DraftGroup>();
  const byRecent = [...drafts].sort((a, b) => b.updatedAt - a.updatedAt);

  for (const draft of byRecent) {
    const key = draft.character?.name.toLowerCase() ?? '';
    const group = groups.get(key);
    if (group) {
      group.drafts.push(draft);
    } else {
      groups.set(key, { key, character: draft.character, drafts: [draft] });
    }
  }

  return [...groups.values()].sort((a, b) => {
    if (!a.character) return 1;
    if (!b.character) return -1;
    return a.character.name.localeCompare(b.character.name, undefined, { sensitivity: 'base' });
  });
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function describeLastEdited(updatedAt: number, now = Date.now(), locale?: string): string {
  const elapsed = Math.max(0, now - updatedAt);
  if (elapsed < MINUTE) return 'Edited just now';

  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (elapsed < HOUR) return `Edited ${relative.format(-Math.floor(elapsed / MINUTE), 'minute')}`;
  if (elapsed < DAY) return `Edited ${relative.format(-Math.floor(elapsed / HOUR), 'hour')}`;
  if (elapsed < 7 * DAY) return `Edited ${relative.format(-Math.floor(elapsed / DAY), 'day')}`;
  return `Edited ${new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(updatedAt)}`;
}

export function serializeDraftBackup(drafts: readonly ProfileDraft[], now = Date.now()): string {
  return JSON.stringify(
    { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now, drafts },
    null,
    2,
  );
}

export function parseDraftBackup(text: string): ProfileDraft[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(NOT_A_BACKUP);
  }
  if (!isRecord(data) || data.format !== BACKUP_FORMAT || !Array.isArray(data.drafts)) {
    throw new Error(NOT_A_BACKUP);
  }
  if (typeof data.version === 'number' && data.version > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of the editor.');
  }
  if (data.version !== BACKUP_VERSION) throw new Error(NOT_A_BACKUP);

  return data.drafts.map((raw, index) => {
    const draft = toProfileDraft(raw);
    if (!draft) throw new Error(`Draft ${index + 1} in this backup is damaged, so nothing was restored.`);
    return draft;
  });
}

/** Validates an untrusted draft. Character links are rebuilt from the name. */
export function toProfileDraft(raw: unknown): ProfileDraft | null {
  if (!isRecord(raw)) return null;
  const { id, name, character, document, createdAt, updatedAt } = raw;
  if (
    typeof id !== 'string'
    || !id
    || typeof name !== 'string'
    || !isRecord(document)
    || document.type !== 'doc'
    || !isTimestamp(createdAt)
    || !isTimestamp(updatedAt)
  ) {
    return null;
  }

  let restoredCharacter: DraftCharacter | null = null;
  if (character !== null && character !== undefined) {
    if (!isRecord(character) || typeof character.name !== 'string') return null;
    restoredCharacter = draftCharacter(character.name);
    if (!restoredCharacter) return null;
  }

  return {
    id,
    name: normalizeDraftName(name),
    character: restoredCharacter,
    document: document as JSONContent,
    createdAt,
    updatedAt,
  };
}

/** A backup never overwrites a draft that was edited more recently here. */
export function mergeDraftBackup(
  existing: readonly ProfileDraft[],
  incoming: readonly ProfileDraft[],
): DraftBackupMerge {
  const current = new Map(existing.map(draft => [draft.id, draft]));
  const merge: DraftBackupMerge = { changed: [], added: 0, updated: 0, unchanged: 0 };

  for (const draft of incoming) {
    const match = current.get(draft.id);
    if (!match) {
      merge.added += 1;
    } else if (draft.updatedAt > match.updatedAt) {
      merge.updated += 1;
    } else {
      merge.unchanged += 1;
      continue;
    }
    merge.changed.push(draft);
    current.set(draft.id, draft);
  }

  return merge;
}

export function describeDraftRestore({ added, updated, unchanged }: DraftBackupMerge): string {
  const parts = [
    added > 0 && `${added} new draft${added === 1 ? '' : 's'}`,
    updated > 0 && `${updated} updated`,
    unchanged > 0 && `${unchanged} already up to date`,
  ].filter(Boolean);
  return parts.length > 0 ? `Restored backup: ${parts.join(', ')}.` : 'That backup has no drafts in it.';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
