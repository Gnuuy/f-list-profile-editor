"use client";

import { EditorContent, BubbleMenu } from "@tiptap/react";
import React, { useEffect } from "react";
import { useEditorContext } from "../context/EditorContext";
import BubbleMenuLayout from "./BubbleMenuLayout";


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
      {editor && <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
        <BubbleMenuLayout />
      </BubbleMenu>}
      <EditorContent editor={editor} />
    </div>
  );
}