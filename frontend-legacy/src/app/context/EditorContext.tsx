'use client';

import { createContext, useContext, useMemo, useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

interface EditorContextValue {
  editor: Editor | null;
  setEditorInstance: (editor: Editor) => void;

  isColourPickerOpen: boolean;
  colourPickerPosition: DOMRect | null;

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
  closeColourPicker: () => void;

  addImage: () => void;

  justifyLeft: () => void;
  justifyCenter: () => void;
  justifyRight: () => void;
  justifyFull: () => void;
}

const EditorContext = createContext<EditorContextValue | undefined>(undefined);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [isColourPickerOpen, setIsColourPickerOpen] = useState(false);
  const [colourPickerPosition, setColourPickerPosition] = useState<DOMRect | null>(null);

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
  if (isColourPickerOpen) {
    closeColourPicker();
  } else if (event) {
    const rect = event.currentTarget.getBoundingClientRect();
    setColourPickerPosition(rect);
    setIsColourPickerOpen(true);
  }
  };

  const closeColourPicker = () => {
    setIsColourPickerOpen(false);
    setColourPickerPosition(null);
  };

  const setColour = (color: string) => {
    editorInstance?.chain().focus().setColor(color).run();
    closeColourPicker();
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
    addImage,
    justifyLeft,
    justifyCenter,
    justifyRight,
    justifyFull,
    toggleColourPicker,
    isColourPickerOpen,
    colourPickerPosition,
    setColour,
    closeColourPicker,
  }), [editorInstance]);

  return <EditorContext.Provider value={contextValue}>{children}</EditorContext.Provider>;
}

export function useEditorContext() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditorContext must be used within an EditorProvider');
  }
  return context;
}