import type { Node as PMNode } from '@tiptap/pm/model';
import {
  NodeSelection,
  TextSelection,
  type EditorState,
  type Transaction,
} from '@tiptap/pm/state';

type CollapseLocation = {
  node: PMNode;
  position: number;
};

function findClosestCollapse(state: EditorState): CollapseLocation | null {
  const { selection } = state;
  if (selection instanceof NodeSelection && selection.node.type.name === 'collapsible') {
    return { node: selection.node, position: selection.from };
  }

  for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
    const node = selection.$from.node(depth);
    if (node.type.name === 'collapsible') {
      return { node, position: selection.$from.before(depth) };
    }
  }

  return null;
}

export function canJoinNextCollapse(doc: PMNode, position: number): boolean {
  const current = doc.nodeAt(position);
  if (current?.type.name !== 'collapsible') return false;

  const resolved = doc.resolve(position);
  const index = resolved.index();
  const next = index + 1 < resolved.parent.childCount
    ? resolved.parent.child(index + 1)
    : null;

  return next?.type.name === 'collapsible';
}

/** Remove only the dropdown wrapper, preserving its editable block content. */
export function unwrapCollapseAt(
  state: EditorState,
  position: number,
): Transaction | null {
  const node = state.doc.nodeAt(position);
  if (node?.type.name !== 'collapsible') return null;

  return state.tr
    .replaceWith(position, position + node.nodeSize, node.content)
    .scrollIntoView();
}

/** Insert a new child dropdown at the current selection inside its parent. */
export function insertInsideClosestCollapse(
  state: EditorState,
  collapse: PMNode,
): Transaction | null {
  const current = findClosestCollapse(state);
  if (!current || collapse.type.name !== 'collapsible') return null;

  if (
    state.selection instanceof NodeSelection
    && state.selection.node.type.name === 'collapsible'
  ) {
    const insertPosition = current.position + current.node.nodeSize - 1;
    const transaction = state.tr.insert(insertPosition, collapse);
    transaction.setSelection(TextSelection.near(
      transaction.doc.resolve(insertPosition + 1),
      1,
    ));
    return transaction.scrollIntoView();
  }

  const transaction = state.tr.replaceSelectionWith(collapse);
  const parentPosition = transaction.mapping.map(current.position, -1);
  const parent = transaction.doc.nodeAt(parentPosition);
  let insertedPosition: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  if (parent?.type.name === 'collapsible') {
    const searchFrom = parentPosition + 1;
    const searchTo = parentPosition + parent.nodeSize - 1;
    const mappedSelection = transaction.mapping.map(state.selection.from, -1);

    transaction.doc.nodesBetween(searchFrom, searchTo, (node, position) => {
      if (node.type !== collapse.type || !node.eq(collapse)) return;

      const distance = Math.abs(position - mappedSelection);
      if (distance < nearestDistance) {
        insertedPosition = position;
        nearestDistance = distance;
      }
    });
  }

  if (insertedPosition !== null) {
    transaction.setSelection(TextSelection.near(
      transaction.doc.resolve(insertedPosition + 1),
      1,
    ));
  }

  return transaction.scrollIntoView();
}

/** Ctrl/Cmd+Enter inserts and focuses a paragraph after the nearest dropdown. */
export function exitClosestCollapse(state: EditorState): Transaction | null {
  const current = findClosestCollapse(state);
  const paragraph = state.schema.nodes.paragraph;
  if (!current || !paragraph) return null;

  const insertPosition = current.position + current.node.nodeSize;
  const transaction = state.tr.insert(insertPosition, paragraph.create());
  transaction.setSelection(TextSelection.near(
    transaction.doc.resolve(insertPosition + 1),
    1,
  ));
  return transaction.scrollIntoView();
}
