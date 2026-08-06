// extensions/collapsible.tsx
import { Node } from '@tiptap/core';
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewContent,
} from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import React, { useCallback, useRef, useSyncExternalStore } from 'react';

import {
  getCollapsibleIndentFromDrag,
  getCollapsibleIndentPadding,
  getMaxCollapsibleIndent,
} from '../../../models/CollapsibleIndent';
import {
  canJoinNextCollapse,
  exitClosestCollapse,
  insertAfterClosestCollapse,
  unwrapCollapseAt,
} from '../../../models/CollapsibleDocument';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    collapsible: {
      insertCollapse: (title?: string) => ReturnType;
      toggleCollapsed: () => ReturnType;
      incCollapseIndent: () => ReturnType;
      decCollapseIndent: () => ReturnType;
      exitCollapse: () => ReturnType;
    };
  }
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function CollapsibleView(props: NodeViewProps) {
  const { node, editor, getPos, updateAttributes, selected } = props;
  const {
    title = 'Details',
    indent = 0,
    collapsed = false,
    joinNext = false,
  } = node.attrs as {
    title: string;
    indent: number;
    collapsed: boolean;
    joinNext: boolean;
  };

  const rootRef = useRef<HTMLDivElement | null>(null);
  const subscribeToTransactions = useCallback((onStoreChange: () => void) => {
    const handleTransaction = () => onStoreChange();
    editor.on('transaction', handleTransaction);
    return () => editor.off('transaction', handleTransaction);
  }, [editor]);
  const readCanJoinNext = useCallback(() => {
    const currentPosition = getPos();
    return typeof currentPosition === 'number'
      && canJoinNextCollapse(editor.state.doc, currentPosition);
  }, [editor, getPos]);
  const canJoinNext = useSyncExternalStore(
    subscribeToTransactions,
    readCanJoinNext,
    () => false,
  );

  // --- toggle by clicking the HEADER (not the drag bar, not the title input) ---
  const handleHeaderMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Don’t toggle if you started on an interactive header control.
    const target = e.target as HTMLElement;
    if (target.closest('input.collapse-title, button.collapse-action')) return;

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
    updateAttributes({ title: e.target.value });
  }, [updateAttributes]);

  const toggleJoinNext = useCallback(() => {
    const currentPosition = getPos();
    if (typeof currentPosition !== 'number') return;

    if (joinNext || canJoinNextCollapse(editor.state.doc, currentPosition)) {
      updateAttributes({ joinNext: !joinNext });
    }
  }, [editor, getPos, joinNext, updateAttributes]);

  const removeCollapse = useCallback(() => {
    const currentPosition = getPos();
    if (typeof currentPosition !== 'number') return;

    const transaction = unwrapCollapseAt(editor.state, currentPosition);
    if (!transaction) return;

    editor.view.dispatch(transaction);
    editor.commands.focus();
  }, [editor, getPos]);

  // --- LEFT draggable bar for indent (moves whole block) ---
  const startDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    editor.view.focus();

    const el = rootRef.current!;
    const workspace = el.closest<HTMLElement>('.ProseMirror') ?? el.parentElement ?? el;
    const workspaceWidth = workspace.getBoundingClientRect().width;
    const fontSize = parseFloat(getComputedStyle(workspace).fontSize) || 16;
    const startX = e.clientX;
    const startIndent = indent;
    const pointerId = e.pointerId;
    const handle = e.currentTarget;
    let lastIndent = startIndent;

    handle.setPointerCapture(pointerId);

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const next = getCollapsibleIndentFromDrag(
        workspaceWidth,
        fontSize,
        startIndent,
        ev.clientX - startX,
      );
      if (next !== lastIndent) {
        lastIndent = next;
        updateAttributes({ indent: next });
      }
    };
    const onEnd = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onEnd, true);
      window.removeEventListener('pointercancel', onEnd, true);
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
    };
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onEnd, true);
    window.addEventListener('pointercancel', onEnd, true);
  }, [indent, updateAttributes, editor.view]);

  const changeIndentByKeyboard = useCallback((amount: -1 | 1) => {
    const el = rootRef.current;
    if (!el) return;
    const workspace = el.closest<HTMLElement>('.ProseMirror') ?? el.parentElement ?? el;
    const fontSize = parseFloat(getComputedStyle(workspace).fontSize) || 16;
    const maximum = getMaxCollapsibleIndent(workspace.getBoundingClientRect().width, fontSize);
    updateAttributes({ indent: clamp(indent + amount, 0, maximum) });
  }, [indent, updateAttributes]);

  return (
    <NodeViewWrapper
      as="div"
      ref={rootRef}
      className={`collapse-indent-wrapper${joinNext ? ' is-joined-next' : ''}${canJoinNext && !joinNext ? ' has-separated-next' : ''}`}
      data-indent={indent}
      data-collapsed={collapsed ? 'true' : 'false'}
      data-join-next={joinNext ? 'true' : 'false'}
      style={{ paddingLeft: getCollapsibleIndentPadding(indent) }}
      draggable={false}
    >
      <div className={`collapse indentable${selected ? ' is-selected' : ''}${collapsed ? ' is-collapsed' : ''}`}>
        {/* DRAG BAR (full-height, left edge) */}
        <div
          className="indent-bar"
          onPointerDown={startDrag}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              changeIndentByKeyboard(-1);
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              changeIndentByKeyboard(1);
            }
          }}
          tabIndex={0}
          role="separator"
          aria-label="Drag to indent"
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuenow={indent}
          title="Drag to indent (F-list 3em steps)"
        />

        {/* HEADER (click to toggle) */}
        <div
          className={`CollapseHeader collapse-header${collapsed ? '' : ' ExpandedHeader'}`}
          onMouseDown={handleHeaderMouseDown}
          aria-expanded={!collapsed}
        >
          <span className="caret" aria-hidden="true">{collapsed ? '▶' : '▼'}</span>
          <div className="CollapseHeaderText collapse-header-text">
            <input
              className="collapse-title"
              value={title}
              placeholder="Details"
              onChange={onTitleChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
                if (e.key === 'Escape') (e.currentTarget as HTMLInputElement).blur();
              }}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="collapse-actions" contentEditable={false}>
            <button
              type="button"
              className={`collapse-action collapse-join-action${joinNext ? ' is-active' : ''}`}
              aria-label={joinNext ? 'Unjoin from next dropdown' : 'Join with next dropdown below'}
              aria-pressed={joinNext}
              title={joinNext
                ? 'Unjoin from next dropdown'
                : 'Join with the next adjacent dropdown below'}
              disabled={!joinNext && !canJoinNext}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={toggleJoinNext}
            >
              {joinNext ? 'Unjoin ↓' : 'Join next ↓'}
            </button>
            <button
              type="button"
              className="collapse-action collapse-remove-action"
              aria-label="Remove dropdown and keep its content"
              title="Remove dropdown and keep its content"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={removeCollapse}
            >
              Remove
            </button>
          </div>
        </div>

        {/* BODY: kept mounted so CSS can animate its intrinsic height. */}
        <div
          className="collapse-body-transition"
          aria-hidden={collapsed}
        >
          <div className="collapse-body-clip">
            <div className="CollapseBlock collapse-body">
              <NodeViewContent />
            </div>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const Collapsible = Node.create({
  name: 'collapsible',
  // Run Mod-Enter before the default HardBreak shortcut. Returning false when
  // outside a dropdown lets Tiptap fall through to its normal behavior.
  priority: 1000,
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
      joinNext: {
        default: false,
        parseHTML: el => ((el as HTMLElement).getAttribute('data-join-next') === 'true'),
        renderHTML: attrs => ({ 'data-join-next': attrs.joinNext ? 'true' : 'false' }),
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
        ({ state, dispatch, commands }) => {
          const attributes = {
            title,
            indent: 0,
            collapsed: false,
            joinNext: false,
          };
          const collapse = this.type.create(attributes, state.schema.nodes.paragraph.create());
          const transaction = insertAfterClosestCollapse(state, collapse);

          if (transaction) {
            if (dispatch) dispatch(transaction);
            return true;
          }

          return commands.insertContent({
            type: this.name,
            attrs: attributes,
            content: [{ type: 'paragraph' }],
          });
        },
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
          const { indent = 0 } = editor.getAttributes('collapsible') as { indent?: number };
          const workspace = editor.view.dom;
          const fontSize = parseFloat(getComputedStyle(workspace).fontSize) || 16;
          const maximum = getMaxCollapsibleIndent(workspace.getBoundingClientRect().width, fontSize);
          return editor.chain().updateAttributes('collapsible', { indent: Math.min(indent + 1, maximum) }).run();
        },
      decCollapseIndent:
        () =>
        ({ editor }) => {
          const { indent = 0 } = editor.getAttributes('collapsible') as { indent?: number };
          return editor.chain().updateAttributes('collapsible', { indent: Math.max(indent - 1, 0) }).run();
        },
      exitCollapse:
        () =>
        ({ state, dispatch }) => {
          const transaction = exitClosestCollapse(state);
          if (!transaction) return false;
          if (dispatch) dispatch(transaction);
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.exitCollapse(),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CollapsibleView, { as: 'div' });
  },
});
