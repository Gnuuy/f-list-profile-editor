import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { toBBCode } from '../utilities/BBCodeParser';
import { createEditorExtensions } from './EditorExtensions';
import { insertFListHorizontalRule } from './HorizontalRuleSpacing';

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function createTextEditor(): Editor {
  editor = new Editor({
    extensions: createEditorExtensions(),
    content: {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: 'test' }],
      }],
    },
  });
  editor.commands.setTextSelection(1);
  return editor;
}

describe('horizontal rule spacing', () => {
  it.each([
    ['spaced', true, '[hr]\ntest'],
    ['tight', false, '[hr]test'],
  ] as const)(
    'inserts a %s rule with the matching F-list boundary',
    (spacing, breakAfter, expectedBBCode) => {
      const currentEditor = createTextEditor();

      expect(insertFListHorizontalRule(currentEditor, spacing)).toBe(true);
      expect(currentEditor.getJSON().content?.[0]).toMatchObject({
        type: 'horizontalRule',
        attrs: { fListBreakAfter: breakAfter },
      });
      expect(toBBCode(currentEditor.state.doc)).toBe(expectedBBCode);
    },
  );

  it('sets spacing in the same document update as insertion', () => {
    const currentEditor = createTextEditor();
    let documentUpdates = 0;
    currentEditor.on('update', () => {
      documentUpdates += 1;
    });

    insertFListHorizontalRule(currentEditor, 'tight');
    expect(documentUpdates).toBe(1);
  });
});
