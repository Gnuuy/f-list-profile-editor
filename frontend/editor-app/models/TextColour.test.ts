import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { createEditorExtensions } from './EditorExtensions';
import { clearTextColour } from './TextColour';

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function createColourEditor(): Editor {
  editor = new Editor({
    extensions: createEditorExtensions(),
    content: {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'before',
            marks: [{ type: 'textStyle', attrs: { color: '#ff4444' } }],
          },
          {
            type: 'text',
            text: 'target',
            marks: [{
              type: 'textStyle',
              attrs: { color: '#44ff44', fontSize: '1.4em' },
            }],
          },
          {
            type: 'text',
            text: 'after',
            marks: [{
              type: 'textStyle',
              attrs: { color: '#1e90ff', fontSize: '0.8em' },
            }],
          },
        ],
      }],
    },
  });
  return editor;
}

function textStyleFor(value: string) {
  let attributes: Record<string, unknown> | null = null;

  editor?.state.doc.descendants(node => {
    if (node.isText && node.text === value) {
      attributes = node.marks.find(mark => mark.type.name === 'textStyle')?.attrs ?? null;
      return false;
    }
    return true;
  });

  return attributes;
}

describe('clearTextColour', () => {
  it('splits a single coloured run at the selection boundaries', () => {
    editor = new Editor({
      extensions: createEditorExtensions(),
      content: {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: 'abcdef',
            marks: [{
              type: 'textStyle',
              attrs: { color: '#ff4444', fontSize: '1.4em' },
            }],
          }],
        }],
      },
    });
    editor.commands.setTextSelection({ from: 3, to: 5 });

    expect(clearTextColour(editor)).toBe(true);

    const runs: Array<{ text: string; color: unknown; fontSize: unknown }> = [];
    editor.state.doc.firstChild?.forEach(node => {
      const style = node.marks.find(mark => mark.type.name === 'textStyle');
      runs.push({
        text: node.textContent,
        color: style?.attrs.color ?? null,
        fontSize: style?.attrs.fontSize ?? null,
      });
    });
    expect(runs).toEqual([
      { text: 'ab', color: '#ff4444', fontSize: '1.4em' },
      { text: 'cd', color: null, fontSize: '1.4em' },
      { text: 'ef', color: '#ff4444', fontSize: '1.4em' },
    ]);
  });

  it('clears only selected colour and preserves font size and surrounding colours', () => {
    const currentEditor = createColourEditor();
    currentEditor.commands.setTextSelection({ from: 7, to: 13 });

    expect(clearTextColour(currentEditor)).toBe(true);

    expect(textStyleFor('before')).toMatchObject({ color: '#ff4444' });
    expect(textStyleFor('target')).toMatchObject({ color: null, fontSize: '1.4em' });
    expect(textStyleFor('after')).toMatchObject({ color: '#1e90ff', fontSize: '0.8em' });
  });

  it('changes only the following typing colour at a caret', () => {
    const currentEditor = createColourEditor();
    currentEditor.commands.setTextSelection(10);
    const documentBefore = currentEditor.getJSON();

    expect(clearTextColour(currentEditor)).toBe(true);
    expect(currentEditor.getJSON()).toEqual(documentBefore);
    expect(currentEditor.state.storedMarks?.find(mark => mark.type.name === 'textStyle')?.attrs)
      .toMatchObject({ color: null, fontSize: '1.4em' });

    currentEditor.view.dispatch(currentEditor.state.tr.insertText('X'));

    expect(textStyleFor('X')).toMatchObject({ color: null, fontSize: '1.4em' });
    expect(textStyleFor('before')).toMatchObject({ color: '#ff4444' });
    expect(textStyleFor('after')).toMatchObject({ color: '#1e90ff', fontSize: '0.8em' });
  });
});
