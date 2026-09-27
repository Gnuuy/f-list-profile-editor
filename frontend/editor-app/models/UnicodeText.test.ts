import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { toBBCode } from '../utilities/BBCodeParser';
import { createEditorExtensions } from './EditorExtensions';
import {
  applyUnicodeTextStyle,
  detectUnicodeTextStyle,
  selectedUnicodeTextStyle,
  transformUnicodeText,
} from './UnicodeText';

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe('Unicode text styles', () => {
  it('transforms common Latin letters and digits using mathematical Unicode alphabets', () => {
    expect(transformUnicodeText('Profile 123', 'serif-bold')).toBe('𝐏𝐫𝐨𝐟𝐢𝐥𝐞 𝟏𝟐𝟑');
    expect(transformUnicodeText('Profile', 'script')).toBe('𝒫𝓇ℴ𝒻𝒾𝓁ℯ');
    expect(transformUnicodeText('Profile 123', 'monospace')).toBe('𝙿𝚛𝚘𝚏𝚒𝚕𝚎 𝟷𝟸𝟹');
  });

  it('can change an existing Unicode style or restore normal text', () => {
    const bold = transformUnicodeText('Hello', 'sans-bold');

    expect(transformUnicodeText(bold, 'fraktur')).toBe('ℌ𝔢𝔩𝔩𝔬');
    expect(transformUnicodeText(bold, 'normal')).toBe('Hello');
  });

  it('detects uniform, normal, and mixed selections', () => {
    expect(detectUnicodeTextStyle('𝙼𝚘𝚗𝚘 123')).toBe('monospace');
    expect(detectUnicodeTextStyle('Normal 123')).toBe('normal');
    expect(detectUnicodeTextStyle('Normal 𝙼𝚘𝚗𝚘')).toBeNull();
  });

  it('changes only selected text while preserving BBCode marks', () => {
    editor = new Editor({
      extensions: createEditorExtensions(),
      content: {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: 'Before Target After',
            marks: [{ type: 'italic' }],
          }],
        }],
      },
    });
    editor.commands.setTextSelection({ from: 8, to: 14 });

    expect(applyUnicodeTextStyle(editor, 'double-struck')).toBe(true);
    expect(editor.getText()).toBe('Before 𝕋𝕒𝕣𝕘𝕖𝕥 After');
    expect(toBBCode(editor.state.doc)).toBe('[i]Before 𝕋𝕒𝕣𝕘𝕖𝕥 After[/i]');
  });

  it('stores the selected Unicode style for subsequent typing at a caret', () => {
    editor = new Editor({
      extensions: createEditorExtensions(),
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
      },
    });
    editor.commands.setTextSelection(2);
    const documentBefore = editor.getJSON();

    expect(applyUnicodeTextStyle(editor, 'sans-bold')).toBe(true);
    expect(editor.getJSON()).toEqual(documentBefore);
    expect(selectedUnicodeTextStyle(editor)).toBe('sans-bold');
  });
});
