import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { createEditorExtensions } from './EditorExtensions';
import { toggleFListTextScript } from './TextScript';
import { getActiveFListTextSize, toggleFListTextSize } from './TextSize';

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function createSizeEditor(): Editor {
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

describe('F-list text sizing', () => {
  it('applies big to only the selection and preserves its colour', () => {
    const currentEditor = createSizeEditor();
    currentEditor.commands.setTextSelection({ from: 2, to: 5 });

    expect(toggleFListTextSize(currentEditor, 'big')).toBe(true);

    expect(textStyleFor('b')).toMatchObject({ color: '#ff4444', fontSize: null });
    expect(textStyleFor('efo')).toMatchObject({ color: '#ff4444', fontSize: '1.4em' });
    expect(textStyleFor('re')).toMatchObject({ color: '#ff4444', fontSize: null });
    expect(textStyleFor('target')).toMatchObject({ color: '#44ff44', fontSize: '1.4em' });
    expect(textStyleFor('after')).toMatchObject({ color: '#1e90ff', fontSize: '0.8em' });
  });

  it('toggles an already-big selection back to normal without clearing colour', () => {
    const currentEditor = createSizeEditor();
    currentEditor.commands.setTextSelection({ from: 7, to: 13 });

    expect(getActiveFListTextSize(currentEditor.state)).toBe('big');
    expect(toggleFListTextSize(currentEditor, 'big')).toBe(true);

    expect(textStyleFor('target')).toMatchObject({ color: '#44ff44', fontSize: null });
    expect(textStyleFor('after')).toMatchObject({ color: '#1e90ff', fontSize: '0.8em' });
  });

  it('removes script formatting when applying a size and preserves colour', () => {
    const currentEditor = createSizeEditor();
    currentEditor.commands.setTextSelection({ from: 7, to: 13 });
    toggleFListTextScript(currentEditor, 'subscript');

    expect(toggleFListTextSize(currentEditor, 'small')).toBe(true);

    const target = currentEditor.state.doc.firstChild?.child(1);
    expect(target?.marks.map(mark => mark.type.name)).not.toContain('subscript');
    expect(target?.marks.map(mark => mark.type.name)).not.toContain('superscript');
    expect(textStyleFor('target')).toMatchObject({ color: '#44ff44', fontSize: '0.8em' });
  });

  it('changes only the size for following typing at a caret', () => {
    const currentEditor = createSizeEditor();
    currentEditor.commands.setTextSelection(10);
    const documentBefore = currentEditor.getJSON();

    expect(toggleFListTextSize(currentEditor, 'small')).toBe(true);
    expect(currentEditor.getJSON()).toEqual(documentBefore);
    expect(currentEditor.state.storedMarks?.find(mark => mark.type.name === 'textStyle')?.attrs)
      .toMatchObject({ color: '#44ff44', fontSize: '0.8em' });

    currentEditor.view.dispatch(currentEditor.state.tr.insertText('X'));

    expect(textStyleFor('X')).toMatchObject({ color: '#44ff44', fontSize: '0.8em' });
    expect(textStyleFor('before')).toMatchObject({ color: '#ff4444' });
    expect(textStyleFor('after')).toMatchObject({ color: '#1e90ff', fontSize: '0.8em' });
  });

  it('does not report an active size for a mixed selection', () => {
    const currentEditor = createSizeEditor();
    currentEditor.commands.setTextSelection({ from: 7, to: 18 });

    expect(getActiveFListTextSize(currentEditor.state)).toBeNull();
  });
});
