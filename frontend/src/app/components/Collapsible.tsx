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

  // Save title on blur
  const handleBlur = () => {
    const newTitle = inputRef.current?.innerText.trim() || '';
    if (newTitle !== title) {
      updateAttributes({ title: newTitle });
    }
  };

  return (
    <NodeViewWrapper
      as="div"
      className={`collapseBox${isOpen ? '' : ' closed'}`}
    >
      <div
        className="collapseBoxHead"
        onClick={() => setIsOpen(open => !open)}
      >
        <div
          ref={inputRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          onMouseDown={e => {
            e.stopPropagation()
            e.preventDefault()
            inputRef.current?.focus()
          }}
          className="collapseTitle"
        >
          <img
            src={isOpen ? '/icons/chevron-expand.png' : '/icons/chevron.png'}
            alt="toggle"
            style={{ marginRight: '0.5rem' }}
          />
          {title}
        </div>
      </div>
      <div className="collapseBoxContent">
        <NodeViewContent as="div" />
      </div>
    </NodeViewWrapper>
  );
}
