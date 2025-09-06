// extensions/indentable-blockquote.tsx
import Blockquote from '@tiptap/extension-blockquote';
import { ReactNodeViewRenderer, NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import React, { useRef, useCallback } from 'react';

// clamp helper
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// A small safety cap so you can't indent forever. Adjust as you like.
const MAX_INDENT_STEPS = 30; // ~36em max extra padding

function IndentableBlockquoteView(props: NodeViewProps) {
  const { node, updateAttributes, editor, selected } = props;
  const indent: number = node.attrs.indent ?? 0;
  const rootRef = useRef<HTMLQuoteElement | null>(null);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // keep focus in the editor so selection stays stable
    editor.view.focus();

    const el = rootRef.current!;
    const rect = el.getBoundingClientRect();

    // step size: 3em in pixels, based on computed font-size of the quote
    const fontSize = parseFloat(getComputedStyle(el).fontSize) || 16;
    const stepPx = 3 * fontSize;

    const startX = e.clientX;
    const startIndent = indent;

    // Optional dynamic cap so you can't indent past container width too much
    const parentWidth = el.parentElement?.getBoundingClientRect().width ?? rect.width;
    const approxMaxSteps = Math.max(0, Math.floor((parentWidth - 96) / stepPx)); // keep ~96px min content room
    const hardMax = Math.max(0, Math.min(MAX_INDENT_STEPS, approxMaxSteps));

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const steps = Math.round(dx / stepPx);
      const next = clamp(startIndent + steps, 0, hardMax);
      if (next !== (props.node.attrs.indent ?? 0)) {
        updateAttributes({ indent: next });
      }
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('mouseup', onUp, true);
    };

    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mouseup', onUp, true);
  }, [editor.view, indent, updateAttributes, props.node.attrs.indent]);

  return (
    <NodeViewWrapper
      as="blockquote"
      ref={rootRef as any}
      className={`blockquote indentable${selected ? ' is-selected' : ''}`}
      data-indent={indent}
      // expose CSS var too, if you prefer using --indent:
      style={{ ['--indent' as any]: String(indent) }}
      // prevent the whole node from being dragged by the browser
      draggable={false}
    >
      {/* left handle */}
      <div
        className="indent-handle"
        onMouseDown={startDrag}
        role="separator"
        aria-label="Drag to change indent"
        title="Drag to change indent (3em steps)"
      />
      {/* the actual editable content of the quote */}
      <NodeViewContent className="content" />
    </NodeViewWrapper>
  );
}

export const IndentableBlockquote = Blockquote.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      indent: {
        default: 0,
        parseHTML: el => Number((el as HTMLElement).dataset.indent ?? 0) || 0,
        renderHTML: attrs => ({
          'data-indent': attrs.indent,
          style: `--indent:${attrs.indent}`,
        }),
      },
    };
  },

  addNodeView() {
    // render as a real <blockquote> so your existing CSS (Quote:) still applies
    return ReactNodeViewRenderer(IndentableBlockquoteView, { as: 'blockquote' });
  },
});
