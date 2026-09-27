import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export type HorizontalRuleSpacing = 'spaced' | 'tight';

export const HORIZONTAL_RULE_SPACING_OPTIONS = [
  {
    id: 'spaced',
    label: 'Spaced',
    description: 'Insert [hr] followed by a line break.',
  },
  {
    id: 'tight',
    label: 'Tight',
    description: 'Insert [hr] touching the following content.',
  },
] as const satisfies ReadonlyArray<{
  id: HorizontalRuleSpacing;
  label: string;
  description: string;
}>;

function horizontalRuleBefore(
  document: ProseMirrorNode,
  selectionPosition: number,
): { node: ProseMirrorNode; position: number } | null {
  let match: { node: ProseMirrorNode; position: number } | null = null;

  document.descendants((node, position) => {
    if (position >= selectionPosition) return false;
    if (node.type.name === 'horizontalRule') {
      match = { node, position };
    }
    return true;
  });

  return match;
}

function horizontalRuleCount(document: ProseMirrorNode): number {
  let count = 0;
  document.descendants(node => {
    if (node.type.name === 'horizontalRule') count += 1;
    return true;
  });
  return count;
}

/**
 * TipTap's horizontal-rule command owns the paragraph splitting and caret
 * placement. Add the F-list boundary attribute to the rule it just inserted
 * in the same transaction so insertion remains a single undoable action.
 */
export function insertFListHorizontalRule(
  editor: Editor,
  spacing: HorizontalRuleSpacing,
): boolean {
  const ruleCountBeforeInsertion = horizontalRuleCount(editor.state.doc);
  editor.commands.focus();
  return editor
    .chain()
    .setHorizontalRule()
    .command(({ tr, dispatch }) => {
      if (horizontalRuleCount(tr.doc) !== ruleCountBeforeInsertion + 1) return false;
      const insertedRule = horizontalRuleBefore(tr.doc, tr.selection.from);
      if (!insertedRule) return false;

      if (dispatch) {
        tr.setNodeMarkup(insertedRule.position, undefined, {
          ...insertedRule.node.attrs,
          fListBreakAfter: spacing === 'spaced',
        });
      }
      return true;
    })
    .run();
}
