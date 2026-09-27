import type { Editor } from '@tiptap/core';
import { Extension } from '@tiptap/core';
import type { Mark } from '@tiptap/pm/model';
import { Plugin } from '@tiptap/pm/state';

export type UnicodeTextStyle =
  | 'normal'
  | 'serif-bold'
  | 'serif-italic'
  | 'serif-bold-italic'
  | 'sans'
  | 'sans-bold'
  | 'sans-italic'
  | 'sans-bold-italic'
  | 'script'
  | 'script-bold'
  | 'fraktur'
  | 'fraktur-bold'
  | 'double-struck'
  | 'monospace';

export type UnicodeTextStyleOption = {
  value: UnicodeTextStyle;
  label: string;
  preview: string;
};

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';

type AlphabetRange = {
  upperStart: number;
  lowerStart: number;
  digitStart?: number;
  upperOverrides?: Record<string, string>;
  lowerOverrides?: Record<string, string>;
};

function alphabetRange({
  upperStart,
  lowerStart,
  digitStart,
  upperOverrides = {},
  lowerOverrides = {},
}: AlphabetRange): ReadonlyMap<string, string> {
  const map = new Map<string, string>();

  Array.from(UPPER).forEach((character, index) => {
    map.set(character, upperOverrides[character] ?? String.fromCodePoint(upperStart + index));
  });
  Array.from(LOWER).forEach((character, index) => {
    map.set(character, lowerOverrides[character] ?? String.fromCodePoint(lowerStart + index));
  });
  if (digitStart !== undefined) {
    Array.from(DIGITS).forEach((character, index) => {
      map.set(character, String.fromCodePoint(digitStart + index));
    });
  }

  return map;
}

const STYLE_MAPS: Record<Exclude<UnicodeTextStyle, 'normal'>, ReadonlyMap<string, string>> = {
  'serif-bold': alphabetRange({
    upperStart: 0x1d400,
    lowerStart: 0x1d41a,
    digitStart: 0x1d7ce,
  }),
  'serif-italic': alphabetRange({
    upperStart: 0x1d434,
    lowerStart: 0x1d44e,
    lowerOverrides: { h: 'ℎ' },
  }),
  'serif-bold-italic': alphabetRange({ upperStart: 0x1d468, lowerStart: 0x1d482 }),
  sans: alphabetRange({
    upperStart: 0x1d5a0,
    lowerStart: 0x1d5ba,
    digitStart: 0x1d7e2,
  }),
  'sans-bold': alphabetRange({
    upperStart: 0x1d5d4,
    lowerStart: 0x1d5ee,
    digitStart: 0x1d7ec,
  }),
  'sans-italic': alphabetRange({ upperStart: 0x1d608, lowerStart: 0x1d622 }),
  'sans-bold-italic': alphabetRange({ upperStart: 0x1d63c, lowerStart: 0x1d656 }),
  script: alphabetRange({
    upperStart: 0x1d49c,
    lowerStart: 0x1d4b6,
    upperOverrides: {
      B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ',
    },
    lowerOverrides: { e: 'ℯ', g: 'ℊ', o: 'ℴ' },
  }),
  'script-bold': alphabetRange({ upperStart: 0x1d4d0, lowerStart: 0x1d4ea }),
  fraktur: alphabetRange({
    upperStart: 0x1d504,
    lowerStart: 0x1d51e,
    upperOverrides: { C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ' },
  }),
  'fraktur-bold': alphabetRange({ upperStart: 0x1d56c, lowerStart: 0x1d586 }),
  'double-struck': alphabetRange({
    upperStart: 0x1d538,
    lowerStart: 0x1d552,
    digitStart: 0x1d7d8,
    upperOverrides: { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' },
  }),
  monospace: alphabetRange({
    upperStart: 0x1d670,
    lowerStart: 0x1d68a,
    digitStart: 0x1d7f6,
  }),
};

const REVERSE_MAP = new Map<string, { plain: string; style: Exclude<UnicodeTextStyle, 'normal'> }>();
Object.entries(STYLE_MAPS).forEach(([style, map]) => {
  map.forEach((styled, plain) => {
    REVERSE_MAP.set(styled, {
      plain,
      style: style as Exclude<UnicodeTextStyle, 'normal'>,
    });
  });
});

export const UNICODE_TEXT_STYLE_OPTIONS: readonly UnicodeTextStyleOption[] = [
  { value: 'normal', label: 'Normal', preview: 'Aa' },
  { value: 'serif-bold', label: 'Serif bold', preview: '𝐀𝐚' },
  { value: 'serif-italic', label: 'Serif italic', preview: '𝐴𝑎' },
  { value: 'serif-bold-italic', label: 'Serif bold italic', preview: '𝑨𝒂' },
  { value: 'sans', label: 'Sans serif', preview: '𝖠𝖺' },
  { value: 'sans-bold', label: 'Sans bold', preview: '𝗔𝗮' },
  { value: 'sans-italic', label: 'Sans italic', preview: '𝘈𝘢' },
  { value: 'sans-bold-italic', label: 'Sans bold italic', preview: '𝘼𝙖' },
  { value: 'script', label: 'Script', preview: '𝒜𝒶' },
  { value: 'script-bold', label: 'Script bold', preview: '𝓐𝓪' },
  { value: 'fraktur', label: 'Fraktur', preview: '𝔄𝔞' },
  { value: 'fraktur-bold', label: 'Fraktur bold', preview: '𝕬𝖆' },
  { value: 'double-struck', label: 'Double struck', preview: '𝔸𝕒' },
  { value: 'monospace', label: 'Monospace', preview: '𝙰𝚊' },
];

export function transformUnicodeText(text: string, style: UnicodeTextStyle): string {
  const target = style === 'normal' ? null : STYLE_MAPS[style];

  return Array.from(text, character => {
    const plain = REVERSE_MAP.get(character)?.plain ?? character;
    return target?.get(plain) ?? plain;
  }).join('');
}

export function detectUnicodeTextStyle(text: string): UnicodeTextStyle | null {
  let detected: UnicodeTextStyle | undefined;

  for (const character of Array.from(text)) {
    const styled = REVERSE_MAP.get(character)?.style;
    const current = styled ?? (/[A-Za-z]/.test(character) ? 'normal' : undefined);
    if (!current) continue;
    if (detected === undefined) detected = current;
    else if (detected !== current) return null;
  }

  return detected ?? 'normal';
}

/**
 * Tiptap clears `editor.storage` while an editor instance is being torn down.
 * React can briefly retain that instance while effects are being replaced,
 * so editor extension storage is not a safe source of truth for toolbar state.
 * A WeakMap keeps the typing mode tied to the live editor without touching a
 * destroyed editor's emptied storage object.
 */
const unicodeTypingStyles = new WeakMap<Editor, UnicodeTextStyle>();

function getUnicodeTypingStyle(editor: Editor): UnicodeTextStyle {
  return unicodeTypingStyles.get(editor) ?? 'normal';
}

export const UnicodeTextTyping = Extension.create({
  name: 'unicodeTextTyping',

  addProseMirrorPlugins() {
    const editor = this.editor;
    if (!unicodeTypingStyles.has(editor)) unicodeTypingStyles.set(editor, 'normal');

    return [new Plugin({
      props: {
        handleTextInput(view, from, to, text) {
          const style = getUnicodeTypingStyle(editor);
          if (style === 'normal') return false;
          view.dispatch(view.state.tr.insertText(transformUnicodeText(text, style), from, to));
          return true;
        },
        transformPastedText(text) {
          const style = getUnicodeTypingStyle(editor);
          return style === 'normal' ? text : transformUnicodeText(text, style);
        },
      },
    })];
  },

  onDestroy() {
    unicodeTypingStyles.delete(this.editor);
  },
});

export function setUnicodeTypingStyle(editor: Editor, style: UnicodeTextStyle): void {
  unicodeTypingStyles.set(editor, style);
}

export function applyUnicodeTextStyle(editor: Editor, style: UnicodeTextStyle): boolean {
  editor.commands.focus();
  setUnicodeTypingStyle(editor, style);

  const { state } = editor;
  if (state.selection.empty) return true;

  const replacements: Array<{
    from: number;
    to: number;
    text: string;
    marks: readonly Mark[];
  }> = [];

  state.selection.ranges.forEach(({ $from, $to }) => {
    state.doc.nodesBetween($from.pos, $to.pos, (node, position) => {
      if (!node.isText || !node.text) return;

      const from = Math.max(position, $from.pos);
      const to = Math.min(position + node.nodeSize, $to.pos);
      if (from >= to) return;

      const selectedText = node.text.slice(from - position, to - position);
      const transformed = transformUnicodeText(selectedText, style);
      if (selectedText === transformed) return;

      replacements.push({ from, to, text: transformed, marks: node.marks });
    });
  });

  const tr = state.tr;
  replacements
    .sort((left, right) => right.from - left.from)
    .forEach(({ from, to, text, marks }) => {
      tr.replaceWith(from, to, state.schema.text(text, marks));
    });

  if (tr.docChanged) editor.view.dispatch(tr.scrollIntoView());
  return true;
}

export function selectedUnicodeTextStyle(editor: Editor): UnicodeTextStyle | null {
  const { selection, doc } = editor.state;
  if (selection.empty) {
    return getUnicodeTypingStyle(editor);
  }

  return detectUnicodeTextStyle(doc.textBetween(selection.from, selection.to, ' '));
}
