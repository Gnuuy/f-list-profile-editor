import React, { createContext, useContext, useMemo, useCallback, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';

import { importBBCode as parseBBCode } from '../models/BBCodeImporter';
import type { BBCodeImportResult } from '../models/BBCodeImporter';

type Align = 'left' | 'center' | 'right' | 'justify';

type EditorEngine = {
  editor: Editor | null;
  getEditor: () => Editor | null;
  setEditorInstance: (editor: Editor | null) => void;

  // Commands (stable references)
  bold: () => void;
  italic: () => void;
  underline: () => void;
  strike: () => void;
  subscript: () => void;
  superscript: () => void;
  setTextAlign: (where: Align) => void;
  addImageFromFilePicker: () => void;
  toggleEditable: () => void;
  addQuote: () => void;
  insertCollapse: () => void;
  toggleCollapse: () => void;
  insertHR: () => void;
  setColour: (css: string) => void;
  clearColour: () => void;
  importBBCode: (source: string) => BBCodeImportResult;
};

const Ctx = createContext<EditorEngine | null>(null);

export function EditorEngineProvider({ children }: { children: React.ReactNode }) {
  const editorRef = useRef<Editor | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);

  const getEditor = useCallback(() => editorRef.current, []);

  const setEditorInstance = useCallback((nextEditor: Editor | null) => {
    editorRef.current = nextEditor;
    setEditor(nextEditor);
  }, []);

  // Helper: run a chain safely
  const withEditor = useCallback((fn: (ed: Editor) => void) => {
    const ed = editorRef.current;
    if (ed) fn(ed);
  }, []);

  const addQuote = useCallback(
    () => withEditor(ed => {
      const { empty } = ed.state.selection;
      if (!empty) {
        ed.chain().focus().quoteSelection().run();
      } else {
        ed.chain().focus().setBlockquote().run();
      }
    }),
    [withEditor]
  );


  const insertCollapse = useCallback(
    () => withEditor(ed => ed.chain().focus().insertCollapse('Details').run()),
    [withEditor]
  );
  const toggleCollapse = useCallback(
    () => withEditor(ed => ed.chain().focus().toggleCollapsed().run()),
    [withEditor]
  );

  const setColour = useCallback(
  (css: string) => withEditor(ed => ed.chain().focus().setColor(css).run()),
  [withEditor]
  );

  
  const clearColour = useCallback(
  () => withEditor(ed => ed.chain().focus().unsetColor().run()),
  [withEditor]
  );

  // Build command functions ONCE; they read from the ref at click time
  const bold = useCallback(() => withEditor(ed => ed.chain().focus().toggleBold().run()), [withEditor]);
  const italic = useCallback(() => withEditor(ed => ed.chain().focus().toggleItalic().run()), [withEditor]);
  const underline = useCallback(() => withEditor(ed => ed.chain().focus().toggleUnderline().run()), [withEditor]);
  const strike = useCallback(() => withEditor(ed => ed.chain().focus().toggleStrike().run()), [withEditor]);
  const subscript = useCallback(() => withEditor(ed => ed.chain().focus().toggleSubscript().run()), [withEditor]);
  const superscript = useCallback(() => withEditor(ed => ed.chain().focus().toggleSuperscript().run()), [withEditor]);
  const insertHR = useCallback(
  () => withEditor(ed => ed.chain().focus().setHorizontalRule().run()),
  [withEditor]
  );
  
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

  const importBBCode = useCallback((source: string) => {
    const ed = editorRef.current;
    if (!ed) throw new Error('The editor is not ready yet.');

    const result = parseBBCode(source);
    const imported = ed.commands.setContent(result.document, {
      emitUpdate: true,
      errorOnInvalidContent: true,
    });
    if (!imported) throw new Error('The imported BBCode could not be loaded.');
    ed.commands.focus('start');
    return result;
  }, []);

  // Stable value: never changes identity (perfect for performance)
  const value = useMemo<EditorEngine>(() => ({
    editor,
    getEditor,
    setEditorInstance,
    bold, italic, underline, strike, subscript, superscript,
    setTextAlign,
    addImageFromFilePicker,
    toggleEditable,
    addQuote,
    insertCollapse, toggleCollapse,
    insertHR,
    setColour, clearColour,
    importBBCode,
  }), [
    editor,
    getEditor, setEditorInstance,
    bold, italic, underline, strike, subscript, superscript,
    setTextAlign, addImageFromFilePicker, toggleEditable, addQuote, insertCollapse, toggleCollapse,
    insertHR, setColour, clearColour, importBBCode,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEditorEngine() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEditorEngine must be used inside <EditorEngineProvider>');
  return ctx;
}
