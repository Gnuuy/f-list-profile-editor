'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Image from '@tiptap/extension-image';
import Dropcursor from '@tiptap/extension-dropcursor';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import { useEditorContext } from '../context/EditorContext';
import { CustomBlockquote } from './CustomQuoteBlock';
import { CustomCollapsible } from './CustomCollapsible';

export default function Editor() {
  const editor = useEditor({
    extensions: [
      CustomCollapsible,
      CustomBlockquote,
      StarterKit.configure({ blockquote: false }),
      Underline,
      Superscript,
      Subscript,
      Dropcursor,
      Image,
      Color.configure({ types: ['textStyle'] }),
      TextStyle.configure({}),
      TextAlign.configure({ types: ['paragraph'], defaultAlignment: 'left' }),
    ],
    content: '<p>Hello! Welcome to the WYSIWYG Profile Editor!</p>',
  });

  const { setEditorInstance } = useEditorContext();

  useEffect(() => {
    if (editor) {
      setEditorInstance(editor);
    }
  }, [editor, setEditorInstance]);

  if (!editor) return <div>Loading Editor...</div>;

  return (
    <div className="editor">
      <EditorContent editor={editor} />
    </div>
  );
}
