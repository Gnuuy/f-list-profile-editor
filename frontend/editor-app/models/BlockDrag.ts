import { Fragment, Slice } from '@tiptap/pm/model';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { NodeSelection } from '@tiptap/pm/state';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import { dropPoint } from '@tiptap/pm/transform';

export type VerticalBounds = {
  top: number;
  bottom: number;
};

/** Blocks whose children can be dragged on their own (when open). */
const CONTAINER_TYPES = new Set(['collapsible', 'blockquote', 'indentedBlock']);

/** Document positions of the top-level blocks, in order. */
export function topLevelBlockPositions(doc: ProseMirrorNode): number[] {
  return childBlockPositions(doc, -1);
}

/** Document positions of a node's direct children; use -1 for the document itself. */
export function childBlockPositions(node: ProseMirrorNode, position: number): number[] {
  const positions: number[] = [];
  node.forEach((_child, offset) => positions.push(position + 1 + offset));
  return positions;
}

/**
 * The block under a pointer's vertical position, or null when the pointer is
 * between blocks. Blocks run top to bottom in document order, so a binary
 * search only has to measure a handful of them.
 */
export function findBlockAtY(
  positions: readonly number[],
  boundsOf: (position: number) => VerticalBounds | null,
  y: number,
): number | null {
  let low = 0;
  let high = positions.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const bounds = boundsOf(positions[middle]);
    if (!bounds) return null;
    if (y < bounds.top) high = middle - 1;
    else if (y > bounds.bottom) low = middle + 1;
    else return positions[middle];
  }
  return null;
}

/**
 * The innermost draggable block under the pointer: a block inside an open
 * dropdown or a quote wins over the container. Over a container's header the
 * container itself is returned.
 */
export function findInnermostBlockAtY(
  doc: ProseMirrorNode,
  boundsOf: (position: number) => VerticalBounds | null,
  y: number,
): number | null {
  let found = findBlockAtY(topLevelBlockPositions(doc), boundsOf, y);
  while (found !== null) {
    const node = doc.nodeAt(found);
    if (!node || !CONTAINER_TYPES.has(node.type.name) || node.attrs.collapsed === true) break;
    const child = findBlockAtY(childBlockPositions(node, found), boundsOf, y);
    if (child === null) break;
    found = child;
  }
  return found;
}

/**
 * Where the block at `from` lands when dropped at document position `hit`,
 * using ProseMirror's own rules for valid drop spots. Null when there's no
 * valid spot, or the drop would put the block inside itself or where it is.
 */
export function blockDropPosition(doc: ProseMirrorNode, from: number, hit: number): number | null {
  const node = doc.nodeAt(from);
  if (!node) return null;
  const insert = dropPoint(doc, hit, new Slice(Fragment.from(node), 0, 0));
  if (insert === null || (insert >= from && insert <= from + node.nodeSize)) return null;

  // A dropdown has to be open before anything can be dropped into it.
  const $insert = doc.resolve(insert);
  for (let depth = $insert.depth; depth > 0; depth -= 1) {
    const ancestor = $insert.node(depth);
    if (ancestor.type.name === 'collapsible' && ancestor.attrs.collapsed === true) return null;
  }
  return insert;
}

/** Moves (or copies) the block at `from` to `insert` and selects it there. */
export function moveBlock(
  state: EditorState,
  from: number,
  insert: number,
  copy = false,
): Transaction | null {
  const node = state.doc.nodeAt(from);
  if (!node) return null;

  const tr = state.tr;
  // A container left empty gets a blank line, since dropdowns and quotes
  // always need at least one.
  if (!copy) tr.delete(from, from + node.nodeSize);
  const target = tr.mapping.map(insert);
  tr.insert(target, node);
  return tr.setSelection(NodeSelection.create(tr.doc, target)).scrollIntoView();
}
