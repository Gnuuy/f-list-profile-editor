import { Node, ReactNodeViewRenderer } from '@tiptap/react';
import type { CommandProps } from '@tiptap/react';
import QuoteBlock from './QuoteBlock';

declare module '@tiptap/core' {
  interface Commands<ReturnType = any> {
    qoute: {
      setQuote: () => ReturnType
    }
  }
}

export const CustomBlockquote = Node.create({
  name: 'blockquote',

  group: 'block',
  content: 'block+',
  defining: true,

  parseHTML() {
    return [{ tag: 'blockquote' }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuoteBlock);
  },

  addCommands() {
    return {
      setQuote: () => ({chain}: CommandProps) => {
        return chain().wrapIn('blockquote').run();
      }
    };
  },
});
