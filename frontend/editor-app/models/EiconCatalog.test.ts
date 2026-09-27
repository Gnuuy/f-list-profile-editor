import { describe, expect, it } from 'vitest';

import {
  normalizeEiconSearch,
  parseEiconDatabase,
  searchEicons,
} from './EiconCatalog';

describe('eicon catalog', () => {
  it('parses Xariah database records, metadata, and duplicate names', () => {
    expect(parseEiconDatabase([
      '# Eicon database',
      '# As Of: 1786000000',
      'R03Chug\tmetadata',
      'another eicon\tmetadata',
      'r03chug\tduplicate',
      '',
    ].join('\n'))).toEqual({
      names: ['r03chug', 'another eicon'],
      asOfTimestamp: 1786000000,
    });
  });

  it('accepts a pasted eicon tag as a search query', () => {
    expect(normalizeEiconSearch(' [eicon]R03Chug[/eicon] ')).toBe('r03chug');
  });

  it('puts prefix matches before other substring matches', () => {
    expect(searchEicons(
      ['not-a-cat', 'catwave', 'a-cat', 'cat', 'dog'],
      'cat',
    )).toEqual(['cat', 'catwave', 'a-cat', 'not-a-cat']);
  });
});
