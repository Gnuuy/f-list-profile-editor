import type { Editor } from '@tiptap/core';

export function editorSelectionRect(editor: Editor): DOMRect {
  const { from } = editor.state.selection;
  const coordinates = editor.view.coordsAtPos(from);
  return new DOMRect(
    coordinates.left,
    coordinates.top,
    Math.max(1, coordinates.right - coordinates.left),
    Math.max(1, coordinates.bottom - coordinates.top),
  );
}
