import { getSchema } from '@tiptap/core';
import type { JSONContent } from '@tiptap/core';
import { EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state';
import { describe, expect, it } from 'vitest';

import { toBBCode } from '../utilities/BBCodeParser';
import { importBBCode } from './BBCodeImporter';
import { createEditorExtensions } from './EditorExtensions';
import {
  applyTextAlignment,
  createLegacyAlignmentPlugin,
  getActiveTextAlignment,
  splitAlignmentMarksIntoLines,
  type TextAlignment,
} from './InlineTextAlign';

const schema = getSchema(createEditorExtensions());
const markType = schema.marks.inlineTextAlign;

// Positions in the one-line document: LEFT = 1-5, MIDDLE = 6-12, RIGHT = 13-18.
function editorState(content: JSONContent[] | null = null, attrs: Record<string, unknown> = {}) {
  const doc = schema.nodeFromJSON({
    type: 'doc',
    content: content ?? [{
      type: 'paragraph',
      attrs,
      content: [{ type: 'text', text: 'LEFT MIDDLE RIGHT' }],
    }],
  });
  return EditorState.create({ schema, doc, plugins: [createLegacyAlignmentPlugin(markType)] });
}

function select(state: EditorState, from: number, to = from) {
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, from, to)));
}

function align(state: EditorState, alignment: TextAlignment) {
  const tr = state.tr;
  expect(applyTextAlignment(state, tr, alignment)).toBe(true);
  return state.apply(tr);
}

function lines(state: EditorState) {
  const result: Array<{ text: string; align: string; breakAfter: unknown }> = [];
  state.doc.forEach(node => {
    result.push({
      text: node.textContent,
      align: node.attrs.textAlign ?? 'left',
      breakAfter: node.attrs.fListBreakAfter,
    });
  });
  return result;
}

function roundTrips(bbcode: string) {
  return toBBCode(schema.nodeFromJSON(importBBCode(bbcode).document));
}

describe('text alignment mirrors F-list block alignment', () => {
  it('moves a partly selected line onto its own line', () => {
    const state = align(select(editorState(), 6, 12), 'center');

    expect(lines(state)).toEqual([
      { text: 'LEFT ', align: 'left', breakAfter: false },
      { text: 'MIDDLE', align: 'center', breakAfter: false },
      { text: ' RIGHT', align: 'left', breakAfter: null },
    ]);
    const { from, to } = state.selection;
    expect(state.doc.textBetween(from, to)).toBe('MIDDLE');

    const bbcode = toBBCode(state.doc);
    expect(bbcode).toBe('LEFT [center]MIDDLE[/center] RIGHT');
    expect(roundTrips(bbcode)).toBe(bbcode);
  });

  it('splits only once when the selection touches an end of the line', () => {
    const state = align(select(editorState(), 1, 5), 'right');

    expect(lines(state)).toEqual([
      { text: 'LEFT', align: 'right', breakAfter: false },
      { text: ' MIDDLE RIGHT', align: 'left', breakAfter: null },
    ]);
    expect(toBBCode(state.doc)).toBe('[right]LEFT[/right] MIDDLE RIGHT');
  });

  it('aligns the whole line for a caret or a full-line selection', () => {
    expect(lines(align(select(editorState(), 3), 'center'))).toEqual([
      { text: 'LEFT MIDDLE RIGHT', align: 'center', breakAfter: null },
    ]);
    expect(lines(align(select(editorState(), 1, 18), 'right'))).toEqual([
      { text: 'LEFT MIDDLE RIGHT', align: 'right', breakAfter: null },
    ]);
  });

  it('keeps the rest of the line in its original alignment and break', () => {
    const state = align(
      select(editorState(null, { textAlign: 'center', fListBreakAfter: true }), 6, 12),
      'right',
    );

    expect(lines(state)).toEqual([
      { text: 'LEFT ', align: 'center', breakAfter: false },
      { text: 'MIDDLE', align: 'right', breakAfter: false },
      { text: ' RIGHT', align: 'center', breakAfter: true },
    ]);
    expect(toBBCode(state.doc)).toBe(
      '[center]LEFT [/center][right]MIDDLE[/right][center] RIGHT[/center]',
    );
  });

  it('moves a selected inline image onto its own line', () => {
    const base = editorState([{
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Before ' },
        { type: 'eicon', attrs: { name: 'wave' } },
        { type: 'text', text: ' after' },
      ],
    }]);
    const selected = base.apply(base.tr.setSelection(NodeSelection.create(base.doc, 8)));
    const state = align(selected, 'center');

    expect(lines(state).map(line => line.align)).toEqual(['left', 'center', 'left']);
    expect(state.selection).toBeInstanceOf(NodeSelection);
    expect((state.selection as NodeSelection).node.type.name).toBe('eicon');
  });

  it('reports mixed alignment only when the selection spans different lines', () => {
    const state = align(select(editorState(), 6, 12), 'center');

    expect(getActiveTextAlignment(select(state, 10))).toBe('center');
    expect(getActiveTextAlignment(select(state, 2))).toBe('left');
    expect(getActiveTextAlignment(select(state, 1, state.doc.content.size - 1))).toBeNull();
  });
});

describe('side-by-side alignment from older drafts', () => {
  const laneLine = (runs: Array<[string, string | null]>): JSONContent[] => [{
    type: 'paragraph',
    content: runs.map(([text, alignment]) => ({
      type: 'text',
      text,
      marks: alignment ? [{ type: 'inlineTextAlign', attrs: { alignment } }] : undefined,
    })),
  }];

  it('becomes separate lines without changing the exported BBCode', () => {
    const state = editorState(laneLine([['Left', 'left'], ['Centre', 'center'], ['Right', 'right']]));
    const exportedBefore = toBBCode(state.doc);

    const tr = state.tr;
    expect(splitAlignmentMarksIntoLines(tr, markType)).toBe(true);
    const converted = state.apply(tr);

    expect(lines(converted)).toEqual([
      { text: 'Left', align: 'left', breakAfter: false },
      { text: 'Centre', align: 'center', breakAfter: false },
      { text: 'Right', align: 'right', breakAfter: null },
    ]);
    expect(converted.doc.rangeHasMark(0, converted.doc.content.size, markType)).toBe(false);
    expect(toBBCode(converted.doc)).toBe(exportedBefore);
  });

  it('puts unaligned text between aligned runs on its own line', () => {
    const tr = editorState(laneLine([['a', 'center'], ['b', null], ['c', 'center']])).tr;
    splitAlignmentMarksIntoLines(tr, markType);

    expect(tr.doc.childCount).toBe(3);
    expect(tr.doc.child(1).textContent).toBe('b');
    expect(tr.doc.child(1).attrs.textAlign ?? 'left').toBe('left');
  });

  it('converts pasted side-by-side content as it arrives', () => {
    const state = editorState();
    const pasted = schema.text('Pasted', [markType.create({ alignment: 'right' })]);
    const next = state.apply(state.tr.insert(18, pasted));

    expect(next.doc.rangeHasMark(0, next.doc.content.size, markType)).toBe(false);
    expect(lines(next).map(line => [line.text, line.align])).toEqual([
      ['LEFT MIDDLE RIGHT', 'left'],
      ['Pasted', 'right'],
    ]);
  });

  it('leaves documents without the old marks untouched', () => {
    const tr = editorState().tr;
    expect(splitAlignmentMarksIntoLines(tr, markType)).toBe(false);
    expect(tr.docChanged).toBe(false);
  });
});

describe('exported line breaks match what the editor shows', () => {
  const docFrom = (content: JSONContent[]) => schema.nodeFromJSON({ type: 'doc', content });
  const line = (text: string, attrs: Record<string, unknown> = {}): JSONContent => ({
    type: 'paragraph',
    attrs,
    content: [{ type: 'text', text }],
  });

  it('only exports a newline after an aligned line when F-list would show one', () => {
    // Typed in the editor: no gap is shown, so none is exported.
    expect(toBBCode(docFrom([line('Title', { textAlign: 'center' }), line('Body')])))
      .toBe('[center]Title[/center]Body');
    // Imported with a newline: the editor shows the gap, so it's kept.
    expect(toBBCode(docFrom([
      line('Title', { textAlign: 'center', fListBreakAfter: true }),
      line('Body'),
    ]))).toBe('[center]Title[/center]\nBody');
  });

  it('keeps plain lines separate even when they were split from one BBCode line', () => {
    // Centre MIDDLE, then press Enter after "LEFT " and type "extra": both
    // plain lines inherit fListBreakAfter false from the split.
    const state = align(select(editorState(), 6, 12), 'center');
    const [left, middle, right] = [state.doc.child(0), state.doc.child(1), state.doc.child(2)];
    const document = docFrom([
      left.toJSON(),
      { ...left.toJSON(), content: [{ type: 'text', text: 'extra' }] },
      middle.toJSON(),
      right.toJSON(),
    ]);

    expect(toBBCode(document)).toBe('LEFT \nextra[center]MIDDLE[/center] RIGHT');
  });
});
