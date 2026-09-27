import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { toBBCode } from '../utilities/BBCodeParser';
import { createEditorExtensions } from './EditorExtensions';
import { toggleFListTextScript } from './TextScript';
import { toggleFListTextSize } from './TextSize';

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function createTextEditor(text: string): Editor {
  editor = new Editor({
    extensions: createEditorExtensions(),
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] },
  });
  editor.commands.setTextSelection({ from: 1, to: text.length + 1 });
  return editor;
}

function markNames(currentEditor: Editor): string[] {
  const names: string[] = [];
  currentEditor.state.doc.descendants(node => {
    if (node.isText) names.push(...node.marks.map(mark => mark.type.name));
  });
  return names;
}

describe('F-list size and script exclusivity', () => {
  it.each([
    { size: 'big', script: 'superscript', tag: 'sup', scriptFirst: true },
    { size: 'big', script: 'subscript', tag: 'sub', scriptFirst: false },
    { size: 'small', script: 'superscript', tag: 'sup', scriptFirst: false },
    { size: 'small', script: 'subscript', tag: 'sub', scriptFirst: true },
  ] as const)('keeps only the last-applied format for $size and $script', ({
    size,
    script,
    tag,
    scriptFirst,
  }) => {
    const currentEditor = createTextEditor('Exclusive');

    if (scriptFirst) {
      expect(toggleFListTextScript(currentEditor, script)).toBe(true);
      expect(toggleFListTextSize(currentEditor, size)).toBe(true);
    } else {
      expect(toggleFListTextSize(currentEditor, size)).toBe(true);
      expect(toggleFListTextScript(currentEditor, script)).toBe(true);
    }

    if (scriptFirst) {
      expect(markNames(currentEditor)).toContain('textStyle');
      expect(markNames(currentEditor)).not.toContain(script);
      expect(toBBCode(currentEditor.state.doc)).toBe(`[${size}]Exclusive[/${size}]`);
    } else {
      expect(markNames(currentEditor)).toContain(script);
      expect(markNames(currentEditor)).not.toContain('textStyle');
      expect(toBBCode(currentEditor.state.doc)).toBe(`[${tag}]Exclusive[/${tag}]`);
    }
  });

  it('switches between subscript and superscript and leaves no size behind', () => {
    const currentEditor = createTextEditor('Switch');
    toggleFListTextSize(currentEditor, 'big');
    toggleFListTextScript(currentEditor, 'subscript');

    expect(toggleFListTextScript(currentEditor, 'superscript')).toBe(true);

    expect(markNames(currentEditor)).toContain('superscript');
    expect(markNames(currentEditor)).not.toContain('subscript');
    expect(markNames(currentEditor)).not.toContain('textStyle');
    expect(toBBCode(currentEditor.state.doc)).toBe('[sup]Switch[/sup]');
  });

  it('removes only font size when applying a script and preserves colour', () => {
    const currentEditor = createTextEditor('Colour');
    currentEditor.chain().setColor('#ff4444').run();
    toggleFListTextSize(currentEditor, 'big');

    expect(toggleFListTextScript(currentEditor, 'subscript')).toBe(true);

    const textNode = currentEditor.state.doc.firstChild?.firstChild;
    const textStyle = textNode?.marks.find(mark => mark.type.name === 'textStyle');
    expect(textStyle?.attrs).toMatchObject({ color: '#ff4444', fontSize: null });
    expect(markNames(currentEditor)).toContain('subscript');
    expect(toBBCode(currentEditor.state.doc)).not.toContain('[big]');
    expect(toBBCode(currentEditor.state.doc)).toContain('[sub]');
  });

  it('uses the exclusive format for subsequent typing at a caret', () => {
    const currentEditor = createTextEditor('Before');
    currentEditor.commands.setTextSelection(7);
    toggleFListTextSize(currentEditor, 'small');

    expect(toggleFListTextScript(currentEditor, 'superscript')).toBe(true);

    const storedNames = currentEditor.state.storedMarks?.map(mark => mark.type.name) ?? [];
    expect(storedNames).toContain('superscript');
    expect(storedNames).not.toContain('textStyle');

    currentEditor.view.dispatch(currentEditor.state.tr.insertText('X'));
    expect(toBBCode(currentEditor.state.doc)).toBe('Before[sup]X[/sup]');
  });
});
