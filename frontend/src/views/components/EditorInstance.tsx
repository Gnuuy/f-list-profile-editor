import { useEffect } from 'react';

import { useEditor, EditorContent } from '@tiptap/react';

import { useEditorEngine } from '../../context/EditorEngineContext';
import { createEditorExtensions } from '../../models/EditorExtensions';

export function EditorInstance() {
  const { setEditorInstance } = useEditorEngine();

  const editor = useEditor({
    editorProps: {
        attributes: {
          spellcheck: 'true',
          'aria-label': 'Profile editor'
        }
    },
    extensions: createEditorExtensions(),
    content: 
    "<p>Welcome to the Funny Site WYSIWYG Profile Editor!</p>",
  });

  useEffect(() => {
    setEditorInstance(editor);

    return () => setEditorInstance(null);
  }, [editor, setEditorInstance]);

  return <EditorContent editor={editor} />;
}
