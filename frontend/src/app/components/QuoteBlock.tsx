import React from 'react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';

export default function QuoteBlock() {
  return (
    <NodeViewWrapper as="blockquote" className="custom-quote">
      <div className="quoteHeader">Quote:
        <NodeViewContent as="div" className="quote-content" />
      </div>
    </NodeViewWrapper>
  );
}