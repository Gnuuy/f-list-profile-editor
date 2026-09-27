import type { Editor } from '@tiptap/core';

import { withoutFListTextSize } from './TextSize';

export type FListTextScript = 'subscript' | 'superscript';

/**
 * Toggle the requested script mark. Subscript, superscript, big, and small are
 * mutually exclusive. Applying a script removes either script alternative and
 * any font size and link while preserving colour, emphasis, and alignment.
 */
export function toggleFListTextScript(editor: Editor, script: FListTextScript): boolean {
  editor.commands.focus();

  const { state } = editor;
  const { selection } = state;
  const target = state.schema.marks[script];
  const opposite = state.schema.marks[script === 'subscript' ? 'superscript' : 'subscript'];
  const textStyle = state.schema.marks.textStyle;
  const link = state.schema.marks.link;
  if (!target || !opposite) return false;

  const isActive = editor.isActive(script);
  const tr = state.tr;

  if (selection.empty) {
    const currentMarks = state.storedMarks ?? selection.$from.marks();
    const currentTextStyle = textStyle?.isInSet(currentMarks) ?? null;
    const nextMarks = currentMarks.filter(mark => (
      mark.type !== target
      && (isActive || (mark.type !== opposite && mark.type !== textStyle && mark.type !== link))
    ));
    if (!isActive) {
      if (textStyle) {
        const replacement = withoutFListTextSize(currentTextStyle, textStyle);
        if (replacement) nextMarks.push(replacement);
      }
      nextMarks.push(target.create());
    }
    tr.setStoredMarks(nextMarks);
    editor.view.dispatch(tr);
    return true;
  }

  selection.ranges.forEach(({ $from, $to }) => {
    tr.removeMark($from.pos, $to.pos, target);
    if (!isActive) {
      tr.removeMark($from.pos, $to.pos, opposite);
      if (link) tr.removeMark($from.pos, $to.pos, link);
      if (textStyle) {
        state.doc.nodesBetween($from.pos, $to.pos, (node, position) => {
          if (!node.isText) return;

          const from = Math.max(position, $from.pos);
          const to = Math.min(position + node.nodeSize, $to.pos);
          if (from >= to) return;

          const currentTextStyle = textStyle.isInSet(node.marks);
          if (!currentTextStyle?.attrs.fontSize) return;

          const replacement = withoutFListTextSize(currentTextStyle, textStyle);
          tr.removeMark(from, to, currentTextStyle);
          if (replacement) tr.addMark(from, to, replacement);
        });
      }
      tr.addMark($from.pos, $to.pos, target.create());
    }
  });

  editor.view.dispatch(tr.scrollIntoView());
  return true;
}
