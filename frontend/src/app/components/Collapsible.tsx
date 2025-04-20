import { useState, useRef } from 'react';
import {
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
} from '@tiptap/react';

export default function CollapsibleNodeView({ node, updateAttributes }: NodeViewProps) {
  const title = node.attrs.title || 'Click to expand';
  const [isOpen, setIsOpen] = useState(true);
  const inputRef = useRef<HTMLDivElement>(null);

  const handleBlur = () => {
    const newTitle = inputRef.current?.innerText?.trim() || '';
    if (newTitle !== title) {
      updateAttributes({ title: newTitle });
    }
  };

  return (
    <NodeViewWrapper as="div" className="custom-collapsible">
      <div className="collapsibleHeader">
        <button
          type="button"
          className="collapsibleToggle"
          onClick={() => setIsOpen(prev => !prev)}
        >
          ⬇
        </button>
        <div
          ref={inputRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          className="collapsibleTitle"
          style={{
            display: 'inline-block',
            fontWeight: 'bold',
            outline: 'none',
            minWidth: '2ch',
          }}
        >
          {title}
        </div>
      </div>
      {isOpen && (
        <div className="collapsible-content">
          <NodeViewContent as="div" />
        </div>
      )}
    </NodeViewWrapper>
  );
}
