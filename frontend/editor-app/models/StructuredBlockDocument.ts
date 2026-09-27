import type { Node as PMNode } from '@tiptap/pm/model';
import {
  NodeSelection,
  Plugin,
  Selection,
  TextSelection,
  type EditorState,
  type Transaction,
} from '@tiptap/pm/state';

const STRUCTURAL_BLOCKS = new Set(['blockquote', 'collapsible']);

type StructuralBlockLocation = {
  node: PMNode;
  position: number;
};

function findClosestStructuralBlock(state: EditorState): StructuralBlockLocation | null {
  const { selection } = state;
  if (selection instanceof NodeSelection && STRUCTURAL_BLOCKS.has(selection.node.type.name)) {
    return { node: selection.node, position: selection.from };
  }

  for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
    const node = selection.$from.node(depth);
    if (STRUCTURAL_BLOCKS.has(node.type.name)) {
      return { node, position: selection.$from.before(depth) };
    }
  }

  return null;
}

/**
 * Reports whether a caret is at the true outer edge of its nearest quote.
 * Paragraph boundaries inside a multi-line quote are deliberately not quote
 * boundaries: Backspace/Delete must remain free to join those paragraphs.
 */
export function isAtBlockquoteOuterBoundary(
  state: EditorState,
  direction: 'backward' | 'forward',
): boolean {
  const { selection } = state;
  if (!selection.empty || !(selection instanceof TextSelection)) return false;

  const $position = selection.$from;
  let quoteDepth = -1;
  for (let depth = $position.depth; depth > 0; depth -= 1) {
    if ($position.node(depth).type.name === 'blockquote') {
      quoteDepth = depth;
      break;
    }
  }
  if (quoteDepth < 0) return false;

  if (direction === 'backward' && $position.parentOffset !== 0) return false;
  if (
    direction === 'forward'
    && $position.parentOffset !== $position.parent.content.size
  ) return false;

  // Every descendant on the route from the quote to the caret must be the
  // first/last child. This also handles nested lists and other block content.
  for (let depth = quoteDepth; depth < $position.depth; depth += 1) {
    const parent = $position.node(depth);
    const childIndex = $position.index(depth);
    if (direction === 'backward' && childIndex !== 0) return false;
    if (direction === 'forward' && childIndex !== parent.childCount - 1) return false;
  }

  return true;
}

/** Ctrl/Cmd+Enter exits only the nearest quote or dropdown container. */
export function exitClosestStructuralBlock(state: EditorState): Transaction | null {
  const current = findClosestStructuralBlock(state);
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

/** Inserts an empty line just above or below the block at `position` and puts the caret in it. */
export function insertLineBeside(
  state: EditorState,
  position: number,
  side: 'above' | 'below',
): Transaction | null {
  const node = state.doc.nodeAt(position);
  const paragraph = state.schema.nodes.paragraph;
  if (!node || !paragraph) return null;

  const insertPosition = side === 'above' ? position : position + node.nodeSize;
  const transaction = state.tr.insert(insertPosition, paragraph.create());
  transaction.setSelection(TextSelection.create(transaction.doc, insertPosition + 1));
  return transaction.scrollIntoView();
}

/**
 * Arrow Up on the top line of a quote or dropdown that has nothing above it
 * (or Down on the bottom line with nothing below) adds a line outside it, so
 * there's always a way to write before or after one. The caller checks the
 * caret really is on the first or last visual line.
 */
export function lineOutsideStructuralBlock(
  state: EditorState,
  direction: 'up' | 'down',
): Transaction | null {
  const { selection } = state;
  if (!(selection instanceof TextSelection) || !selection.empty) return null;

  const { $from } = selection;
  for (let depth = $from.depth - 1; depth > 0; depth -= 1) {
    const parent = $from.node(depth);
    const index = $from.index(depth);
    const atEdge = direction === 'up' ? index === 0 : index === parent.childCount - 1;
    if (!atEdge) return null;
    if (!STRUCTURAL_BLOCKS.has(parent.type.name)) continue;

    // Something is already there: the arrow key can just move to it.
    const outer = $from.node(depth - 1);
    const outerIndex = $from.index(depth - 1);
    const hasNeighbour = direction === 'up' ? outerIndex > 0 : outerIndex < outer.childCount - 1;
    if (hasNeighbour) return null;

    return insertLineBeside(state, $from.before(depth), direction === 'up' ? 'above' : 'below');
  }
  return null;
}

/**
 * A caret inside a closed dropdown would be typing into hidden text. Returns
 * a selection just outside it, in the direction the caret was moving, or null
 * when the selection isn't inside a closed dropdown.
 */
export function selectionOutsideClosedDropdowns(
  doc: PMNode,
  selection: Selection,
  bias: -1 | 1,
): Selection | null {
  let current = selection;
  // Several closed dropdowns can sit next to each other; step past each one.
  for (let step = 0; step < 50; step += 1) {
    const closed = outermostClosedDropdown(current.$from) ?? outermostClosedDropdown(current.$to);
    if (!closed) return step === 0 ? null : current;
    // Past the dropdown in the direction of travel, or else the other way.
    const ahead = doc.resolve(bias < 0 ? closed.before : closed.after);
    const behind = doc.resolve(bias < 0 ? closed.after : closed.before);
    current = Selection.findFrom(ahead, bias, true)
      ?? Selection.findFrom(behind, -bias as -1 | 1, true)
      ?? NodeSelection.create(doc, closed.before);
    if (current instanceof NodeSelection) return current;
  }
  return current;
}

/**
 * Keeps the caret out of closed dropdowns, whether it arrives by arrow keys or
 * a dropdown closes around it.
 */
export function closedDropdownCaretGuard(): Plugin {
  return new Plugin({
    appendTransaction(transactions, oldState, newState) {
      if (!transactions.some(tr => tr.selectionSet || tr.docChanged)) return null;
      const bias = newState.selection.head >= oldState.selection.head ? 1 : -1;
      const outside = selectionOutsideClosedDropdowns(newState.doc, newState.selection, bias);
      return outside ? newState.tr.setSelection(outside) : null;
    },
  });
}

function outermostClosedDropdown($position: Selection['$from']) {
  for (let depth = 1; depth <= $position.depth; depth += 1) {
    const node = $position.node(depth);
    if (node.type.name === 'collapsible' && node.attrs.collapsed === true) {
      return { before: $position.before(depth), after: $position.after(depth) };
    }
  }
  return null;
}

/** Remove a quote wrapper without moving or deleting any of its content. */
export function unwrapBlockquoteAt(
  state: EditorState,
  position: number,
): Transaction | null {
  const node = state.doc.nodeAt(position);
  if (node?.type.name !== 'blockquote') return null;

  const transaction = state.tr.replaceWith(
    position,
    position + node.nodeSize,
    node.content,
  );
  transaction.setSelection(TextSelection.near(
    transaction.doc.resolve(Math.min(position + 1, transaction.doc.content.size)),
    1,
  ));
  return transaction.scrollIntoView();
}
