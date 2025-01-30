import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import React, { useState } from 'react';

export default function Editor() {
  const [bbcode, setBBCode] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['paragraph', 'heading', 'listItem', 'blockquote', 'tableCell', 'note'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
      TextStyle,
      Color,
    ],
    content: `
      <p>Hello! Welcome to the F-list WYSIWYG Profile Editor!</p>
    `,
  });

  if (!editor) {
    return null;
  }

  const exportToBBCode = () => {
    const jsonContent = editor?.getJSON();
  
    if (!jsonContent) {
      return;
    }
  
    // Recursive function to traverse the JSON tree
    const traverseNode = (node) => {
      let bbcode = '';
  
      // Handle text nodes
      if (node.type === 'text') {
        return node.text;
      }
  
      // Handle paragraphs with alignment
      if (node.type === 'paragraph') {
        const align = node.attrs?.textAlign || 'left';
  
        // Get the content of the paragraph
        let content = '';
        if (node.content) {
          content = node.content.map(traverseNode).join('');
        }
  
        // Return the paragraph with alignment tags
        return { align, content };
      }
  
      // Handle other node types (e.g., headings, lists, etc.)
      if (node.type === 'heading') {
        const level = node.attrs?.level || 1;
        const align = node.attrs?.textAlign || 'left';
        let content = '';
        if (node.content) {
          content = node.content.map(traverseNode).join('');
        }
  
        return `[${align}][h${level}]${content}[/h${level}][/${align}]`;
      }
  
      // Handle lists
      if (node.type === 'bulletList' || node.type === 'orderedList') {
        const align = node.attrs?.textAlign || 'left';
        let content = '';
        if (node.content) {
          content = node.content.map(traverseNode).join('');
        }
  
        const listTag = node.type === 'bulletList' ? 'list' : 'list=1';
        return `[${align}][${listTag}]${content}[/${listTag}][/${align}]`;
      }
  
      // Handle list items
      if (node.type === 'listItem') {
        let content = '';
        if (node.content) {
          content = node.content.map(traverseNode).join('');
        }
  
        return `[*]${content}`;
      }
  
      // Handle other node types (e.g., bold, italic, etc.)
      if (node.type === 'textStyle') {
        let content = '';
        if (node.content) {
          content = node.content.map(traverseNode).join('');
        }
  
        if (node.attrs?.color) {
          return `[color=${node.attrs.color}]${content}[/color]`;
        } else {
          return content;
        }
      }
  
      if (node.type === 'bold') {
        let content = '';
        if (node.content) {
          content = node.content.map(traverseNode).join('');
        }
  
        return `[b]${content}[/b]`;
      }
  
      if (node.type === 'italic') {
        let content = '';
        if (node.content) {
          content = node.content.map(traverseNode).join('');
        }
  
        return `[i]${content}[/i]`;
      }
  
      // Default case: process child nodes
      if (node.content) {
        return node.content.map(traverseNode).join('');
      }
  
      return '';
    };
  
    // Function to group consecutive paragraphs with the same alignment
    const groupParagraphs = (nodes) => {
      let groupedBBCode = '';
      let currentAlignment = null;
      let currentContent = '';
  
      for (const node of nodes) {
        if (node.type === 'paragraph') {
          const { align, content } = traverseNode(node);
  
          // If the alignment matches the current group, add to the group
          if (align === currentAlignment) {
            currentContent += `\n${content}`;
          } else {
            // Close the previous group
            if (currentAlignment !== null) {
              groupedBBCode += `[${currentAlignment}]${currentContent}[/${currentAlignment}]`;
            }
  
            // Start a new group
            currentAlignment = align;
            currentContent = content;
          }
        } else {
          // Close the previous group
          if (currentAlignment !== null) {
            groupedBBCode += `[${currentAlignment}]${currentContent}[/${currentAlignment}]`;
            currentAlignment = null;
            currentContent = '';
          }
  
          // Handle non-paragraph nodes
          groupedBBCode += traverseNode(node);
        }
      }
  
      // Close the last group
      if (currentAlignment !== null) {
        groupedBBCode += `[${currentAlignment}]${currentContent}[/${currentAlignment}]`;
      }
  
      return groupedBBCode;
    };
  
    // Generate BBCode from the JSON content
    const bbcodeContent = groupParagraphs(jsonContent.content);
  
    // Copy to clipboard and alert
    setBBCode(bbcodeContent);
    navigator.clipboard.writeText(bbcodeContent);
    alert('BBCode copied to clipboard!');
  };
  
  return (
    <div>
      {/* Toolbar with alignment buttons */}
      <div style={{ marginBottom: '10px', display: 'flex', gap: '5px' }}>
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          style={{
            padding: '5px 10px',
            backgroundColor: editor.isActive({ textAlign: 'left' }) ? '#0070f3' : '#eee',
            color: editor.isActive({ textAlign: 'left' }) ? '#fff' : '#000',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Left
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          style={{
            padding: '5px 10px',
            backgroundColor: editor.isActive({ textAlign: 'center' }) ? '#0070f3' : '#eee',
            color: editor.isActive({ textAlign: 'center' }) ? '#fff' : '#000',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Center
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          style={{
            padding: '5px 10px',
            backgroundColor: editor.isActive({ textAlign: 'right' }) ? '#0070f3' : '#eee',
            color: editor.isActive({ textAlign: 'right' }) ? '#fff' : '#000',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Right
        </button>
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
}