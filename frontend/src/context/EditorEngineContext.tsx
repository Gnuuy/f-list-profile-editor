import React, { createContext, useContext, useMemo, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';

type Align = 'left' | 'center' | 'right' | 'justify';

type EditorEngine = {
  getEditor: () => Editor | null;
  setEditorInstance: (e: Editor) => void;

  // Commands (stable references)
  bold: () => void;
  italic: () => void;
  underline: () => void;
  strike: () => void;
  subscript: () => void;
  superscript: () => void;
  strikethrough: () => void;
  setTextAlign: (where: Align) => void;
  addImageFromFilePicker: () => void;
  toggleEditable: () => void;
  addQuote: () => void;
  insertCollapse: () => void;
  toggleCollapse: () => void;
  insertHR: () => void;
  setColour: (css: string) => void;
  clearColour: () => void;
  };

const Ctx = createContext<EditorEngine | null>(null);

export function EditorEngineProvider({ children }: { children: React.ReactNode }) {
  // SINGLE editor instance lives here
  const editorRef = useRef<Editor | null>(null);

  const getEditor = useCallback(() => editorRef.current, []);

  const setEditorInstance = useCallback((e: Editor) => {
    editorRef.current = e;
  }, []);

  // Helper: run a chain safely
  const withEditor = useCallback((fn: (ed: Editor) => void) => {
    const ed = editorRef.current;
    if (ed) fn(ed);
  }, []);

  const addQuote = useCallback(
    () => withEditor(ed => {
      const { empty } = ed.state.selection;
      if (!empty && (ed as any).commands?.quoteSelection) {
        (ed as any).chain().focus().quoteSelection().run();
      } else {
        ed.chain().focus().setBlockquote().run();
      }
    }),
    [withEditor]
  );


  const insertCollapse = useCallback(
    (title = 'Details') => withEditor(ed => (ed as any).chain().focus().insertCollapse(title).run()),
    [withEditor]
  );
  const toggleCollapse = useCallback(
    () => withEditor(ed => (ed as any).chain().focus().toggleCollapsed().run()),
    [withEditor]
  );

  const setColour = useCallback(
  (css: string) => withEditor(ed => ed.chain().focus().setColor(css).run()),
  [withEditor]
  );

  
  const clearColour = useCallback(
  () => withEditor(ed => (ed as any).chain().focus().unsetColor().run()),
  [withEditor]
  );

  // Build command functions ONCE; they read from the ref at click time
  const bold = useCallback(() => withEditor(ed => ed.chain().focus().toggleBold().run()), [withEditor]);
  const italic = useCallback(() => withEditor(ed => ed.chain().focus().toggleItalic().run()), [withEditor]);
  const underline = useCallback(() => withEditor(ed => ed.chain().focus().toggleUnderline().run()), [withEditor]);
  const strike = useCallback(() => withEditor(ed => ed.chain().focus().toggleStrike().run()), [withEditor]);
  const subscript = useCallback(() => withEditor(ed => ed.chain().focus().toggleSubscript().run()), [withEditor]);
  const superscript = useCallback(() => withEditor(ed => ed.chain().focus().toggleSuperscript().run()), [withEditor]);
  const strikethrough = useCallback(() => withEditor(ed => ed.chain().focus().toggleStrike().run()), [withEditor]);

  const insertHR = useCallback(
  () => withEditor(ed => ed.chain().focus().setHorizontalRule().run()),
  [withEditor]
  );
  
  const setColor = useCallback((hex: string) =>
    withEditor(ed => ed.chain().focus().setColor(hex).run()), [withEditor]);

  const setTextAlign = useCallback((where: Align) =>
    withEditor(ed => ed.chain().focus().setTextAlign(where).run()), [withEditor]);

  const addImageFromFilePicker = useCallback(() =>
    withEditor(ed => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          ed.chain().focus().setImage({ src: reader.result as string }).run();
        };
        reader.readAsDataURL(file);
      };
      input.click();
    }), [withEditor]);

  const toggleEditable = useCallback(() =>
    withEditor(ed => {
      ed.setEditable(!ed.isEditable);
      ed.view.dispatch(ed.view.state.tr);
    }), [withEditor]);

  // Stable value: never changes identity (perfect for performance)
  const value = useMemo<EditorEngine>(() => ({
    getEditor,
    setEditorInstance,
    bold, italic, underline, strike, subscript, superscript, strikethrough,
    setColor,
    setTextAlign,
    addImageFromFilePicker,
    toggleEditable,
    addQuote,
    insertCollapse, toggleCollapse,
    insertHR,
    setColour, clearColour
  }), [
    getEditor, setEditorInstance,
    bold, italic, underline, strike, subscript, superscript, strikethrough,
    setColor, setTextAlign, addImageFromFilePicker, toggleEditable, addQuote, insertCollapse, toggleCollapse,
    insertHR,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEditorEngine() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEditorEngine must be used inside <EditorEngineProvider>');
  return ctx;
}
