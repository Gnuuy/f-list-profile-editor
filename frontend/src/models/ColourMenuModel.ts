export const COLOUR_MENU_COLUMNS = 3;

type AnchorRect = {
  top: number;
  bottom: number;
  left: number;
};

type Size = {
  width: number;
  height: number;
};

export type MenuPosition = {
  top: number;
  left: number;
};

const VIEWPORT_EDGE = 12;
const ANCHOR_GAP = 8;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function getColourMenuPosition(
  anchor: AnchorRect,
  menu: Size,
  viewport: Size,
): MenuPosition {
  const maximumLeft = Math.max(VIEWPORT_EDGE, viewport.width - menu.width - VIEWPORT_EDGE);
  const maximumTop = Math.max(VIEWPORT_EDGE, viewport.height - menu.height - VIEWPORT_EDGE);
  const below = anchor.bottom + ANCHOR_GAP;
  const above = anchor.top - menu.height - ANCHOR_GAP;
  const preferredTop = below + menu.height <= viewport.height - VIEWPORT_EDGE
    ? below
    : above;

  return {
    top: clamp(preferredTop, VIEWPORT_EDGE, maximumTop),
    left: clamp(anchor.left, VIEWPORT_EDGE, maximumLeft),
  };
}

export function getNextColourOptionIndex(
  currentIndex: number,
  key: string,
  optionCount: number,
  columns = COLOUR_MENU_COLUMNS,
): number | null {
  if (optionCount <= 0) return null;
  const current = currentIndex < 0 ? 0 : currentIndex;

  switch (key) {
    case 'ArrowRight': return (current + 1) % optionCount;
    case 'ArrowLeft': return (current - 1 + optionCount) % optionCount;
    case 'ArrowDown': return Math.min(current + columns, optionCount - 1);
    case 'ArrowUp': return Math.max(current - columns, 0);
    case 'Home': return 0;
    case 'End': return optionCount - 1;
    default: return null;
  }
}
