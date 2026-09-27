import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { GripVertical } from 'lucide-react';

import { useEditorEngine } from '../../context/EditorEngineContext';
import { useEditorUI } from '../../context/EditorUIContext';
import { findInnermostBlockAtY } from '../../models/BlockDrag';
import { beginBlockDrag } from './BlockDragController';

type BlockDragHandleProps = {
  /** The positioned element around the editor; the grip is placed inside it. */
  containerRef: RefObject<HTMLElement | null>;
};

type HandleTarget = {
  /** The document the position belongs to; a later edit makes it stale. */
  doc: ProseMirrorNode;
  position: number;
  /** The block's box relative to the container. */
  top: number;
  left: number;
  width: number;
  height: number;
};

const GRIP_WIDTH = 16;
const GRIP_GAP = 2;

/**
 * A grip beside the block under the pointer, including blocks inside open
 * dropdowns and quotes. Dragging it moves the block, clicking it selects it.
 */
export default function BlockDragHandle({ containerRef }: BlockDragHandleProps) {
  const { editor } = useEditorEngine();
  const { blockDragEnabled } = useEditorUI();
  const [target, setTarget] = useState<HandleTarget | null>(null);
  const [gripHovered, setGripHovered] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!editor || !container || !blockDragEnabled) return;
    const { view } = editor;
    let frame: number | null = null;
    let pointerY = 0;

    const boundsOf = (position: number) => {
      const dom = view.nodeDOM(position);
      if (!(dom instanceof HTMLElement)) return null;
      const rect = dom.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    };

    const update = () => {
      frame = null;
      if (!editor.isEditable) {
        setTarget(null);
        return;
      }
      const position = findInnermostBlockAtY(view.state.doc, boundsOf, pointerY);
      // Between blocks: keep the grip where it is so it's easy to reach.
      if (position === null) return;
      const block = view.nodeDOM(position);
      if (!(block instanceof HTMLElement)) return;
      const box = block.getBoundingClientRect();
      const origin = container.getBoundingClientRect();
      const next = {
        doc: view.state.doc,
        position,
        top: box.top - origin.top,
        left: box.left - origin.left,
        width: box.width,
        height: box.height,
      };
      setTarget(current => (
        current
        && current.doc === next.doc
        && current.position === next.position
        && current.top === next.top
        && current.left === next.left
        && current.height === next.height
          ? current
          : next
      ));
    };

    const onPointerMove = (event: MouseEvent) => {
      if (document.documentElement.classList.contains('is-dragging-block')) return;
      pointerY = event.clientY;
      frame ??= window.requestAnimationFrame(update);
    };
    const hide = () => setTarget(null);
    // Edits shift block positions, so hide until the pointer moves again.
    const onTransaction = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      if (transaction.docChanged || !editor.isEditable) hide();
    };

    container.addEventListener('mousemove', onPointerMove);
    container.addEventListener('mouseleave', hide);
    editor.on('transaction', onTransaction);
    return () => {
      container.removeEventListener('mousemove', onPointerMove);
      container.removeEventListener('mouseleave', hide);
      editor.off('transaction', onTransaction);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [blockDragEnabled, containerRef, editor]);

  if (!editor || !target || !blockDragEnabled || target.doc !== editor.state.doc) return null;

  return (
    <>
      {gripHovered && (
        <div
          className="block-drag-outline"
          aria-hidden="true"
          style={{ top: target.top, left: target.left, width: target.width, height: target.height }}
        />
      )}
      <button
        type="button"
        className="block-drag-handle"
        style={{ top: target.top, left: Math.max(0, target.left - GRIP_WIDTH - GRIP_GAP) }}
        title="Drag to move this block (hold Ctrl to copy). Click to select it."
        aria-label="Move or select this block"
        onMouseEnter={() => setGripHovered(true)}
        onMouseLeave={() => setGripHovered(false)}
        onMouseDown={event => {
          // Keeps the editor's text selection and focus while dragging.
          event.preventDefault();
          beginBlockDrag(editor, target.position, event, {
            onClick: () => editor.chain().focus().setNodeSelection(target.position).run(),
          });
        }}
      >
        <GripVertical aria-hidden="true" />
      </button>
    </>
  );
}
