// extensions/hotkeys.ts
import { Extension } from '@tiptap/core';

import { targetNodeOfType, updateTargetNodeAttributes } from '../models/CollapsibleFormatting';
import { editorSelectionRect } from '../models/EditorMenuAnchor';
import { insertFListHorizontalRule } from '../models/HorizontalRuleSpacing';
import { exitClosestStructuralBlock, lineOutsideStructuralBlock } from '../models/StructuredBlockDocument';
import { clearTextColour } from '../models/TextColour';
import { toggleFListTextScript } from '../models/TextScript';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const MAX_INDENT = 80;

type Editor = Parameters<typeof editorSelectionRect>[0];

/** Indents only the innermost quote or dropdown, never the ones nested inside it. */
function changeIndent(editor: Editor, amount: -1 | 1): boolean {
  for (const typeName of ['blockquote', 'collapsible']) {
    const target = targetNodeOfType(editor.state.selection, typeName);
    if (!target) continue;
    const indent = clamp((Number(target.node.attrs.indent) || 0) + amount, 0, MAX_INDENT);
    return editor.chain().focus().command(({ tr }) => updateTargetNodeAttributes(tr, typeName, { indent })).run();
  }
  return false;
}

function openEditorMenu(
  editor: Parameters<typeof editorSelectionRect>[0],
  callback?: (rect: DOMRect) => void,
): boolean {
  if (!callback) return false;
  callback(editorSelectionRect(editor));
  return true;
}

export type HotkeyMenuCallbacks = {
  openColourMenu?: (rect: DOMRect) => void;
  openEiconMenu?: (rect: DOMRect) => void;
  openCharacterIconMenu?: (rect: DOMRect) => void;
  openLinkMenu?: (rect: DOMRect) => void;
};

export const Hotkeys = Extension.create<HotkeyMenuCallbacks>({
  name: 'hotkeys',
  priority: 1100,

  addOptions() {
    return {};
  },

  addKeyboardShortcuts() {
    return {
      // Text marks (F-chat conventions)
      'Mod-b': () => this.editor.chain().focus().toggleBold().run(),
      'Mod-i': () => this.editor.chain().focus().toggleItalic().run(),
      'Mod-u': () => this.editor.chain().focus().toggleUnderline().run(),
      'Mod-s': () => this.editor.chain().focus().toggleStrike().run(),
      'Mod-Shift-x': () => this.editor.chain().focus().toggleStrike().run(),
      'Mod-,': () => toggleFListTextScript(this.editor, 'subscript'),
      'Mod-.': () => toggleFListTextScript(this.editor, 'superscript'),
      'Mod-ArrowDown': () => toggleFListTextScript(this.editor, 'subscript'),
      'Mod-ArrowUp': () => toggleFListTextScript(this.editor, 'superscript'),

      // Popup tools. Returning true prevents browser bookmark/save/reload UI
      // while the editor itself owns the focused shortcut.
      'Mod-d': () => openEditorMenu(this.editor, this.options.openColourMenu),
      'Mod-e': () => openEditorMenu(this.editor, this.options.openEiconMenu),
      'Mod-r': () => openEditorMenu(this.editor, this.options.openCharacterIconMenu),
      'Mod-l': () => openEditorMenu(this.editor, this.options.openLinkMenu),

      // Exit only the nearest structural container (quote or dropdown).
      'Mod-Enter': () => {
        const transaction = exitClosestStructuralBlock(this.editor.state);
        if (!transaction) return false;
        this.editor.view.dispatch(transaction);
        this.editor.commands.focus();
        return true;
      },

      // Arrow keys at the top or bottom edge of a quote/dropdown with nothing
      // beyond it add a line there, so you can always write above or below.
      ArrowUp: () => {
        if (!this.editor.view.endOfTextblock('up')) return false;
        const transaction = lineOutsideStructuralBlock(this.editor.state, 'up');
        if (!transaction) return false;
        this.editor.view.dispatch(transaction);
        return true;
      },
      ArrowDown: () => {
        if (!this.editor.view.endOfTextblock('down')) return false;
        const transaction = lineOutsideStructuralBlock(this.editor.state, 'down');
        if (!transaction) return false;
        this.editor.view.dispatch(transaction);
        return true;
      },

      // Alignment (Ctrl/Cmd + Shift + L/E/R/J)
      'Mod-Shift-l': () => this.editor.chain().focus().setSelectionTextAlign('left').run(),
      'Mod-Shift-e': () => this.editor.chain().focus().setSelectionTextAlign('center').run(),
      'Mod-Shift-r': () => this.editor.chain().focus().setSelectionTextAlign('right').run(),
      'Mod-Shift-j': () => this.editor.chain().focus().setSelectionTextAlign('justify').run(),

      // Quote (selection → quoteSelection; caret → add nested blockquote)
      'Alt-q': () => {
        const ed = this.editor;
        const sel = this.editor.state.selection;
        this.editor.chain().focus();
        if (!sel.empty) {
          return ed.chain().quoteSelection().run();
        }
        return this.editor.chain().setBlockquote().run();
      },

      // Horizontal rule
      'Mod-Shift--': () => insertFListHorizontalRule(this.editor, 'spaced'),

      // Clear color (quick)
      'Mod-Shift-c': () => clearTextColour(this.editor),

      // Indent for quote/collapsible: Alt+Right/Left
      'Alt-Right': () => changeIndent(this.editor, 1),
      'Alt-Left': () => changeIndent(this.editor, -1),

      // Collapsible: toggle when inside one; insert a new one otherwise
      'Alt-c': () => {
        const ed = this.editor;
        const dropdown = targetNodeOfType(ed.state.selection, 'collapsible');
        if (dropdown) {
          const collapsed = !dropdown.node.attrs.collapsed;
          return ed.chain().focus().command(({ tr }) => updateTargetNodeAttributes(tr, 'collapsible', { collapsed })).run();
        }
        return ed.chain().focus().insertCollapse('Details').run();
      },
    };
  },
});
