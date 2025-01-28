import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import React, { useCallback, useState } from 'react';
export default function Editor() {
  const [bbcode, setBBCode] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: [
          'paragraph',   // Regular paragraphs
          'heading',     // Headings (h1, h2, etc.)
          'listItem',    // Items in lists
          'blockquote',  // Block quotes
          'tableCell',   // Cells in tables
          'note',        // Example of a custom node
        ],
        }),
        TextStyle,
        Color
      ],
      content: `
      
      <p>Hello! Welcome to the F-list WYSIWYG Profile Editor!</p>
          
      `
      });

  if (!editor) {
    return null;
  }

  const exportToBBCode = () => {
    const htmlContent = editor?.getHTML() || '';
  
    // Process the centered blocks
    const bbcodeContent = htmlContent
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
      .replace(/(<p style="text-align: center">[\s\S]*?<\/p>\n?)+/g, (match) => {
        // Extract all content inside the group of centered paragraphs
        const combinedContent = match
          .replace(/<p style="text-align: center">/g, '') // Remove opening <p>
          .replace(/<\/p>/g, '\n\n') // Remove closing </p>
          .trim(); // Trim unnecessary whitespace
        
        // If content is empty, return an empty string (no tags)
        if (!combinedContent) {
          return '';
        }
        
        // Wrap the entire content in one [center] tag
        return `[center]${combinedContent}[/center]`;
      })
  
    // Copy to clipboard and alert
    setBBCode(bbcodeContent);
    navigator.clipboard.writeText(bbcodeContent);
    alert('BBCode copied to clipboard!');
  };
  
  
  return (
    <div>
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
