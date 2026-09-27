import type { Node as PMNode } from '@tiptap/pm/model';
import { NodeSelection, type EditorState, type Selection, type Transaction } from '@tiptap/pm/state';

export type CollapsibleFormatting = {
  textAlign: 'left' | 'center' | 'right' | 'justify' | null;
  color: string | null;
};

export function selectedCollapsible(state: EditorState): PMNode | null {
  return state.selection instanceof NodeSelection
    && state.selection.node.type.name === 'collapsible'
    ? state.selection.node
    : null;
}

/** The selected node of this type, or else the innermost one around the caret. */
export function targetNodeOfType(
  selection: Selection,
  typeName: string,
): { node: PMNode; position: number } | null {
  if (selection instanceof NodeSelection && selection.node.type.name === typeName) {
    return { node: selection.node, position: selection.from };
  }
  const { $from } = selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === typeName) return { node, position: $from.before(depth) };
  }
  return null;
}

/**
 * Changes one quote or dropdown only. Tiptap's updateAttributes also changes
 * every node of that type nested inside a selected one, which overwrote nested
 * dropdowns' own colour and alignment. Nested ones without their own values
 * don't need copies: they inherit from their parent, as on F-list.
 */
export function updateTargetNodeAttributes(
  tr: Transaction,
  typeName: string,
  attributes: Record<string, unknown>,
): boolean {
  const target = targetNodeOfType(tr.selection, typeName);
  if (!target) return false;
  tr.setNodeMarkup(target.position, undefined, { ...target.node.attrs, ...attributes });
  return true;
}

export function inheritedCollapsibleFormatting(state: EditorState): CollapsibleFormatting {
  const paragraphAlignment = state.selection.$from.parent.attrs?.textAlign;
  const textAlign = ['left', 'center', 'right', 'justify'].includes(paragraphAlignment)
    ? paragraphAlignment
    : null;
  const marks = state.storedMarks ?? state.selection.$from.marks();
  const textStyle = marks.find(mark => mark.type.name === 'textStyle');
  const color = typeof textStyle?.attrs?.color === 'string'
    ? textStyle.attrs.color
    : null;

  return { textAlign, color } as CollapsibleFormatting;
}
