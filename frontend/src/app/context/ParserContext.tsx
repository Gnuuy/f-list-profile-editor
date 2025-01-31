'use client';

import React, { createContext, useContext } from 'react';

// Create context
const BBCodeContext = createContext();

// BBCode provider component
export const BBCodeProvider = ({ children }) => {
  // Function to parse BBCode into TipTap JSON
  const parseBBCodeToJSON = (bbcode) => {
    const nodes = [];
    let currentIndex = 0;

    // Regex to match BBCode tags
    const bbcodeRegex = /\[(\w+)(?:=([^\]]+))?\](.*?)\[\/\1\]/gs;

    let match;
    while ((match = bbcodeRegex.exec(bbcode)) !== null) {
      const [fullMatch, tag, attribute, content] = match;

      if (currentIndex < match.index) {
        nodes.push({
          type: 'text',
          text: bbcode.slice(currentIndex, match.index),
        });
      }

      switch (tag) {
        case 'b':
          nodes.push({ type: 'text', text: content, marks: [{ type: 'bold' }] });
          break;
        case 'i':
          nodes.push({ type: 'text', text: content, marks: [{ type: 'italic' }] });
          break;
        case 'u':
          nodes.push({ type: 'text', text: content, marks: [{ type: 'underline' }] });
          break;
        case 'color':
          nodes.push({
            type: 'text',
            text: content,
            marks: [{ type: 'textStyle', attrs: { color: attribute } }],
          });
          break;
        case 'center':
        case 'left':
        case 'right':
          nodes.push({
            type: 'paragraph',
            attrs: { textAlign: tag },
            content: [{ type: 'text', text: content }],
          });
          break;
        case 'list':
          nodes.push({
            type: 'bulletList',
            content: content
              .split('[*]')
              .filter((item) => item.trim())
              .map((item) => ({
                type: 'listItem',
                content: [{ type: 'text', text: item }],
              })),
          });
          break;
        case 'list=1':
          nodes.push({
            type: 'orderedList',
            content: content
              .split('[*]')
              .filter((item) => item.trim())
              .map((item) => ({
                type: 'listItem',
                content: [{ type: 'text', text: item }],
              })),
          });
          break;
        case 'img':
          nodes.push({
            type: 'image',
            attrs: {
              src: attribute || content,
              alt: 'Image',
            },
          });
          break;
        case 'hr':
          nodes.push({ type: 'horizontalRule' });
          break;
        default:
          nodes.push({ type: 'text', text: content });
          break;
      }

      currentIndex = bbcodeRegex.lastIndex;
    }

    if (currentIndex < bbcode.length) {
      nodes.push({ type: 'text', text: bbcode.slice(currentIndex) });
    }

    return { type: 'doc', content: nodes };
  };

  // Function to convert JSON to BBCode
  const parseJSONToBBCode = (json) => {
    let bbcode = '';

    const traverseNode = (node) => {
      if (node.type === 'text') {
        const marks = node.marks || [];
        const startTags = marks.map((mark) => `[${mark.type}]`).join('');
        const endTags = marks.map((mark) => `[/${mark.type}]`).reverse().join('');

        bbcode += `${startTags}${node.text}${endTags}`;
      } else if (node.type === 'paragraph') {
        bbcode += `[${node.attrs.textAlign || 'left'}]${node.content.map(traverseNode).join('')}[/${node.attrs.textAlign || 'left'}]\n\n`;
      } else if (node.type === 'bulletList' || node.type === 'orderedList') {
        const listTag = node.type === 'orderedList' ? 'list=1' : 'list';
        bbcode += `[${listTag}]\n${node.content.map((item) => `[*]${item.content.map(traverseNode).join('')}`).join('\n')}\n[/${listTag}]\n\n`;
      }
    };

    json.content.forEach(traverseNode);
    return bbcode.trim();
  };

  return <BBCodeContext.Provider value={{ parseBBCodeToJSON, parseJSONToBBCode }}>
    {children}
    </BBCodeContext.Provider>;
};

export const useBBCode = () => useContext(BBCodeContext);
