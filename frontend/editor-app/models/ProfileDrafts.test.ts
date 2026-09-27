import { describe, expect, it } from 'vitest';

import {
  createProfileDraft,
  describeDraftRestore,
  describeLastEdited,
  draftCharacter,
  groupDraftsByCharacter,
  mergeDraftBackup,
  normalizeDraftName,
  parseDraftBackup,
  serializeDraftBackup,
  UNTITLED_DRAFT_NAME,
} from './ProfileDrafts';

const doc = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

function draft(id: string, character: string | null, updatedAt: number) {
  return createProfileDraft(
    { name: id, character: draftCharacter(character), document: doc(id) },
    updatedAt,
    id,
  );
}

describe('profile drafts', () => {
  it('builds F-list character details from a name', () => {
    expect(draftCharacter('FKLR-R03')).toEqual({
      name: 'FKLR-R03',
      profileUrl: 'https://www.f-list.net/c/fklr-r03/',
      avatarUrl: 'https://static.f-list.net/images/avatar/fklr-r03.png',
    });
    expect(draftCharacter('../avatar')).toBeNull();
    expect(draftCharacter('')).toBeNull();
  });

  it('tidies draft names and falls back to a default', () => {
    expect(normalizeDraftName('  Winter   event  ')).toBe('Winter event');
    expect(normalizeDraftName('   ')).toBe(UNTITLED_DRAFT_NAME);
    expect(normalizeDraftName('x'.repeat(200))).toHaveLength(80);
  });

  it('groups drafts by character, sorted by name, with no character last', () => {
    const groups = groupDraftsByCharacter([
      draft('loose', null, 5),
      draft('zed-old', 'Zed', 1),
      draft('alice', 'alice', 2),
      draft('zed-new', 'zed', 9),
    ]);

    expect(groups.map(group => group.character?.name ?? null)).toEqual(['alice', 'zed', null]);
    // Names match case-insensitively and the newest draft comes first.
    expect(groups[1].drafts.map(d => d.id)).toEqual(['zed-new', 'zed-old']);
  });

  it('describes when a draft was last edited', () => {
    const now = Date.UTC(2026, 8, 27, 12);
    expect(describeLastEdited(now - 20_000, now, 'en')).toBe('Edited just now');
    expect(describeLastEdited(now - 5 * 60_000, now, 'en')).toBe('Edited 5 minutes ago');
    expect(describeLastEdited(now - 3 * 3_600_000, now, 'en')).toBe('Edited 3 hours ago');
    expect(describeLastEdited(now - 26 * 3_600_000, now, 'en')).toBe('Edited yesterday');
    expect(describeLastEdited(Date.UTC(2026, 0, 2, 12), now, 'en')).toBe('Edited Jan 2, 2026');
  });

  it('round-trips drafts through a backup file', () => {
    const drafts = [draft('a', 'Alice', 10), draft('b', null, 20)];
    expect(parseDraftBackup(serializeDraftBackup(drafts, 30))).toEqual(drafts);
  });

  it('rejects files that are not valid backups', () => {
    expect(() => parseDraftBackup('not json')).toThrow(/not an F-list Profile Editor drafts backup/);
    expect(() => parseDraftBackup('{"drafts": []}')).toThrow(/not an F-list Profile Editor drafts backup/);
    expect(() => parseDraftBackup(JSON.stringify({
      format: 'f-list-profile-editor-drafts', version: 2, drafts: [],
    }))).toThrow(/newer version/);
    expect(() => parseDraftBackup(JSON.stringify({
      format: 'f-list-profile-editor-drafts', version: 1, drafts: [{ id: 'x', name: 'x' }],
    }))).toThrow(/Draft 1 in this backup is damaged/);
  });

  it('rebuilds character links from the name instead of trusting the file', () => {
    const [restored] = parseDraftBackup(JSON.stringify({
      format: 'f-list-profile-editor-drafts',
      version: 1,
      drafts: [{
        ...draft('a', 'Alice', 10),
        character: { name: 'Alice', avatarUrl: 'https://evil.example/tracker.png' },
      }],
    }));
    expect(restored.character?.avatarUrl).toBe('https://static.f-list.net/images/avatar/alice.png');
  });

  it('merges a backup without overwriting newer local edits', () => {
    const local = [draft('kept', null, 50), draft('stale', null, 10)];
    const backup = [draft('kept', null, 40), draft('stale', null, 20), draft('new', null, 5)];

    const merge = mergeDraftBackup(local, backup);

    expect(merge.changed.map(d => d.id)).toEqual(['stale', 'new']);
    expect(merge).toMatchObject({ added: 1, updated: 1, unchanged: 1 });
    expect(describeDraftRestore(merge)).toBe('Restored backup: 1 new draft, 1 updated, 1 already up to date.');
  });
});
