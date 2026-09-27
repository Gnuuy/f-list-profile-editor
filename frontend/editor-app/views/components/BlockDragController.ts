import type { Editor } from '@tiptap/react';

import { blockDropPosition, moveBlock } from '../../models/BlockDrag';

/** How far the pointer must move before a press becomes a drag. */
const DRAG_THRESHOLD = 4;
/** Distance from the window edge where dragging scrolls the page. */
const SCROLL_EDGE = 60;
const MAX_SCROLL_STEP = 18;

type PointerStart = {
  clientX: number;
  clientY: number;
  button: number;
};

type BeginOptions = {
  /** Runs instead of a drag when the press is released without moving. */
  onClick?: () => void;
  /** False when dragging is switched off: only clicks are handled. */
  dragEnabled?: boolean;
};

/**
 * Starts tracking a press on a block's grip or header. A small movement turns
 * it into a drag: a line shows where the block will land, the page scrolls
 * near the window edges, and releasing moves the block there (Ctrl or Alt
 * copies it). Escape cancels.
 */
export function beginBlockDrag(
  editor: Editor,
  from: number,
  start: PointerStart,
  { onClick, dragEnabled = true }: BeginOptions = {},
) {
  if (start.button !== 0) return;

  let dragging = false;
  let moved = false;
  let insert: number | null = null;
  let pointer = { x: start.clientX, y: start.clientY };
  let scrollFrame: number | null = null;
  let indicator: HTMLDivElement | null = null;
  let source: HTMLElement | null = null;

  const { view } = editor;

  const updateTarget = () => {
    const hit = view.posAtCoords({ left: pointer.x, top: pointer.y });
    insert = hit ? blockDropPosition(view.state.doc, from, hit.pos) : null;
    const line = insert === null ? null : dropLine(editor, insert);
    if (!indicator) return;
    if (!line) {
      indicator.hidden = true;
      return;
    }
    indicator.hidden = false;
    indicator.style.top = `${line.top - 1}px`;
    indicator.style.left = `${line.left}px`;
    indicator.style.width = `${line.width}px`;
  };

  const autoScroll = () => {
    scrollFrame = null;
    if (!dragging) return;
    let step = 0;
    if (pointer.y < SCROLL_EDGE) {
      step = -Math.ceil(((SCROLL_EDGE - pointer.y) / SCROLL_EDGE) * MAX_SCROLL_STEP);
    } else if (pointer.y > window.innerHeight - SCROLL_EDGE) {
      step = Math.ceil(((pointer.y - (window.innerHeight - SCROLL_EDGE)) / SCROLL_EDGE) * MAX_SCROLL_STEP);
    }
    if (step !== 0) {
      window.scrollBy(0, step);
      updateTarget();
    }
    scrollFrame = window.requestAnimationFrame(autoScroll);
  };

  const startDragging = () => {
    dragging = true;
    indicator = document.createElement('div');
    indicator.className = 'block-drop-indicator';
    indicator.hidden = true;
    document.body.append(indicator);
    const dom = view.nodeDOM(from);
    source = dom instanceof HTMLElement ? dom : null;
    source?.classList.add('is-drag-source');
    document.documentElement.classList.add('is-dragging-block');
    scrollFrame = window.requestAnimationFrame(autoScroll);
  };

  const finish = () => {
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerup', onUp, true);
    window.removeEventListener('keydown', onKeyDown, true);
    if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
    indicator?.remove();
    source?.classList.remove('is-drag-source');
    document.documentElement.classList.remove('is-dragging-block');
  };

  function onMove(event: PointerEvent) {
    pointer = { x: event.clientX, y: event.clientY };
    if (!dragging) {
      const distance = Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY);
      if (distance < DRAG_THRESHOLD) return;
      moved = true;
      if (!dragEnabled || !editor.isEditable) return;
      startDragging();
    }
    event.preventDefault();
    updateTarget();
  }

  function onUp(event: PointerEvent) {
    const wasDragging = dragging;
    finish();
    if (!wasDragging) {
      if (!moved) onClick?.();
      return;
    }
    if (insert === null || editor.isDestroyed) return;
    const tr = moveBlock(view.state, from, insert, event.ctrlKey || event.altKey);
    if (tr) view.dispatch(tr);
    view.focus();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !dragging) return;
    event.preventDefault();
    event.stopPropagation();
    finish();
  }

  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('keydown', onKeyDown, true);
}

/** Viewport position of the line showing where a block will be inserted. */
function dropLine(editor: Editor, insert: number) {
  const { view } = editor;
  const $insert = view.state.doc.resolve(insert);
  const after = $insert.nodeAfter;
  const before = $insert.nodeBefore;
  const neighbour = after
    ? view.nodeDOM(insert)
    : before ? view.nodeDOM(insert - before.nodeSize) : null;
  if (neighbour instanceof HTMLElement) {
    const rect = neighbour.getBoundingClientRect();
    return { top: after ? rect.top : rect.bottom, left: rect.left, width: rect.width };
  }
  const coords = view.coordsAtPos(insert);
  const container = view.dom.getBoundingClientRect();
  return { top: coords.top, left: coords.left, width: Math.max(40, container.right - coords.left) };
}
