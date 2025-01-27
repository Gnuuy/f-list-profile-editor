import Placeholder from '@tiptap/extension-placeholder';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Details from '@tiptap-pro/extension-details';
import DetailsContent from '@tiptap-pro/extension-details-content';
import DetailsSummary from '@tiptap-pro/extension-details-summary';
import TextAlign from '@tiptap/extension-text-align';
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
      TextAlign.configure({
        types: [
          'paragraph',   // Regular paragraphs
          'heading',     // Headings (h1, h2, etc.)
          'listItem',    // Items in lists
          'blockquote',  // Block quotes
          'tableCell',   // Cells in tables
          'note',        // Example of a custom node
        ]
      }),
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
  
    // Group all centered blocks into one [center] tag
    const bbcodeContent = htmlContent
      .replace(/<strong>(.*?)<\/strong>/g, '[b]$1[/b]') // Bold
      .replace(/<em>(.*?)<\/em>/g, '[i]$1[/i]') // Italics
      .replace(/<img src="(.*?)"(.*?)>/g, '[img]$1[/img]') // Images
      .replace(/<details><summary>(.*?)<\/summary>(.*?)<\/details>/gs, '[collapse=$1]$2[/collapse]') // Collapsible sections
      // Combine all adjacent <p style="text-align: center"> blocks into a single [center] block
      .replace(/(<p style="text-align: center">([\s\S]*?)<\/p>)/g, (match, content) => {
        return content.replace(/<br\s*\/?>/gi, '\n'); // Replace <br> with newlines
      })
      .replace(
        /(<p style="text-align: center">([\s\S]*?)<\/p>\n?)+/g,
        (match) => {
          const combined = match
            .replace(/<p style="text-align: center">/g, '') // Remove opening <p>
            .replace(/<\/p>/g, '') // Remove closing </p>
            .trim(); // Trim unnecessary whitespace
          return `[center]${combined}[/center]`; // Wrap entire block in one [center] tag
        }
      )
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n') // Handle normal paragraphs
      .replace(/<p style="text-align: right">([\s\S]*?)<\/p>/g, '[right]$1[/right]') // Right-aligned text
      .replace(/<p style="text-align: justify">([\s\S]*?)<\/p>/g, '[justify]$1[/justify]'); // Justified text
  
    // Copy the processed BBCode to clipboard and alert the user
    setBBCode(bbcodeContent);
    navigator.clipboard.writeText(bbcodeContent);
    alert('BBCode copied to clipboard!');
  };
  
  
  
  return (
    <div>
      <div className="flex justify-between flex-nowrap spaced">
        <div className="flex">
          <Button title="" onClick={() => editor.chain().focus().toggleItalic().run()} iconPath="/icons/italic-font.png" />
          <Button title="" onClick={() => editor.chain().focus().toggleBold().run()} iconPath="/icons/bold.png" />
          <Button title="" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}/>
          <Button title="" onClick={() => addCollapsible()}/>
          <Button title=""/>
        </div>
        <div className="flex">
          <Button title="" onClick={() => editor.chain().focus().setTextAlign('left').run()} iconPath="/icons/justify-left.png"/>
          <Button title="" onClick={() => editor.chain().focus().setTextAlign('center').run()} iconPath="/icons/center-align.png"/>
          <Button title="" onClick={() => editor.chain().focus().setTextAlign('justify').run()} iconPath="/icons/justify.png"/>
          <Button title="" onClick={() => editor.chain().focus().setTextAlign('right').run()} iconPath="/icons/justify-right.png"/>
        </div>
        <div className="flex">
          <Button title="" iconPath="/icons/justify-right.png"/>
          <Button title="" iconPath="/icons/justify-right.png"/>
          <Button title="" iconPath="/icons/justify-right.png"/>
          <Button title="" iconPath="/icons/justify-right.png"/>
        </div>
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
