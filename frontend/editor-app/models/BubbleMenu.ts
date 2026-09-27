import { TextSelection } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';

/**
 * The bubble menu offers text formatting, so it only appears for a selection
 * that contains text: not a caret, an image or a whole block.
 */
export function hasFormattableSelection(state: EditorState): boolean {
  const { selection } = state;
  return selection instanceof TextSelection
    && !selection.empty
    && state.doc.textBetween(selection.from, selection.to).length > 0;
}
