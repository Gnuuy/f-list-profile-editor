'use client';

import React, { createContext, useContext } from 'react';
import type {
  DocumentNode,
  Node,
  Mark,
} from '../interface/types'

interface BBCodeContextValue {
  parseBBCodeToJSON: (bbcode: string) => DocumentNode;
  parseJSONToBBCode: (json: DocumentNode) => string;
}

const BBCodeContext = createContext<BBCodeContextValue | null>(null);

const addMarkToTextNodes = (nodes: Node[], mark: Mark) => {
  nodes.forEach((node) => {
    if (node.type === 'text') {
      node.marks = [...(node.marks || []), mark];
    }
  });
};

export const BBCodeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const parseBBCodeToJSON = (bbcode: string): DocumentNode => {
    let index = 0;

    const parseNodes = (stopTag?: string): Node[] => {
      const nodes: Node[] = [];

      while (index < bbcode.length) {
        const nextOpen = bbcode.indexOf('[', index);
        if (nextOpen === -1) {
          nodes.push({ type: 'text', text: bbcode.slice(index) });
          break;
        }

        if (nextOpen > index) {
          nodes.push({ type: 'text', text: bbcode.slice(index, nextOpen) });
        }

        const endBracket = bbcode.indexOf(']', nextOpen);
        if (endBracket === -1) break;

        const tagContent = bbcode.slice(nextOpen + 1, endBracket).trim();
        const isClosing = tagContent.startsWith('/');
        const tagNameRaw = isClosing ? tagContent.slice(1).trim() : tagContent;
        const [tagName, attr] = tagNameRaw.split('=');

        index = endBracket + 1;

        if (isClosing) {
          if (stopTag === tagName) break;
          else continue;
        }

        const contentStart = index;
        const childNodes = parseNodes(tagName.trim().toLowerCase());
        const contentEnd = index;
        const innerText = bbcode.slice(contentStart, contentEnd);

        switch (tagName.trim().toLowerCase()) {
          case 'b':
            addMarkToTextNodes(childNodes, { type: 'bold' });
            nodes.push(...childNodes);
            break;
          case 'i':
            addMarkToTextNodes(childNodes, { type: 'italic' });
            nodes.push(...childNodes);
            break;
          case 'u':
            addMarkToTextNodes(childNodes, { type: 'underline' });
            nodes.push(...childNodes);
            break;
          case 's':
            addMarkToTextNodes(childNodes, { type: 'strike' });
            nodes.push(...childNodes);
            break;
          case 'sub':
            addMarkToTextNodes(childNodes, { type: 'subscript' });
            nodes.push(...childNodes);
            break;
          case 'sup':
            addMarkToTextNodes(childNodes, { type: 'superscript' });
            nodes.push(...childNodes);
            break;
          case 'color':
            if (attr) {
              addMarkToTextNodes(childNodes, {
                type: 'textStyle',
                attrs: { color: attr },
              });
            }
            nodes.push(...childNodes);
            break;
          case 'url':
            addMarkToTextNodes(childNodes, {
              type: 'link',
              attrs: { href: attr || innerText.trim() },
            });
            nodes.push(...childNodes);
            break;
          case 'img':
            nodes.push({
              type: 'image',
              attrs: { src: attr || innerText.trim(), alt: 'Image' },
            });
            break;
          case 'hr':
            nodes.push({ type: 'horizontalRule' });
            break;
          case 'center':
          case 'left':
          case 'right':
            nodes.push({
              type: 'paragraph',
              attrs: { textAlign: tagName as 'left' | 'right' | 'center' },
              content: childNodes,
            });
            break;
          default:
            nodes.push({ type: 'text', text: innerText });
            break;
        }
      }

      return nodes;
    };

    const content = parseNodes();
    return { type: 'doc', content };
  };

  const parseJSONToBBCode = (json: DocumentNode): string => {
    const buildMarks = (text: string, marks: Mark[] = []): string => {
      return marks.reduce((acc, mark) => {
        switch (mark.type) {
          case 'bold': return `[b]${acc}[/b]`;
          case 'italic': return `[i]${acc}[/i]`;
          case 'underline': return `[u]${acc}[/u]`;
          case 'strike': return `[s]${acc}[/s]`;
          case 'subscript': return `[sub]${acc}[/sub]`;
          case 'superscript': return `[sup]${acc}[/sup]`;
          case 'textStyle': return `[color=${mark.attrs.color}]${acc}[/color]`;
          case 'link': return `[url=${mark.attrs.href}]${acc}[/url]`;
          default: return acc;
        }
      }, text);
    };

    const printNode = (node: Node): string => {
      switch (node.type) {
        case 'text':
          return buildMarks(node.text, node.marks);
        case 'paragraph': {
          const align = node.attrs?.textAlign;
          const content = node.content?.map(printNode).join('') ?? '';
          return content;
        }
        case 'image':
          return `[img]${node.attrs.src}[/img]`;
        case 'horizontalRule':
          return `[hr]`;
        default:
          return '';
      }
    };

    const groupedByAlignment: Record<string, string[]> = {};

    json.content.forEach((node) => {
      if (node.type === 'paragraph') {
        const align = node.attrs?.textAlign || 'left';
        const rendered = printNode(node);
        if (!groupedByAlignment[align]) groupedByAlignment[align] = [];
        groupedByAlignment[align].push(rendered);
      } else {
        if (!groupedByAlignment['left']) groupedByAlignment['left'] = [];
        groupedByAlignment['left'].push(printNode(node));
      }
    });

    return Object.entries(groupedByAlignment).map(([align, blocks]) => {
      const content = blocks.join('\n');
      if (align === 'left') return content;
      return `[${align}]${content}[/${align}]`;
    }).join('\n');
  };

  return (
    <BBCodeContext.Provider value={{ parseBBCodeToJSON, parseJSONToBBCode }}>
      {children}
    </BBCodeContext.Provider>
  );
};

export const useBBCode = (): BBCodeContextValue => {
  const ctx = useContext(BBCodeContext);
  if (!ctx) throw new Error('useBBCode must be used within a BBCodeProvider');
  return ctx;
};