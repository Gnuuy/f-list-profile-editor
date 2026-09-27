import { getSchema } from '@tiptap/core';
import type { JSONContent } from '@tiptap/core';
import { EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state';
import { describe, expect, it } from 'vitest';

import {
  blockDropPosition,
  childBlockPositions,
  findBlockAtY,
  findInnermostBlockAtY,
  moveBlock,
  topLevelBlockPositions,
} from './BlockDrag';
import { hasFormattableSelection } from './BubbleMenu';
import { createEditorExtensions } from './EditorExtensions';

const schema = getSchema(createEditorExtensions());
const paragraph = (text: string): JSONContent => ({ type: 'paragraph', content: [{ type: 'text', text }] });

const flat = schema.nodeFromJSON({
  type: 'doc',
  content: [paragraph('First'), { type: 'horizontalRule' }, paragraph('Last')],
});

// Intro, an open dropdown (with a paragraph and a quote), a closed dropdown, Outro.
const nested = schema.nodeFromJSON({
  type: 'doc',
  content: [
    paragraph('Intro'),
    {
      type: 'collapsible',
      attrs: { title: 'Open', collapsed: false },
      content: [paragraph('Inside'), { type: 'blockquote', content: [paragraph('Quoted')] }],
    },
    { type: 'collapsible', attrs: { title: 'Shut', collapsed: true }, content: [paragraph('Hidden')] },
    paragraph('Outro'),
  ],
});
const [intro, open, shut, outro] = topLevelBlockPositions(nested);
const [inside, quote] = childBlockPositions(nested.nodeAt(open)!, open);
const [quoted] = childBlockPositions(nested.nodeAt(quote)!, quote);
const [hidden] = childBlockPositions(nested.nodeAt(shut)!, shut);

const texts = (node: { forEach: (fn: (child: { textContent: string }) => void) => void }) => {
  const result: string[] = [];
  node.forEach(child => result.push(child.textContent));
  return result;
};

describe('finding the block under the pointer', () => {
  it('lists the position of every top-level block', () => {
    expect(topLevelBlockPositions(flat)).toEqual([0, 7, 8]);
  });

  it('finds the block at a height, and none between or outside blocks', () => {
    const bounds: Record<number, { top: number; bottom: number }> = {
      0: { top: 0, bottom: 15 },
      7: { top: 21, bottom: 23 },
      8: { top: 30, bottom: 45 },
    };
    const at = (y: number) => findBlockAtY(topLevelBlockPositions(flat), position => bounds[position], y);

    expect([at(5), at(22), at(45)]).toEqual([0, 7, 8]);
    expect([at(18), at(-4), at(90)]).toEqual([null, null, null]);
  });

  it('finds blocks inside open dropdowns and quotes, but not closed dropdowns', () => {
    const bounds: Record<number, { top: number; bottom: number }> = {
      [intro]: { top: 0, bottom: 10 },
      [open]: { top: 20, bottom: 100 },
      [inside]: { top: 40, bottom: 50 },
      [quote]: { top: 60, bottom: 90 },
      [quoted]: { top: 70, bottom: 80 },
      [shut]: { top: 110, bottom: 125 },
      [hidden]: { top: 112, bottom: 120 },
      [outro]: { top: 150, bottom: 160 },
    };
    const at = (y: number) => findInnermostBlockAtY(nested, position => bounds[position], y);

    expect(at(5)).toBe(intro);
    expect(at(25)).toBe(open); // the dropdown's header
    expect(at(45)).toBe(inside);
    expect(at(62)).toBe(quote); // the quote's header
    expect(at(75)).toBe(quoted);
    expect(at(115)).toBe(shut);
    expect(at(155)).toBe(outro);
  });
});

describe('dropping a block', () => {
  it('drops into an open dropdown, before or after the block under the pointer', () => {
    expect(blockDropPosition(nested, outro, inside + 1)).toBe(inside);
  });

  it('refuses drops into a closed dropdown, into itself, or where it already is', () => {
    expect(blockDropPosition(nested, outro, hidden + 1)).toBeNull();
    expect(blockDropPosition(nested, open, inside + 1)).toBeNull();
    expect(blockDropPosition(nested, intro, intro + 1)).toBeNull();
  });

  it('moves a block into a dropdown and selects it there', () => {
    const state = EditorState.create({ schema, doc: nested });
    const tr = moveBlock(state, outro, inside)!;
    const openDropdown = tr.doc.child(1);

    expect(texts(tr.doc)).toEqual(['Intro', 'OutroInsideQuoted', 'Hidden']);
    expect(texts(openDropdown)).toEqual(['Outro', 'Inside', 'Quoted']);
    expect(tr.selection).toBeInstanceOf(NodeSelection);
    expect((tr.selection as NodeSelection).node.textContent).toBe('Outro');
  });

  it('copies instead of moving when asked', () => {
    const tr = moveBlock(EditorState.create({ schema, doc: nested }), outro, inside, true)!;
    expect(texts(tr.doc).at(-1)).toBe('Outro');
    expect(texts(tr.doc.child(1))).toEqual(['Outro', 'Inside', 'Quoted']);
  });

  it('moves a nested quote out, and leaves an emptied quote with a blank line', () => {
    const state = EditorState.create({ schema, doc: nested });
    const quoteOut = moveBlock(state, quote, intro)!;
    expect(texts(quoteOut.doc)).toEqual(['Quoted', 'Intro', 'Inside', 'Hidden', 'Outro']);

    const lineOut = moveBlock(state, quoted, intro)!;
    const emptiedQuote = lineOut.doc.child(2).child(1);
    expect(emptiedQuote.type.name).toBe('blockquote');
    expect(emptiedQuote.childCount).toBe(1);
    expect(emptiedQuote.textContent).toBe('');
  });
});

describe('bubble menu', () => {
  const state = EditorState.create({ schema, doc: flat });
  const withSelection = (selection: EditorState['selection']) => state.apply(state.tr.setSelection(selection));

  it('appears for selected text only', () => {
    expect(hasFormattableSelection(withSelection(TextSelection.create(flat, 1, 4)))).toBe(true);
    expect(hasFormattableSelection(withSelection(TextSelection.create(flat, 2)))).toBe(false);
    expect(hasFormattableSelection(withSelection(NodeSelection.create(flat, 7)))).toBe(false);
  });
});
