import type { Editor } from '@tiptap/core';
import type { Mark, MarkType } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';

import { F_LIST_BIG_FONT_SIZE, F_LIST_SMALL_FONT_SIZE } from './FListTypography';

export type FListTextSize = 'big' | 'small';

const FONT_SIZE_BY_NAME: Record<FListTextSize, string> = {
  big: F_LIST_BIG_FONT_SIZE,
  small: F_LIST_SMALL_FONT_SIZE,
};

function hasNonSizeAttribute(mark: Mark): boolean {
  return Object.entries(mark.attrs).some(([name, value]) => (
    name !== 'fontSize' && value !== null && value !== undefined && value !== ''
  ));
}

function withFontSize(mark: Mark | null, markType: MarkType, fontSize: string | null): Mark | null {
  const next = markType.create({
    ...(mark?.attrs ?? {}),
    fontSize,
  });

  return fontSize || hasNonSizeAttribute(next) ? next : null;
}

export function withoutFListTextSize(mark: Mark | null, markType: MarkType): Mark | null {
  return withFontSize(mark, markType, null);
}

function sizeName(fontSize: unknown): FListTextSize | null {
  if (fontSize === F_LIST_BIG_FONT_SIZE) return 'big';
  if (fontSize === F_LIST_SMALL_FONT_SIZE) return 'small';
  return null;
}

/**
 * Return the active F-list text size at the caret or across a uniform selection.
 * A mixed selection intentionally reports no active size.
 */
export function getActiveFListTextSize(state: EditorState): FListTextSize | null {
  const textStyle = state.schema.marks.textStyle;
  if (!textStyle) return null;

  if (state.selection.empty) {
    const marks = state.storedMarks ?? state.selection.$from.marks();
    return sizeName(textStyle.isInSet(marks)?.attrs.fontSize);
  }

  let active: FListTextSize | null | undefined;
  let foundText = false;

  state.selection.ranges.forEach(({ $from, $to }) => {
    state.doc.nodesBetween($from.pos, $to.pos, (node, position) => {
      if (!node.isText) return;

      const from = Math.max(position, $from.pos);
      const to = Math.min(position + node.nodeSize, $to.pos);
      if (from >= to) return;

      foundText = true;
      const current = sizeName(textStyle.isInSet(node.marks)?.attrs.fontSize);
      if (active === undefined) active = current;
      else if (active !== current) active = null;
    });
  });

  return foundText ? (active ?? null) : null;
}

/**
 * Toggle [big] or [small] without disturbing colour or other text-style data.
 * Size, subscript, and superscript are mutually exclusive: applying a size
 * removes either script mark. At a caret only subsequent typing is affected.
 */
export function toggleFListTextSize(editor: Editor, size: FListTextSize): boolean {
  editor.commands.focus();

  const { state } = editor;
  const { selection } = state;
  const textStyle = state.schema.marks.textStyle;
  if (!textStyle) return false;

  const target = getActiveFListTextSize(state) === size ? null : FONT_SIZE_BY_NAME[size];
  const scriptMarks = [state.schema.marks.subscript, state.schema.marks.superscript]
    .filter((mark): mark is MarkType => Boolean(mark));
  const tr = state.tr;

  if (selection.empty) {
    const currentMarks = state.storedMarks ?? selection.$from.marks();
    const currentTextStyle = textStyle.isInSet(currentMarks);
    const nextMarks = currentMarks.filter(mark => (
      mark.type !== textStyle
      && (!target || !scriptMarks.includes(mark.type))
    ));
    const replacement = withFontSize(currentTextStyle, textStyle, target);
    if (replacement) nextMarks.push(replacement);

    tr.setStoredMarks(nextMarks);
    editor.view.dispatch(tr);
    return true;
  }

  selection.ranges.forEach(({ $from, $to }) => {
    state.doc.nodesBetween($from.pos, $to.pos, (node, position) => {
      if (!node.isText) return;

      const from = Math.max(position, $from.pos);
      const to = Math.min(position + node.nodeSize, $to.pos);
      if (from >= to) return;

      const currentTextStyle = textStyle.isInSet(node.marks);
      const replacement = withFontSize(currentTextStyle, textStyle, target);

      if (target) scriptMarks.forEach(mark => tr.removeMark(from, to, mark));
      if (currentTextStyle) tr.removeMark(from, to, currentTextStyle);
      if (replacement) tr.addMark(from, to, replacement);
    });
  });

  editor.view.dispatch(tr.scrollIntoView());
  return true;
}
