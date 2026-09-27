// extensions/indentable-blockquote.tsx
import Blockquote from '@tiptap/extension-blockquote';
import { ReactNodeViewRenderer, NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import React, { useRef, useCallback } from 'react';
import {
  insertLineBeside,
  isAtBlockquoteOuterBoundary,
  unwrapBlockquoteAt,
} from '../../../models/StructuredBlockDocument';
import { useEditorUI } from '../../../context/EditorUIContext';
import StructuralBlockActionMenu from '../StructuralBlockActionMenu';
import { beginBlockDrag } from '../BlockDragController';

// clamp helper
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// A small safety cap so you can't indent forever. Adjust as you like.
const MAX_INDENT_STEPS = 30; // ~36em max extra padding

function IndentableBlockquoteView(props: NodeViewProps) {
  const { node, updateAttributes, editor, selected, getPos } = props;
  const indent: number = node.attrs.indent ?? 0;
  const fListBreakAfter = node.attrs.fListBreakAfter;
  const color: string | null = node.attrs.color ?? null;
  const rootRef = useRef<HTMLQuoteElement | null>(null);
  const { blockDragEnabled } = useEditorUI();

  const addLine = useCallback((side: 'above' | 'below') => {
    const currentPosition = getPos();
    if (typeof currentPosition !== 'number') return;
    const transaction = insertLineBeside(editor.state, currentPosition, side);
    if (!transaction) return;
    editor.view.dispatch(transaction);
    editor.commands.focus();
  }, [editor, getPos]);

  const removeQuote = useCallback(() => {
    const currentPosition = getPos();
    if (typeof currentPosition !== 'number') return;
    const transaction = unwrapBlockquoteAt(editor.state, currentPosition);
    if (!transaction) return;
    editor.view.dispatch(transaction);
    editor.commands.focus();
  }, [editor, getPos]);

  const startMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!blockDragEnabled || target.closest('[data-structural-block-actions]')) return;
    const currentPosition = getPos();
    if (typeof currentPosition !== 'number') return;
    e.preventDefault();
    e.stopPropagation();
    beginBlockDrag(editor, currentPosition, e);
  }, [blockDragEnabled, editor, getPos]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // keep focus in the editor so selection stays stable
    editor.view.focus();

    const el = rootRef.current!;
    const rect = el.getBoundingClientRect();

    const startX = e.clientX;
    const startIndent = indent;

    // Optional dynamic cap so you can't indent past container width too much
    const parentWidth = el.parentElement?.getBoundingClientRect().width ?? rect.width;
    const fontSize = parseFloat(getComputedStyle(el).fontSize) || 16;
    const stepPx = 3 * fontSize;
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
      ref={rootRef}
      className={`blockquote indentable${selected ? ' is-selected' : ''}`}
      data-indent={indent}
      data-f-list-break-after={typeof fListBreakAfter === 'boolean'
        ? String(fListBreakAfter)
        : undefined}
      data-color={color ?? undefined}
      // expose CSS var too, if you prefer using --indent:
      style={{
        '--indent': String(indent),
        ...(color ? { '--quote-colour': color } : {}),
      } as React.CSSProperties}
      // prevent the whole node from being dragged by the browser
      draggable={false}
    >
      {/* left handle */}
      <div
        className="indent-handle"
        onMouseDown={startDrag}
        role="separator"
        aria-label="Drag to change indent"
        title="Drag to change indent (F-list 3em steps)"
      />
      <div
        className="QuoteHeader"
        contentEditable={false}
        onMouseDown={startMove}
        title={blockDragEnabled ? 'Drag to move the quote' : undefined}
      >
        <span>Quote:</span>
        <StructuralBlockActionMenu
          label="Quote actions"
          actions={[
            {
              id: 'line-above',
              label: 'Add line above',
              title: 'Insert an empty line above this quote',
              onSelect: () => addLine('above'),
            },
            {
              id: 'line-below',
              label: 'Add line below',
              title: 'Insert an empty line below this quote',
              onSelect: () => addLine('below'),
            },
            {
              id: 'remove',
              label: 'Remove wrapper',
              title: 'Remove quote and keep its content',
              tone: 'danger',
              onSelect: removeQuote,
            },
          ]}
        />
      </div>
      {/* the actual editable content of the quote */}
      <NodeViewContent className="content" />
    </NodeViewWrapper>
  );
}

export const IndentableBlockquote = Blockquote.extend({
  priority: 1000,
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
      // The [color] around the whole quote. Each theme decides whether it shows.
      color: {
        default: null,
        parseHTML: el => (el as HTMLElement).getAttribute('data-color'),
        renderHTML: attrs => attrs.color ? { 'data-color': attrs.color } : {},
      },
    };
  },

  addNodeView() {
    // NodeViewWrapper already renders the semantic blockquote. Supplying `as`
    // here as well creates a second browser-default blockquote around it.
    return ReactNodeViewRenderer(IndentableBlockquoteView);
  },

  addKeyboardShortcuts() {
    return {
      // Keep normal Enter inside the quote, including on an empty final line.
      // Ctrl/Cmd+Enter is handled by the higher-priority structural hotkey.
      Enter: () => {
        if (!this.editor.isActive('blockquote')) return false;
        return this.editor.commands.splitBlock({ keepMarks: true });
      },
      // Boundary deletion must never silently unwrap the quote. The explicit
      // Remove action is the only operation that removes its container. Do not
      // consume Backspace/Delete at internal paragraph boundaries: those keys
      // must still be able to remove line breaks and join quote paragraphs.
      Backspace: () => isAtBlockquoteOuterBoundary(this.editor.state, 'backward'),
      Delete: () => isAtBlockquoteOuterBoundary(this.editor.state, 'forward'),
    };
  },
});
