'use client';

import { createContext, useContext, useMemo, useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

interface EditorContextValue {
  editor: Editor | null;
  setEditorInstance: (editor: Editor) => void;
  isColourPickerOpen: boolean;
  colourPickerPosition: { top: number; left: number };

  toggleDrag: () => void;

  italic: () => void;
  bold: () => void;
  underline: () => void;
  strikethrough: () => void;
  subscript: () => void;
  superscript: () => void;
  addQuote: () => void;
  addCollapsible: () => void;

  toggleColourPicker: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  setColour: (colour: string) => void;
  addImage: () => void;

  justifyLeft: () => void;
  justifyCenter: () => void;
  justifyRight: () => void;
  justifyFull: () => void;

  insertQuote: () => void;
}

const EditorContext = createContext<EditorContextValue | undefined>(undefined);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [isColourPickerOpen, setColourPickerOpen] = useState(false);
  const [colourPickerPosition, setColorPickerPosition] = useState({ top: 0, left: 0 });

  const addImage = () => {
    if (!editorInstance) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        editorInstance.chain().focus().setImage({ src: reader.result as string }).run();
      };
      reader.readAsDataURL(file);
    };

    input.click();
  };

  const toggleDrag = () => {
    if (!editorInstance) return;
    editorInstance.setEditable(!editorInstance.isEditable);
    editorInstance.view.dispatch(editorInstance.view.state.tr);
  };

  const toggleColourPicker = (event?: React.MouseEvent<HTMLButtonElement>) => {
    setColourPickerOpen((prev) => !prev);

    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      setColorPickerPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  };

  const setColour = (colour: string) => {
    if (!editorInstance) return;
    editorInstance.chain().focus().setColor(colour).run();
    setColourPickerOpen(false);
  };

  const italic = () => editorInstance?.chain().focus().toggleItalic().run();
  const bold = () => editorInstance?.chain().focus().toggleBold().run();
  const underline = () => editorInstance?.chain().focus().toggleUnderline().run();
  const strikethrough = () => editorInstance?.chain().focus().toggleStrike().run();
  const subscript = () => editorInstance?.chain().focus().toggleSubscript().run();
  const superscript = () => editorInstance?.chain().focus().toggleSuperscript().run();

  const addQuote = () => editorInstance?.chain().focus().setQuote().run();
  const addCollapsible = () => editorInstance?.chain().focus().addCollapsible().run();

  const justifyLeft = () => editorInstance?.chain().focus().setTextAlign('left').run();
  const justifyCenter = () => editorInstance?.chain().focus().setTextAlign('center').run();
  const justifyRight = () => editorInstance?.chain().focus().setTextAlign('right').run();
  const justifyFull = () => editorInstance?.chain().focus().setTextAlign('justify').run();

  const insertQuote = () => {
    if (!editorInstance) return;

    editorInstance.chain().focus().insertContent({
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Your quoted text here.',
            },
          ],
        },
      ],
    }).run();
  };

  const contextValue = useMemo(() => ({
    editor: editorInstance,
    addQuote,
    addCollapsible,
    setEditorInstance,
    toggleDrag,
    italic,
    bold,
    underline,
    strikethrough,
    subscript,
    superscript,
    toggleColourPicker,
    setColour,
    addImage,
    justifyLeft,
    justifyCenter,
    justifyRight,
    justifyFull,
    insertQuote,
    isColourPickerOpen,
    colourPickerPosition,
  }), [editorInstance, isColourPickerOpen, colourPickerPosition]);

  return <EditorContext.Provider value={contextValue}>{children}</EditorContext.Provider>;
}

export function useEditorContext() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditorContext must be used within an EditorProvider');
  }
  return context;
}