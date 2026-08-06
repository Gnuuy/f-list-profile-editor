import { getSchema } from '@tiptap/core';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { describe, expect, it } from 'vitest';

import { createEditorExtensions } from './EditorExtensions';
import {
  canJoinNextCollapse,
  exitClosestCollapse,
  insertAfterClosestCollapse,
  unwrapCollapseAt,
} from './CollapsibleDocument';

const schema = getSchema(createEditorExtensions());

function collapse(title: string, text: string) {
  return schema.node('collapsible', { title }, [
    schema.node('paragraph', null, text ? [schema.text(text)] : undefined),
  ]);
}

describe('collapsible document operations', () => {
  it('only allows joining immediately adjacent sibling dropdowns', () => {
    const first = collapse('First', 'One');
    const second = collapse('Second', 'Two');
    const doc = schema.node('doc', null, [first, second]);

    expect(canJoinNextCollapse(doc, 0)).toBe(true);
    expect(canJoinNextCollapse(doc, first.nodeSize)).toBe(false);

    const separated = schema.node('doc', null, [
      first,
      schema.node('paragraph', null, [schema.text('Between')]),
      second,
    ]);
    expect(canJoinNextCollapse(separated, 0)).toBe(false);
  });

  it('removes a dropdown wrapper without deleting its content', () => {
    const first = collapse('Remove me', 'Keep me');
    const second = collapse('Second', 'Two');
    const state = EditorState.create({
      schema,
      doc: schema.node('doc', null, [first, second]),
    });
    const transaction = unwrapCollapseAt(state, 0);

    expect(transaction).not.toBeNull();
    expect(transaction?.doc.toJSON()).toMatchObject({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Keep me' }] },
        { type: 'collapsible', attrs: { title: 'Second' } },
      ],
    });
  });

  it('inserts a new dropdown after the current dropdown instead of nesting it', () => {
    const first = collapse('First', 'One');
    const doc = schema.node('doc', null, [first]);
    const state = EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, 3),
    });
    const transaction = insertAfterClosestCollapse(
      state,
      collapse('Second', ''),
    );

    expect(transaction?.doc.childCount).toBe(2);
    expect(transaction?.doc.child(0).attrs.title).toBe('First');
    expect(transaction?.doc.child(1).attrs.title).toBe('Second');
    expect(transaction?.selection.$from.parent.type.name).toBe('paragraph');
    expect(transaction?.selection.$from.node(1).attrs.title).toBe('Second');
  });

  it('exits the nearest dropdown into a new following paragraph', () => {
    const first = collapse('First', 'One');
    const doc = schema.node('doc', null, [first]);
    const state = EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, 3),
    });
    const transaction = exitClosestCollapse(state);

    expect(transaction?.doc.childCount).toBe(2);
    expect(transaction?.doc.child(0).type.name).toBe('collapsible');
    expect(transaction?.doc.child(1).type.name).toBe('paragraph');
    expect(transaction?.selection.$from.parent.type.name).toBe('paragraph');
    expect(transaction?.selection.$from.depth).toBe(1);
  });
});
