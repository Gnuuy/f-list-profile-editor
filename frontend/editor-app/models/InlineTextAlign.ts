import { Mark, mergeAttributes } from '@tiptap/core';
import type { MarkType, Node as ProseMirrorNode, ResolvedPos } from '@tiptap/pm/model';
import { NodeSelection, Plugin, TextSelection } from '@tiptap/pm/state';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import { canSplit } from '@tiptap/pm/transform';

/*
 * F-list renders [left], [center], [right] and [justify] as
 * `span.leftText { display: block; text-align: left; }` and so on
 * (github.com/f-list/exported, scss/_bbcode.scss). An aligned run therefore
 * always sits on its own line, even when the tags touch in the BBCode.
 *
 * To mirror that, alignment only ever lives on whole textblocks. Aligning part
 * of a line splits it into separate lines, which exports to the same touching
 * tags F-list stacks. The inlineTextAlign mark below is kept only so drafts
 * saved by older versions (which showed touching tags side by side) still
 * load; it is converted into separate lines as soon as the editor sees it.
 */

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';

type TextblockRange = {
  node: ProseMirrorNode;
  position: number;
};

const TEXT_ALIGNMENTS = new Set<TextAlignment>(['left', 'center', 'right', 'justify']);

function asTextAlignment(value: unknown): TextAlignment | null {
  const candidate = String(value ?? '') as TextAlignment;
  return TEXT_ALIGNMENTS.has(candidate) ? candidate : null;
}

function textblockAlignment(node: ProseMirrorNode | null | undefined): TextAlignment {
  return asTextAlignment(node?.attrs.textAlign) ?? 'left';
}

/**
 * The alignment text at this position is shown with: its line's own, or else
 * the nearest dropdown's, since a dropdown's [right]/[center] wrapper aligns
 * everything inside it that doesn't set its own.
 */
function effectiveAlignment($position: ResolvedPos): TextAlignment {
  for (let depth = $position.depth; depth > 0; depth -= 1) {
    const node = $position.node(depth);
    if (!node.isTextblock && node.type.name !== 'collapsible') continue;
    const own = asTextAlignment(node.attrs.textAlign);
    if (own) return own;
  }
  return 'left';
}

function nearestTextblock($position: ResolvedPos): ProseMirrorNode | null {
  for (let depth = $position.depth; depth > 0; depth -= 1) {
    const node = $position.node(depth);
    if (node.isTextblock) return node;
  }
  return null;
}

function hasBreakAfterAttribute(node: ProseMirrorNode): boolean {
  return Object.prototype.hasOwnProperty.call(node.attrs, 'fListBreakAfter');
}

/**
 * The alignment shared by the whole selection, or null for a mixed selection
 * so the toolbar doesn't claim the first line's alignment applies to all.
 */
export function getActiveTextAlignment(state: EditorState): TextAlignment | null {
  const { selection } = state;

  if (selection instanceof NodeSelection && selection.node.type.name === 'collapsible') {
    return asTextAlignment(selection.node.attrs?.textAlign) ?? effectiveAlignment(selection.$from);
  }

  if (selection.empty) return effectiveAlignment(selection.$from);

  const alignments = new Set<TextAlignment>();
  state.doc.nodesBetween(selection.from, selection.to, (node, position) => {
    if (node.isInline && node.type.name !== 'hardBreak') {
      alignments.add(effectiveAlignment(state.doc.resolve(position)));
    }
  });

  if (alignments.size === 0) return effectiveAlignment(selection.$from);
  return alignments.size === 1 ? [...alignments][0] : null;
}

function selectedTextblocks(state: EditorState): TextblockRange[] {
  const ranges: TextblockRange[] = [];
  const seen = new Set<number>();
  const add = (node: ProseMirrorNode, position: number) => {
    if (!node.isTextblock || seen.has(position)) return;
    if (!Object.prototype.hasOwnProperty.call(node.attrs, 'textAlign')) return;
    seen.add(position);
    ranges.push({ node, position });
  };

  const { selection } = state;
  if (selection.empty || selection instanceof NodeSelection) {
    const parent = nearestTextblock(selection.$from);
    if (parent) add(parent, selection.$from.before(selection.$from.depth));
  } else {
    state.doc.nodesBetween(selection.from, selection.to, (node, position) => {
      if (!node.isTextblock) return;
      add(node, position);
      return false;
    });
  }

  if (ranges.length === 0 && selection.$from.parent.isTextblock) {
    add(selection.$from.parent, selection.$from.before());
  }
  return ranges;
}

function setWholeTextblockAlignment(
  state: EditorState,
  tr: Transaction,
  alignment: TextAlignment,
): boolean {
  const ranges = selectedTextblocks(state);
  if (ranges.length === 0) return false;

  for (const range of ranges) {
    tr.setNodeMarkup(range.position, undefined, { ...range.node.attrs, textAlign: alignment });
  }
  return true;
}

/**
 * Aligns the selected lines. A selection covering only part of one line is
 * split onto its own line first, since F-list can't align part of a line.
 */
export function applyTextAlignment(
  state: EditorState,
  tr: Transaction,
  alignment: TextAlignment,
): boolean {
  const { selection } = state;
  const inlineNodeSelection = selection instanceof NodeSelection && selection.node.isInline;

  if (selection.empty || (selection instanceof NodeSelection && !inlineNodeSelection)) {
    return setWholeTextblockAlignment(state, tr, alignment);
  }

  const { $from, $to, from, to } = selection;
  if ($from.parent !== $to.parent || !$from.parent.isTextblock) {
    return setWholeTextblockAlignment(state, tr, alignment);
  }

  const splitBefore = from > $from.start();
  const splitAfter = to < $from.end();
  if (
    (!splitBefore && !splitAfter)
    || (splitBefore && !canSplit(state.doc, from))
    || (splitAfter && !canSplit(state.doc, to))
  ) {
    return setWholeTextblockAlignment(state, tr, alignment);
  }

  // Split after the selection first so `from` keeps its position.
  if (splitAfter) tr.split(to);
  if (splitBefore) tr.split(from);

  const start = tr.mapping.map(from, 1);
  const $start = tr.doc.resolve(start);
  const selectedPosition = $start.before();
  const selectedLine = $start.parent;

  // The pieces came from one BBCode line, so no newline goes between them.
  tr.setNodeMarkup(selectedPosition, undefined, {
    ...selectedLine.attrs,
    textAlign: alignment,
    ...(splitAfter && hasBreakAfterAttribute(selectedLine) ? { fListBreakAfter: false } : {}),
  });
  if (splitBefore) {
    const lineBefore = tr.doc.resolve(selectedPosition).nodeBefore;
    if (lineBefore && hasBreakAfterAttribute(lineBefore)) {
      tr.setNodeMarkup(selectedPosition - lineBefore.nodeSize, undefined, {
        ...lineBefore.attrs,
        fListBreakAfter: false,
      });
    }
  }

  tr.setSelection(inlineNodeSelection
    ? NodeSelection.create(tr.doc, start)
    : TextSelection.create(tr.doc, start, start + (to - from)));
  return true;
}

/**
 * Converts inlineTextAlign marks (from older drafts or pasted editor HTML)
 * into separate aligned lines, exactly as F-list shows the same BBCode.
 */
export function splitAlignmentMarksIntoLines(tr: Transaction, markType: MarkType): boolean {
  if (!tr.doc.rangeHasMark(0, tr.doc.content.size, markType)) return false;

  const marked: TextblockRange[] = [];
  tr.doc.descendants((node, position) => {
    if (!node.isTextblock) return true;
    let hasMark = false;
    node.forEach(child => {
      if (markType.isInSet(child.marks)) hasMark = true;
    });
    if (hasMark) marked.push({ node, position });
    return false;
  });

  // Later lines first, so earlier positions stay valid.
  for (const { node, position } of marked.reverse()) {
    const lineAlignment = textblockAlignment(node);
    const runs: Array<{ offset: number; key: string; alignment: TextAlignment }> = [];
    node.forEach((child, offset) => {
      const mark = markType.isInSet(child.marks);
      const alignment = asTextAlignment(mark?.attrs.alignment) ?? lineAlignment;
      // Unmarked text between aligned runs is its own line on F-list too.
      const key = mark ? `aligned:${alignment}` : 'plain';
      if (runs.at(-1)?.key !== key) runs.push({ offset, key, alignment });
    });

    const contentStart = position + 1;
    tr.removeMark(contentStart, contentStart + node.content.size, markType);
    const splits = runs.slice(1).map(run => contentStart + run.offset);
    if (!splits.every(split => canSplit(tr.doc, split))) continue;
    for (const split of [...splits].reverse()) tr.split(split);

    let linePosition = position;
    runs.forEach((run, index) => {
      const line = tr.doc.nodeAt(linePosition);
      if (!line) return;
      const isLast = index === runs.length - 1;
      tr.setNodeMarkup(linePosition, undefined, {
        ...line.attrs,
        textAlign: run.alignment,
        ...(!isLast && hasBreakAfterAttribute(line) ? { fListBreakAfter: false } : {}),
      });
      linePosition += line.nodeSize;
    });
  }

  return true;
}

export function createLegacyAlignmentPlugin(markType: MarkType): Plugin {
  return new Plugin({
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some(transaction => transaction.docChanged)) return null;
      const tr = newState.tr;
      return splitAlignmentMarksIntoLines(tr, markType) ? tr : null;
    },
  });
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineTextAlign: {
      /**
       * Align the selected lines. Part of a single line is split onto its own
       * line first, because that's how F-list renders aligned text.
       */
      setSelectionTextAlign: (alignment: TextAlignment) => ReturnType;
    };
  }
}

/** Legacy mark: parsed so old drafts load, then converted into aligned lines. */
export const InlineTextAlign = Mark.create({
  name: 'inlineTextAlign',
  priority: 1000,
  inclusive: false,

  addAttributes() {
    return {
      alignment: {
        default: 'left',
        parseHTML: element => element.getAttribute('data-inline-text-align') ?? 'left',
        renderHTML: attributes => ({
          'data-inline-text-align': attributes.alignment,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-inline-text-align]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setSelectionTextAlign: alignment => ({ dispatch, state, tr }) => {
        if (!dispatch) return true;
        return applyTextAlignment(state, tr, alignment);
      },
    };
  },

  addProseMirrorPlugins() {
    return [createLegacyAlignmentPlugin(this.type)];
  },

  onCreate() {
    // appendTransaction doesn't see the initial document, so convert it here.
    const { state, view } = this.editor;
    const tr = state.tr;
    if (splitAlignmentMarksIntoLines(tr, state.schema.marks.inlineTextAlign)) {
      view.dispatch(tr.setMeta('addToHistory', false));
    }
  },
});
