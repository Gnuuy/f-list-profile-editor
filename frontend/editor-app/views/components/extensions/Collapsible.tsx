// extensions/collapsible.tsx
import { Node } from '@tiptap/core';
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewContent,
} from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import React, { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { NodeSelection } from '@tiptap/pm/state';

import {
  getCollapsibleIndentFromDrag,
  getCollapsibleIndentPadding,
  getMaxCollapsibleIndent,
} from '../../../models/CollapsibleIndent';
import {
  canJoinNextCollapse,
  insertInsideClosestCollapse,
  unwrapCollapseAt,
} from '../../../models/CollapsibleDocument';
import {
  inheritedCollapsibleFormatting,
  targetNodeOfType,
  updateTargetNodeAttributes,
} from '../../../models/CollapsibleFormatting';
import {
  closedDropdownCaretGuard,
  exitClosestStructuralBlock,
  insertLineBeside,
} from '../../../models/StructuredBlockDocument';
import { useEditorUI } from '../../../context/EditorUIContext';
import StructuralBlockActionMenu from '../StructuralBlockActionMenu';
import { beginBlockDrag } from '../BlockDragController';

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
  const { openColourAtRect, blockDragEnabled } = useEditorUI();
  const {
    title = 'Details',
    indent = 0,
    collapsed = false,
    joinNext = false,
    textAlign = null,
    color = null,
  } = node.attrs as {
    title: string;
    indent: number;
    collapsed: boolean;
    joinNext: boolean;
    textAlign: 'left' | 'center' | 'right' | 'justify' | null;
    color: string | null;
  };

  const rootRef = useRef<HTMLDivElement | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
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

  // --- click the HEADER to toggle, drag it to move the dropdown ---
  const handleHeaderMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Don’t toggle if you started on an interactive header control.
    const target = e.target as HTMLElement;
    if (target.closest('input.collapse-title, [data-structural-block-actions]')) return;

    e.preventDefault(); e.stopPropagation();
    editor.view.focus();

    const currentPosition = getPos();
    const toggle = () => updateAttributes({ collapsed: !collapsed });
    if (typeof currentPosition !== 'number') return;
    beginBlockDrag(editor, currentPosition, e, { onClick: toggle, dragEnabled: blockDragEnabled });
  }, [blockDragEnabled, collapsed, editor, getPos, updateAttributes]);

  const addLine = useCallback((side: 'above' | 'below') => {
    const currentPosition = getPos();
    if (typeof currentPosition !== 'number') return;
    const transaction = insertLineBeside(editor.state, currentPosition, side);
    if (!transaction) return;
    editor.view.dispatch(transaction);
    editor.commands.focus();
  }, [editor, getPos]);

  // --- editable title in header ---
  const onTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateAttributes({ title: e.target.value });
  }, [updateAttributes]);

  const selectDropdown = useCallback(() => {
    const currentPosition = getPos();
    if (typeof currentPosition !== 'number') return;
    editor.view.dispatch(editor.state.tr.setSelection(
      NodeSelection.create(editor.state.doc, currentPosition),
    ));
  }, [editor, getPos]);

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
      data-f-list-break-after={typeof node.attrs.fListBreakAfter === 'boolean'
        ? String(node.attrs.fListBreakAfter)
        : undefined}
      style={{ paddingLeft: getCollapsibleIndentPadding(indent) }}
      draggable={false}
    >
      <div
        className={`collapse indentable${selected ? ' is-selected' : ''}${collapsed ? ' is-collapsed' : ''}${color ? ' has-custom-colour' : ''}${actionsOpen ? ' has-actions-open' : ''}`}
        style={{
          color: color ?? undefined,
          textAlign: textAlign ?? undefined,
        }}
      >
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
          title={blockDragEnabled
            ? 'Click to open or close. Drag to move the dropdown.'
            : 'Click to open or close.'}
          aria-expanded={!collapsed}
          style={{ color: color ?? undefined, textAlign: textAlign ?? undefined }}
        >
          <span className="caret" aria-hidden="true">{collapsed ? '▶' : '▼'}</span>
          <div className="CollapseHeaderText collapse-header-text">
            <input
              className="collapse-title"
              value={title}
              placeholder="Details"
              onChange={onTitleChange}
              onFocus={selectDropdown}
              onKeyDown={(e) => {
                if (
                  (e.ctrlKey || e.metaKey)
                  && !e.altKey
                  && !e.shiftKey
                  && e.key.toLowerCase() === 'd'
                ) {
                  e.preventDefault();
                  e.stopPropagation();
                  selectDropdown();
                  openColourAtRect(e.currentTarget.getBoundingClientRect());
                  return;
                }
                if (e.key === 'Enter') e.preventDefault();
                if (e.key === 'Escape') (e.currentTarget as HTMLInputElement).blur();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ color: color ?? undefined, textAlign: textAlign ?? undefined }}
            />
          </div>
          <StructuralBlockActionMenu
            label="Dropdown actions"
            onOpenChange={setActionsOpen}
            actions={[
              {
                id: 'line-above',
                label: 'Add line above',
                title: 'Insert an empty line above this dropdown',
                onSelect: () => addLine('above'),
              },
              {
                id: 'line-below',
                label: 'Add line below',
                title: 'Insert an empty line below this dropdown',
                onSelect: () => addLine('below'),
              },
              {
                id: 'join-next',
                label: joinNext ? 'Unjoin from next' : 'Join with next',
                title: joinNext
                  ? 'Unjoin from the next dropdown'
                  : 'Join with the next adjacent dropdown below',
                active: joinNext,
                disabled: !joinNext && !canJoinNext,
                onSelect: toggleJoinNext,
              },
              {
                id: 'remove',
                label: 'Remove wrapper',
                title: 'Remove dropdown and keep its content',
                tone: 'danger',
                onSelect: removeCollapse,
              },
            ]}
          />
        </div>

        {/* BODY: kept mounted so CSS can animate its intrinsic height. */}
        <div
          className="collapse-body-transition"
          aria-hidden={collapsed}
        >
          <div className="collapse-body-clip">
            <div className="CollapseBlock collapse-body">
              <NodeViewContent className="collapse-body-content" />
            </div>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const Collapsible = Node.create({
  name: 'collapsible',
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
      textAlign: {
        default: null,
        parseHTML: el => (el as HTMLElement).getAttribute('data-text-align'),
        renderHTML: attrs => attrs.textAlign ? { 'data-text-align': attrs.textAlign } : {},
      },
      color: {
        default: null,
        parseHTML: el => (el as HTMLElement).getAttribute('data-color'),
        renderHTML: attrs => attrs.color ? { 'data-color': attrs.color } : {},
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
          const inherited = inheritedCollapsibleFormatting(state);
          const attributes = {
            title,
            indent: 0,
            collapsed: false,
            joinNext: false,
            textAlign: inherited.textAlign,
            color: inherited.color,
          };
          const collapse = this.type.create(attributes, state.schema.nodes.paragraph.create());
          const transaction = insertInsideClosestCollapse(state, collapse);

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
      // Each of these changes only the selected or innermost dropdown.
      toggleCollapsed:
        () =>
        ({ tr }) => {
          const target = targetNodeOfType(tr.selection, this.name);
          return !!target && updateTargetNodeAttributes(tr, this.name, { collapsed: !target.node.attrs.collapsed });
        },
      incCollapseIndent:
        () =>
        ({ tr, editor }) => {
          const target = targetNodeOfType(tr.selection, this.name);
          if (!target) return false;
          const workspace = editor.view.dom;
          const fontSize = parseFloat(getComputedStyle(workspace).fontSize) || 16;
          const maximum = getMaxCollapsibleIndent(workspace.getBoundingClientRect().width, fontSize);
          const indent = Math.min((Number(target.node.attrs.indent) || 0) + 1, maximum);
          return updateTargetNodeAttributes(tr, this.name, { indent });
        },
      decCollapseIndent:
        () =>
        ({ tr }) => {
          const target = targetNodeOfType(tr.selection, this.name);
          if (!target) return false;
          const indent = Math.max((Number(target.node.attrs.indent) || 0) - 1, 0);
          return updateTargetNodeAttributes(tr, this.name, { indent });
        },
      exitCollapse:
        () =>
        ({ state, dispatch }) => {
          const transaction = exitClosestStructuralBlock(state);
          if (!transaction) return false;
          if (dispatch) dispatch(transaction);
          return true;
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CollapsibleView, { as: 'div' });
  },

  addProseMirrorPlugins() {
    return [closedDropdownCaretGuard()];
  },
});
