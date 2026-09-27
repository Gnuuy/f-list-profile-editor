const MINIMUM_VISIBLE_WORKSPACE = 30;

export function shouldFloatEditorToolbar(
  toolbarAnchorBottom: number,
  workspaceBottom: number,
): boolean {
  if (!Number.isFinite(toolbarAnchorBottom) || !Number.isFinite(workspaceBottom)) {
    return false;
  }

  return toolbarAnchorBottom <= 0 && workspaceBottom >= MINIMUM_VISIBLE_WORKSPACE;
}
