import { getSchema } from '@tiptap/core';
import { EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state';
import { describe, expect, it } from 'vitest';

import { toBBCode } from '../utilities/BBCodeParser';
import { importBBCode } from './BBCodeImporter';
import { targetNodeOfType, updateTargetNodeAttributes } from './CollapsibleFormatting';
import { createEditorExtensions } from './EditorExtensions';
import { getActiveTextAlignment } from './InlineTextAlign';

const schema = getSchema(createEditorExtensions());

// An outer right/white dropdown holding a line, a centre/green dropdown and a
// dropdown with no colour or alignment of its own.
const source = '[right][color=white][collapse=Outer]Body\n'
  + '[center][color=green][collapse=Own]Green[/collapse][/color][/center]'
  + '[collapse=Plain]Plain[/collapse]'
  + '[/collapse][/color][/right]';
const doc = schema.nodeFromJSON(importBBCode(source).document);
const outer = doc.child(0);

function findDropdown(title: string) {
  let found: { position: number; attrs: Record<string, unknown> } | null = null;
  doc.descendants((node, position) => {
    if (node.type.name === 'collapsible' && node.attrs.title === title) found = { position, attrs: node.attrs };
  });
  return found!;
}

function textPosition(text: string) {
  let found = -1;
  doc.descendants((node, position) => {
    if (node.isText && node.text === text) found = position + 1;
  });
  return found;
}

describe('nested dropdown formatting', () => {
  it('imports each dropdown with only the colour and alignment it sets itself', () => {
    expect(outer.attrs).toMatchObject({ textAlign: 'right', color: '#ffffff' });
    expect(findDropdown('Own').attrs).toMatchObject({ textAlign: 'center', color: '#44ff44' });
    expect(findDropdown('Plain').attrs).toMatchObject({ textAlign: null, color: null });
  });

  it('recolours only the selected dropdown, so nested ones keep or inherit', () => {
    const state = EditorState.create({ schema, doc, selection: NodeSelection.create(doc, 0) });
    const tr = state.tr;
    expect(updateTargetNodeAttributes(tr, 'collapsible', { color: '#ffcbdb', textAlign: 'center' })).toBe(true);

    const dropdowns: Record<string, unknown>[] = [];
    tr.doc.descendants(node => {
      if (node.type.name === 'collapsible') dropdowns.push(node.attrs);
    });
    expect(dropdowns.map(attrs => [attrs.title, attrs.color, attrs.textAlign])).toEqual([
      ['Outer', '#ffcbdb', 'center'],
      ['Own', '#44ff44', 'center'],
      ['Plain', null, null],
    ]);
  });

  it('targets the innermost dropdown around the caret', () => {
    const selection = TextSelection.create(doc, textPosition('Green'));
    expect(targetNodeOfType(selection, 'collapsible')?.node.attrs.title).toBe('Own');
  });

  it('shows the alignment content actually has, including inherited alignment', () => {
    const alignmentAt = (text: string) => getActiveTextAlignment(
      EditorState.create({ schema, doc, selection: TextSelection.create(doc, textPosition(text)) }),
    );

    expect(alignmentAt('Body')).toBe('right');
    expect(alignmentAt('Green')).toBe('center');
    expect(alignmentAt('Plain')).toBe('right');
  });

  it('exports each dropdown with only its own wrappers', () => {
    const exported = toBBCode(doc);
    expect(exported).toContain('[color=white][right][collapse=Outer]');
    expect(exported).toContain('[color=green][center][collapse=Own]');
    expect(exported).toContain('[collapse=Plain]Plain[/collapse]');
    expect(exported).not.toMatch(/\[(color=[a-z]+|right|center)\]\[collapse=Plain\]/);
  });
});
