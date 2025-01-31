"use client";

import { EditorContent } from "@tiptap/react";
import React, { useEffect } from "react";
import { useEditorContext } from "../context/EditorContext";

export default function Editor() {
  const { editor } = useEditorContext();

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(`<p>Hello! Welcome to the F-list WYSIWYG Profile Editor!</p>`);
    }
  }, [editor]);

  if (!editor) {
    return <div>Loading Editor...</div>;
  }

  return (
    <div className="editor">
      <EditorContent editor={editor} />
    </div>
  );
}