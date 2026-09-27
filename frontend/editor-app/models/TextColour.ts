import type { Editor } from '@tiptap/core';
import type { Mark, MarkType } from '@tiptap/pm/model';

function hasNonColourAttribute(mark: Mark): boolean {
  return Object.entries(mark.attrs).some(([name, value]) => (
    name !== 'color' && value !== null && value !== undefined && value !== ''
  ));
}

function withoutColour(mark: Mark, markType: MarkType): Mark | null {
  const next = markType.create({
    ...mark.attrs,
    color: null,
  });

  return hasNonColourAttribute(next) ? next : null;
}

/**
 * Reset only the colour owned by the current selection.
 *
 * F-list font sizes and colours share TipTap's `textStyle` mark. Removing the
 * entire mark would therefore also remove [big]/[small]. At a caret, keep the
 * document untouched and replace only the stored colour used for future text.
 */
export function clearTextColour(editor: Editor): boolean {
  editor.commands.focus();

  const { state } = editor;
  const { selection } = state;
  const textStyle = state.schema.marks.textStyle;
  if (!textStyle) return false;

  const tr = state.tr;

  if (selection.empty) {
    const currentMarks = state.storedMarks ?? selection.$from.marks();
    const currentTextStyle = textStyle.isInSet(currentMarks);
    const nextMarks = currentMarks.filter(mark => mark.type !== textStyle);

    if (currentTextStyle) {
      const replacement = withoutColour(currentTextStyle, textStyle);
      if (replacement) nextMarks.push(replacement);
    }

    tr.setStoredMarks(nextMarks);
    editor.view.dispatch(tr);
    return true;
  }

  selection.ranges.forEach(({ $from, $to }) => {
    state.doc.nodesBetween($from.pos, $to.pos, (node, position) => {
      if (!node.isText) return;

      const currentTextStyle = textStyle.isInSet(node.marks);
      if (!currentTextStyle?.attrs.color) return;

      const from = Math.max(position, $from.pos);
      const to = Math.min(position + node.nodeSize, $to.pos);
      const replacement = withoutColour(currentTextStyle, textStyle);

      tr.removeMark(from, to, currentTextStyle);
      if (replacement) tr.addMark(from, to, replacement);
    });
  });

  editor.view.dispatch(tr.scrollIntoView());
  return true;
}
