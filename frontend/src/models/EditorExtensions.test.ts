import { findDuplicates, getSchema, resolveExtensions } from '@tiptap/core';
import { describe, expect, it } from 'vitest';

import { createEditorExtensions } from './EditorExtensions';

describe('editor extensions', () => {
  it('registers every resolved extension name once', () => {
    const names = resolveExtensions(createEditorExtensions()).map(extension => extension.name);

    expect(findDuplicates(names)).toEqual([]);
  });

  it('registers eicons as selectable, draggable inline atoms', () => {
    const schema = getSchema(createEditorExtensions());
    const eicon = schema.nodes.eicon;

    expect(eicon.isInline).toBe(true);
    expect(eicon.isAtom).toBe(true);
    expect(eicon.spec.selectable).toBe(true);
    expect(eicon.spec.draggable).toBe(true);
  });

  it('prioritizes dropdown shortcuts over the default hard-break shortcut', () => {
    const collapsible = resolveExtensions(createEditorExtensions())
      .find(extension => extension.name === 'collapsible');

    expect(collapsible?.config.priority).toBe(1000);
  });
});
