"use client";

import { createContext, useContext, useMemo, useEffect, useCallback } from "react";
import { useEditor, Editor, EditorOptions } from "@tiptap/react";

// TipTap imports
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import BubbleMenu from "@tiptap/extension-bubble-menu";
import Dropcursor from "@tiptap/extension-dropcursor";
import Image from "@tiptap/extension-image";
import Color from "@tiptap/extension-color";
import DragHandle from "@tiptap-pro/extension-drag-handle-react";
import { DragHandlePlugin } from "@tiptap-pro/extension-drag-handle";



interface EditorContextValue {
  editor: Editor | null;

  italic: () => void;
  bold: () => void;
  underline: () => void;
  strikethrough: () => void;
  subscript: () => void;
  superscript: () => void;

  addImage: () => void;

  justifyLeft: () => void;
  justifyCenter: () => void;
  justifyRight: () => void;
  justifyFull: () => void;
}

const EditorContext = createContext<EditorContextValue | undefined>(undefined);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const editor = useEditor({
    extensions: [
        StarterKit,
        Underline,
        Subscript,
        Superscript,
        Image,
        Dropcursor,
        TextAlign.configure(
            {types: [
                'paragraph'
            ],
            defaultAlignment:'left'})],
  });

  const addImage = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
  
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
  
      const reader = new FileReader();
      reader.onload = () => {
        editor?.chain().focus().setImage({ src: reader.result as string }).run();
      };
      reader.readAsDataURL(file); // Convert to Base64
    };
  
    input.click();
  }, [editor]);
  

  // Text Modifiers
  const italic = () => editor?.chain().focus().toggleItalic().run();
  const bold = () => editor?.chain().focus().toggleBold().run();
  const underline = () => editor?.chain().focus().toggleUnderline().run();
  const strikethrough = () => editor?.chain().focus().toggleStrike().run();
  const subscript = () => editor?.chain().focus().toggleSubscript().run();
  const superscript = () => editor?.chain().focus().toggleSuperscript().run();

  // Text Alignment
  const justifyLeft = () => editor?.chain().focus().setTextAlign("left").run();
  const justifyCenter = () => editor?.chain().focus().setTextAlign("center").run();
  const justifyRight = () => editor?.chain().focus().setTextAlign("right").run();
  const justifyFull = () => editor?.chain().focus().setTextAlign("justify").run();

  const contextValue = useMemo(() => {
    if (!editor) return { editor: null, justifyLeft, justifyCenter, justifyRight, justifyFull, italic, bold, underline, strikethrough, subscript, superscript, addImage};
    return { editor, justifyLeft, justifyCenter, justifyRight, justifyFull, italic, bold, underline, strikethrough, subscript, superscript, addImage };
  }, [editor]);

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  return <EditorContext.Provider value={contextValue}>{children}</EditorContext.Provider>;
}

export function useEditorContext() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditorContext must be used within an EditorProvider");
  }
  return context;
}
