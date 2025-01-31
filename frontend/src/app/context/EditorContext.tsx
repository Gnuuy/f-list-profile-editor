"use client";

import { createContext, useContext, useMemo, useEffect } from "react";
import { useEditor, Editor, EditorOptions } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";

interface EditorContextValue {
  editor: Editor | null;
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
        TextAlign.configure(
            {types: [
                'paragraph'
            ]})],
    content: "", // Initialize with empty content (optional)
  });

  const justifyLeft = () => editor?.chain().focus().setTextAlign("left").run();
  const justifyCenter = () => editor?.chain().focus().setTextAlign("center").run();
  const justifyRight = () => editor?.chain().focus().setTextAlign("right").run();
  const justifyFull = () => editor?.chain().focus().setTextAlign("justify").run();

  const contextValue = useMemo(() => {
    if (!editor) return { editor: null, justifyLeft, justifyCenter, justifyRight, justifyFull };
    return { editor, justifyLeft, justifyCenter, justifyRight, justifyFull };
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
