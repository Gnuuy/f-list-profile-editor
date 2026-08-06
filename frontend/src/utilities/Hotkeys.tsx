// extensions/hotkeys.ts
import { Extension } from '@tiptap/core';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const MAX_INDENT = 80;

export const Hotkeys = Extension.create({
  name: 'hotkeys',

  addKeyboardShortcuts() {
    return {
      // Text marks (F-chat conventions)
      'Mod-b': () => this.editor.chain().focus().toggleBold().run(),
      'Mod-i': () => this.editor.chain().focus().toggleItalic().run(),
      'Mod-u': () => this.editor.chain().focus().toggleUnderline().run(),
      'Mod-Shift-x': () => this.editor.chain().focus().toggleStrike().run(),
      'Mod-,': () => this.editor.chain().focus().toggleSubscript().run(),
      'Mod-.': () => this.editor.chain().focus().toggleSuperscript().run(),

      // Alignment (Ctrl/Cmd + Shift + L/E/R/J)
      'Mod-Shift-l': () => this.editor.chain().focus().setTextAlign('left').run(),
      'Mod-Shift-e': () => this.editor.chain().focus().setTextAlign('center').run(),
      'Mod-Shift-r': () => this.editor.chain().focus().setTextAlign('right').run(),
      'Mod-Shift-j': () => this.editor.chain().focus().setTextAlign('justify').run(),

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

      // Unquote one level (optional)
      'Alt-Shift-q': () => this.editor.chain().focus().unsetBlockquote().run(),

      // Horizontal rule
      'Mod-Shift--': () => this.editor.chain().focus().setHorizontalRule().run(),

      // Clear color (quick)
      'Mod-Shift-c': () => this.editor.chain().focus().unsetColor().run(),

      // Indent for quote/collapsible: Alt+Right/Left
      'Alt-Right': () => {
        const ed = this.editor;
        if (ed.isActive('blockquote')) {
          const { indent = 0 } = ed.getAttributes('blockquote') as { indent?: number };
          return ed.chain().focus().updateAttributes('blockquote', { indent: clamp(indent + 1, 0, MAX_INDENT) }).run();
        }
        if (ed.isActive('collapsible')) {
          const { indent = 0 } = ed.getAttributes('collapsible') as { indent?: number };
          return ed.chain().focus().updateAttributes('collapsible', { indent: clamp(indent + 1, 0, MAX_INDENT) }).run();
        }
        return false;
      },
      'Alt-Left': () => {
        const ed = this.editor;
        if (ed.isActive('blockquote')) {
          const { indent = 0 } = ed.getAttributes('blockquote') as { indent?: number };
          return ed.chain().focus().updateAttributes('blockquote', { indent: clamp(indent - 1, 0, MAX_INDENT) }).run();
        }
        if (ed.isActive('collapsible')) {
          const { indent = 0 } = ed.getAttributes('collapsible') as { indent?: number };
          return ed.chain().focus().updateAttributes('collapsible', { indent: clamp(indent - 1, 0, MAX_INDENT) }).run();
        }
        return false;
      },

      // Collapsible: toggle when inside one; insert a new one otherwise
      'Alt-c': () => {
        const ed = this.editor;
        if (ed.isActive('collapsible')) {
          const { collapsed = false } = ed.getAttributes('collapsible') as { collapsed?: boolean };
          return ed.chain().focus().updateAttributes('collapsible', { collapsed: !collapsed }).run();
        }
        return ed.chain().focus().insertCollapse('Details').run();
      },
    };
  },
});
