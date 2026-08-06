import { describe, expect, it } from 'vitest';

import { getFListEiconUrl, normalizeEiconName } from './Eicon';

describe('eicon model', () => {
  it('normalizes names and builds the canonical F-list image URL', () => {
    expect(normalizeEiconName(' R03Chug ')).toBe('r03chug');
    expect(getFListEiconUrl(' R03Chug ')).toBe(
      'https://static.f-list.net/images/eicon/r03chug.gif',
    );
  });

  it('rejects empty or BBCode-breaking names', () => {
    expect(normalizeEiconName('   ')).toBeNull();
    expect(normalizeEiconName('name[/eicon]')).toBeNull();
    expect(getFListEiconUrl('name\nother')).toBeNull();
  });
});
