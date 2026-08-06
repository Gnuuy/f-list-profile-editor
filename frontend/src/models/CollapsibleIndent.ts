export const F_LIST_INDENT_EM = 3;
export const COLLAPSIBLE_MIN_WIDTH_EM = 16;

export function getCollapsibleIndentStep(fontSize: number): number {
  if (!Number.isFinite(fontSize) || fontSize <= 0) return 0;
  return fontSize * F_LIST_INDENT_EM;
}

export function getCollapsibleMinimumWidth(fontSize: number): number {
  if (!Number.isFinite(fontSize) || fontSize <= 0) return 0;
  return fontSize * COLLAPSIBLE_MIN_WIDTH_EM;
}

export function getCollapsibleIndentPadding(indent: number): string {
  const safeIndent = Number.isFinite(indent) ? Math.max(0, Math.floor(indent)) : 0;
  return `max(0px, min(calc(${safeIndent} * ${F_LIST_INDENT_EM}em), calc(100% - ${COLLAPSIBLE_MIN_WIDTH_EM}em)))`;
}

export function getMaxCollapsibleIndent(workspaceWidth: number, fontSize: number): number {
  const step = getCollapsibleIndentStep(fontSize);
  if (step === 0 || !Number.isFinite(workspaceWidth) || workspaceWidth <= 0) return 0;

  const minimumWidth = getCollapsibleMinimumWidth(fontSize);
  const availableIndentWidth = Math.max(0, workspaceWidth - minimumWidth);
  return Math.max(0, Math.floor(availableIndentWidth / step));
}

export function getCollapsibleIndentFromDrag(
  workspaceWidth: number,
  fontSize: number,
  startIndent: number,
  horizontalDistance: number,
): number {
  const step = getCollapsibleIndentStep(fontSize);
  const maxIndent = getMaxCollapsibleIndent(workspaceWidth, fontSize);
  if (step === 0) return 0;

  const requested = startIndent + Math.round(horizontalDistance / step);
  return Math.max(0, Math.min(maxIndent, requested));
}
