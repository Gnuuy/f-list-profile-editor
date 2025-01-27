import Placeholder from '@tiptap/extension-placeholder';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Details from '@tiptap-pro/extension-details';
import DetailsContent from '@tiptap-pro/extension-details-content';
import DetailsSummary from '@tiptap-pro/extension-details-summary';
import React, { useCallback, useState } from 'react';
import Button from './Button';

const TiptapEditor = () => {
  const [bbcode, setBBCode] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Details.configure({
        persist: true,
        HTMLAttributes: {
          class: 'details',
        },
      }),
      DetailsSummary,
      DetailsContent,
      Placeholder.configure({
        includeChildren: true,
        placeholder: ({ node }) => {
          if (node.type.name === 'detailsSummary') {
            return 'Summary';
          }
          return null;
        },
      }),
    ],
    content: `
      <p>Look at these details</p>
      <details>
        <summary>This is a summary</summary>
        <p>Surprise!</p>
      </details>
      <p>Nested details are also supported</p>
      <details open>
        <summary>This is another summary</summary>
        <p>And there is even more.</p>
        <details>
          <summary>We need to go deeper</summary>
          <p>Booya!</p>
        </details>
      </details>
    `,
  });

  const addCollapsible = useCallback(() => {
    editor?.chain().focus().insertContent({
      type: 'details',
      content: [
        {
          type: 'detailsSummary',
          content: [
            {
              type: 'text',
              text: 'Summary',
            },
          ],
        },
        {
          type: 'detailsContent',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'This is collapsible content.',
                },
              ],
            },
          ],
        },
      ],
    }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

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
      .replace(/<img src="(.*?)"(.*?)>/g, '[img]$1[/img]')
      .replace(/<details><summary>(.*?)<\/summary>(.*?)<\/details>/gs, '[collapse=$1]$2[/collapse]')
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n');

    setBBCode(bbcodeContent);
    navigator.clipboard.writeText(bbcodeContent);
    alert('BBCode copied to clipboard!');
  };

  return (
    <div>
      <h2>F-List WYSIWYG Editor</h2>

      <div className="toolbar" style={{display : "flex", gap: "0px", justifyContent: "left"}}>
        <Button title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}/>
        <Button title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}/>
        <Button title="Clear Formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}/>
        <Button title="Add Collapsible" onClick={() => addCollapsible()}/>
      </div>

      <EditorContent editor={editor} />

      <button
        onClick={exportToBBCode}
        style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#0070f3', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
      >
        Export to BBCode
      </button>
    </div>
  );
};

export default TiptapEditor;
