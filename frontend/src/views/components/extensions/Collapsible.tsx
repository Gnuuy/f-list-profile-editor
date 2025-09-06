// extensions/collapsible.tsx
import { Node } from '@tiptap/core';
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewContent,
} from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import React, { useCallback, useRef } from 'react';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const MAX_INDENT_STEPS = 80;  // generous cap

function CollapsibleView(props: NodeViewProps) {
  const { node, editor, updateAttributes, selected } = props;
  const { title = 'Details', indent = 0, collapsed = false } = node.attrs as {
    title: string; indent: number; collapsed: boolean;
  };

  const rootRef = useRef<HTMLDivElement | null>(null);

  // --- toggle by clicking the HEADER (not the drag bar, not the title input) ---
  const handleHeaderMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Don’t toggle if you started on the title input
    const target = e.target as HTMLElement;
    if (target.closest('input.collapse-title')) return;

    // detect click vs drag: toggle only if it's a "click" (movement < 4px)
    e.preventDefault(); e.stopPropagation();
    editor.view.focus();

    const startX = e.clientX, startY = e.clientY;
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mouseup', onUp, true);
      const dx = Math.abs(ev.clientX - startX);
      const dy = Math.abs(ev.clientY - startY);
      if (dx < 4 && dy < 4) {
        updateAttributes({ collapsed: !collapsed });
      }
    };
    window.addEventListener('mouseup', onUp, true);
  }, [collapsed, updateAttributes, editor.view]);

  // --- editable title in header ---
  const onTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateAttributes({ title: e.target.value || 'Details' });
  }, [updateAttributes]);

  // --- LEFT draggable bar for indent (moves whole block) ---
  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    editor.view.focus();

    const el = rootRef.current!;
    const fontSize = parseFloat(getComputedStyle(el).fontSize) || 16;
    const stepPx   = 3 * fontSize;

    const startX = e.clientX;
    const startIndent = indent;

    // container-aware max so it never becomes absurdly thin
    const container = el.parentElement ?? el;
    const containerW = container.getBoundingClientRect().width;
    const MIN_BLOCK_PX = 160;
    const maxByContainer = Math.floor((containerW - MIN_BLOCK_PX) / stepPx);
    const hardMax = Math.max(0, Math.min(MAX_INDENT_STEPS, maxByContainer));

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
  }, [indent, updateAttributes, props.node.attrs.indent, editor.view]);

  return (
    <NodeViewWrapper
      as="div"
      ref={rootRef as any}
      className={`collapse indentable${selected ? ' is-selected' : ''}${collapsed ? ' is-collapsed' : ''}`}
      data-indent={indent}
      data-collapsed={collapsed ? 'true' : 'false'}
      // Move the WHOLE block (bg + border + bar)
      style={{
        marginLeft: `calc(${indent} * 3em)`,
        width: `calc(100% - (${indent} * 3em))`,
      }}
      draggable={false}
    >
      {/* DRAG BAR (full-height, left edge) */}
      <div
        className="indent-bar"
        onMouseDown={startDrag}
        role="separator"
        aria-label="Drag to indent"
        title="Drag to indent (3em steps)"
      />

      {/* HEADER (click to toggle) */}
      <div
        className="collapse-header"
        onMouseDown={handleHeaderMouseDown}
      >
        {/* little caret – purely visual, header click toggles */}
        <span className="caret" aria-hidden="true">{collapsed ? '▶' : '▼'}</span>

        {/* editable title; clicking it DOES NOT toggle */}
        <input
          className="collapse-title"
          value={title}
          placeholder="Title"
          onChange={onTitleChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
            if (e.key === 'Escape') (e.currentTarget as HTMLInputElement).blur();
          }}
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>

      {/* BODY */}
      <div className="collapse-body" style={{ display: collapsed ? 'none' : undefined }}>
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
}

export const Collapsible = Node.create({
  name: 'collapsible',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      title: {
        default: 'Details',
        parseHTML: el => (el as HTMLElement).getAttribute('data-title') ?? 'Details',
        renderHTML: attrs => ({ 'data-title': attrs.title }),
      },
      indent: {
        default: 0,
        parseHTML: el => Number((el as HTMLElement).getAttribute('data-indent') ?? 0) || 0,
        renderHTML: attrs => ({ 'data-indent': attrs.indent }),
      },
      collapsed: {
        default: false,
        parseHTML: el => ((el as HTMLElement).getAttribute('data-collapsed') === 'true'),
        renderHTML: attrs => ({ 'data-collapsed': attrs.collapsed ? 'true' : 'false' }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-collapse]' }];
  },

  renderHTML({ HTMLAttributes }) {
    // Keeps attributes for copy/SSR; React NodeView does runtime UI
    return ['div', { ...HTMLAttributes, 'data-collapse': '' }, 0];
  },

  addCommands() {
    return {
      insertCollapse:
        (title = 'Details') =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: { title, indent: 0, collapsed: false },
              content: [{ type: 'paragraph' }],
            })
            .run(),
      // Optional programmatic toggle/indent if you want toolbar shortcuts too
      toggleCollapsed:
        () =>
        ({ editor }) => {
          const attrs = editor.getAttributes('collapsible');
          return editor.chain().updateAttributes('collapsible', { collapsed: !attrs.collapsed }).run();
        },
      incCollapseIndent:
        () =>
        ({ editor }) => {
          const { indent = 0 } = editor.getAttributes('collapsible') as any;
          return editor.chain().updateAttributes('collapsible', { indent: Math.min(indent + 1, MAX_INDENT_STEPS) }).run();
        },
      decCollapseIndent:
        () =>
        ({ editor }) => {
          const { indent = 0 } = editor.getAttributes('collapsible') as any;
          return editor.chain().updateAttributes('collapsible', { indent: Math.max(indent - 1, 0) }).run();
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CollapsibleView, { as: 'div' });
  },
});
