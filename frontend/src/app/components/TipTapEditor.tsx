import { useEditor, EditorContent } from '@tiptap/react';
import Image from '@tiptap/extension-image'
import StarterKit from '@tiptap/starter-kit';
import { useState } from 'react';
import { useCallback } from 'react';

const TiptapEditor = () => {
  const [bbcode, setBBCode] = useState('');

  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: '<p>Hello, start editing!</p>',
  });

  // Function to convert HTML to BBCode
  const exportToBBCode = () => {
    const htmlContent = editor?.getHTML() || '';
    const bbcodeContent = htmlContent
      .replace(/<b>(.*?)<\/b>/g, '[b]$1[/b]')
      .replace(/<i>(.*?)<\/i>/g, '[i]$1[/i]')
      .replace(/<u>(.*?)<\/u>/g, '[u]$1[/u]')
      .replace(/<h1>(.*?)<\/h1>/g, '[h1]$1[/h1]')
      .replace(/<h2>(.*?)<\/h2>/g, '[h2]$1[/h2]')
      .replace(/<ul>(.*?)<\/ul>/gs, '[list]$1[/list]')
      .replace(/<li>(.*?)<\/li>/g, '[*]$1')
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n'); // F-List often uses double line breaks for paragraphs

    setBBCode(bbcodeContent);
    navigator.clipboard.writeText(bbcodeContent);
    alert('BBCode copied to clipboard!');
  };

  const addImage = useCallback(() => {
    const url = window.prompt('URL')

    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  if (!editor) {
    return null; // Prevent rendering until the editor is ready
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar">
        <button onClick={() => editor.chain().focus().toggleBold().run()}>Bold</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()}>Italic</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()}>Bullet List</button>
        <button onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
        <button onClick={addImage}>Set image</button>
          Clear Formatting
        </button>
      </div>

      {/* Editor Content */}
      <div className="editor-container">
        <EditorContent editor={editor} />
      </div>

      {/* Export Button */}
      <button onClick={exportToBBCode} style={{ marginTop: '20px' }}>
        Export to BBCode
      </button>
    </div>
  );
};

export default TiptapEditor;
