import { useEffect } from 'react';

import { useEditor, EditorContent } from '@tiptap/react';
import { TextStyleKit } from '@tiptap/extension-text-style';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import StarterKit from '@tiptap/starter-kit'
import Blockquote from '@tiptap/extension-blockquote';
import { IndentableBlockquote } from './extensions/IndentableBlockquote';
import { Collapsible } from './extensions/Collapsible';
import { Color } from '@tiptap/extension-text-style';

import { useEditorEngine } from '../../context/EditorEngineContext';

import { Hotkeys } from '../../utilities/Hotkeys';
import { QuoteSelection } from '../../utilities/QuoteSelection';
import { AlignableImage } from '../../utilities/AlignableImage';

export function EditorInstance() {
  const { setEditorInstance } = useEditorEngine();

  const editor = useEditor({
    editorProps: {
        attributes: {
          spellcheck: 'true',
          'aria-label': 'Profile editor'
        }
    },
    extensions: [
      StarterKit.configure({ blockquote: false}),
      TextStyleKit,
      Hotkeys,
      Color,
      Subscript,
      Superscript,
      Blockquote,
      IndentableBlockquote,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image,
      QuoteSelection,
      Collapsible,
      AlignableImage
    ],
    content: 
    "<p>Welcome to the Funny Site WYSIWYG Profile Editor!</p>",
  });

  useEffect(() => {
    if (editor) setEditorInstance(editor);
  }, [editor, setEditorInstance]);

  return <EditorContent editor={editor} />;
}
