import { getSchema } from '@tiptap/core';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { describe, expect, it } from 'vitest';

import { createEditorExtensions } from './EditorExtensions';
import {
  closedDropdownCaretGuard,
  exitClosestStructuralBlock,
  insertLineBeside,
  isAtBlockquoteOuterBoundary,
  lineOutsideStructuralBlock,
  selectionOutsideClosedDropdowns,
  unwrapBlockquoteAt,
} from './StructuredBlockDocument';

const schema = getSchema(createEditorExtensions());

describe('structural block document operations', () => {
  it('exits a quote into its parent dropdown without exiting the dropdown', () => {
    const quote = schema.node('blockquote', null, [
      schema.node('paragraph', null, [schema.text('Quoted')]),
    ]);
    const dropdown = schema.node('collapsible', { title: 'Outer' }, [quote]);
    const doc = schema.node('doc', null, [dropdown]);
    const state = EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, 4),
    });

    const transaction = exitClosestStructuralBlock(state);

    expect(transaction?.doc.childCount).toBe(1);
    expect(transaction?.doc.child(0).type.name).toBe('collapsible');
    expect(transaction?.doc.child(0).childCount).toBe(2);
    expect(transaction?.doc.child(0).child(0).type.name).toBe('blockquote');
    expect(transaction?.doc.child(0).child(1).type.name).toBe('paragraph');
    expect(transaction?.selection.$from.node(1).type.name).toBe('collapsible');
  });

  it('unwraps a quote in place and retains its text in the parent dropdown', () => {
    const quote = schema.node('blockquote', null, [
      schema.node('paragraph', null, [schema.text('Keep me')]),
    ]);
    const dropdown = schema.node('collapsible', { title: 'Outer' }, [quote]);
    const doc = schema.node('doc', null, [dropdown]);
    const state = EditorState.create({ schema, doc });
    const quotePosition = 1;

    const transaction = unwrapBlockquoteAt(state, quotePosition);

    expect(transaction?.doc.childCount).toBe(1);
    expect(transaction?.doc.child(0).type.name).toBe('collapsible');
    expect(transaction?.doc.child(0).child(0).type.name).toBe('paragraph');
    expect(transaction?.doc.textContent).toBe('Keep me');
  });

  it('only protects the true quote edges, not internal line-break boundaries', () => {
    const quote = schema.node('blockquote', null, [
      schema.node('paragraph', null, [schema.text('First')]),
      schema.node('paragraph', null, [schema.text('Second')]),
    ]);
    const doc = schema.node('doc', null, [quote]);

    const at = (position: number) => EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, position),
    });

    expect(isAtBlockquoteOuterBoundary(at(2), 'backward')).toBe(true);
    expect(isAtBlockquoteOuterBoundary(at(7), 'forward')).toBe(false);
    expect(isAtBlockquoteOuterBoundary(at(9), 'backward')).toBe(false);
    expect(isAtBlockquoteOuterBoundary(at(15), 'forward')).toBe(true);
  });
});

describe('getting above or below a quote or dropdown', () => {
  const line = (text: string) => schema.node('paragraph', null, text ? [schema.text(text)] : []);
  // doc: [dropdown [First, Second]]; "First" starts at 2, "Second" at 9.
  const dropdownOnly = schema.node('doc', null, [
    schema.node('collapsible', { title: 'Top' }, [line('First'), line('Second')]),
  ]);
  const caretAt = (doc: typeof dropdownOnly, position: number) => EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc, position),
  });

  it('adds a line above a dropdown with nothing above it', () => {
    const transaction = lineOutsideStructuralBlock(caretAt(dropdownOnly, 3), 'up');

    expect(transaction?.doc.child(0).type.name).toBe('paragraph');
    expect(transaction?.doc.child(1).type.name).toBe('collapsible');
    expect(transaction?.selection.$from.depth).toBe(1);
  });

  it('adds a line below from the last line, and does nothing from inner lines', () => {
    const below = lineOutsideStructuralBlock(caretAt(dropdownOnly, 12), 'down');
    expect(below?.doc.lastChild?.type.name).toBe('paragraph');
    expect(below?.doc.childCount).toBe(2);

    expect(lineOutsideStructuralBlock(caretAt(dropdownOnly, 12), 'up')).toBeNull();
    expect(lineOutsideStructuralBlock(caretAt(dropdownOnly, 3), 'down')).toBeNull();
  });

  it('leaves the arrow key alone when there is already a line above', () => {
    const doc = schema.node('doc', null, [
      line('Above'),
      schema.node('blockquote', null, [line('Quoted')]),
    ]);
    expect(lineOutsideStructuralBlock(caretAt(doc, 10), 'up')).toBeNull();
  });

  it('steps out of the innermost container first', () => {
    const doc = schema.node('doc', null, [
      schema.node('collapsible', { title: 'Outer' }, [
        schema.node('blockquote', null, [line('Deep')]),
      ]),
    ]);
    const transaction = lineOutsideStructuralBlock(caretAt(doc, 4), 'up');
    const outer = transaction?.doc.child(0);

    expect(outer?.type.name).toBe('collapsible');
    expect(outer?.child(0).type.name).toBe('paragraph');
    expect(outer?.child(1).type.name).toBe('blockquote');
  });

  it('adds lines above and below from the header menu', () => {
    const state = caretAt(dropdownOnly, 3);
    expect(insertLineBeside(state, 0, 'above')?.doc.child(0).type.name).toBe('paragraph');
    expect(insertLineBeside(state, 0, 'below')?.doc.child(1).type.name).toBe('paragraph');
  });
});

describe('closed dropdowns', () => {
  const line = (text: string) => schema.node('paragraph', null, [schema.text(text)]);
  // doc: Before (0-8), closed dropdown (8-20, "Hidden" at 10-16), After (20-27).
  const doc = schema.node('doc', null, [
    line('Before'),
    schema.node('collapsible', { title: 'Shut', collapsed: true }, [line('Hidden')]),
    line('After'),
  ]);
  const insideHidden = TextSelection.create(doc, 12);

  it('moves a caret out of a closed dropdown in the direction it was going', () => {
    const forward = selectionOutsideClosedDropdowns(doc, insideHidden, 1);
    const backward = selectionOutsideClosedDropdowns(doc, insideHidden, -1);

    expect(forward?.$from.parent.textContent).toBe('After');
    expect(backward?.$from.parent.textContent).toBe('Before');
  });

  it('leaves selections alone outside closed dropdowns and inside open ones', () => {
    expect(selectionOutsideClosedDropdowns(doc, TextSelection.create(doc, 3), 1)).toBeNull();

    const open = schema.node('doc', null, [
      schema.node('collapsible', { title: 'Open', collapsed: false }, [line('Shown')]),
    ]);
    expect(selectionOutsideClosedDropdowns(open, TextSelection.create(open, 3), 1)).toBeNull();
  });

  it('moves the caret out when it steps in, or when a dropdown closes around it', () => {
    const plugins = [closedDropdownCaretGuard()];
    const state = EditorState.create({ schema, doc, plugins, selection: TextSelection.create(doc, 3) });
    const steppedIn = state.apply(state.tr.setSelection(insideHidden));
    expect(steppedIn.selection.$from.parent.textContent).toBe('After');

    const openDoc = schema.node('doc', null, [
      schema.node('collapsible', { title: 'Open', collapsed: false }, [line('Typing')]),
      line('Next'),
    ]);
    const typing = EditorState.create({
      schema,
      doc: openDoc,
      plugins,
      selection: TextSelection.create(openDoc, 4),
    });
    const closed = typing.apply(typing.tr.setNodeMarkup(0, undefined, { ...openDoc.child(0).attrs, collapsed: true }));
    expect(closed.selection.$from.parent.textContent).toBe('Next');
  });
});
