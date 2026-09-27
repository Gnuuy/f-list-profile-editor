import type { Editor } from '@tiptap/core';
import type { Mark, Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';

export type FListLinkDraft = {
  from: number;
  to: number;
  label: string;
  href: string;
  hasLink: boolean;
};

export type FListLinkResult = {
  ok: boolean;
  error?: string;
};

function cleanHref(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed.at(-1);
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

/** Convert a user-entered address to the subset F-list profiles can safely use. */
export function normalizeFListLinkHref(value: string): string | null {
  const href = cleanHref(value);
  if (/^(?:https?:\/\/|mailto:)[^\s]+$/i.test(href)) return href;

  // A bare public hostname is treated as HTTPS for a friendlier insert flow.
  if (/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#][^\s]*)?$/i.test(href)) {
    return `https://${href}`;
  }
  return null;
}

function linkInMarks(marks: readonly Mark[] | null | undefined): Mark | null {
  return marks?.find(mark => mark.type.name === 'link') ?? null;
}

function sameHref(mark: Mark | null, href: string): boolean {
  return Boolean(mark && String(mark.attrs.href ?? '') === href);
}

function linkedTextRange(editor: Editor, href: string): { from: number; to: number } | null {
  const { $from } = editor.state.selection;
  const parentStart = $from.start();
  const caret = $from.pos;
  const ranges: Array<{ from: number; to: number }> = [];
  let active: { from: number; to: number } | null = null;

  $from.parent.forEach((node, offset) => {
    const from = parentStart + offset;
    const to = from + node.nodeSize;
    const linked = node.isText && sameHref(linkInMarks(node.marks), href);

    if (linked && active?.to === from) active.to = to;
    else if (linked) {
      active = { from, to };
      ranges.push(active);
    } else active = null;
  });

  return ranges.find(range => range.from <= caret && caret <= range.to) ?? null;
}

function firstLinkInRange(doc: ProseMirrorNode, from: number, to: number): Mark | null {
  let found: Mark | null = null;
  doc.nodesBetween(from, to, node => {
    if (found || !node.isText) return;
    found = linkInMarks(node.marks);
  });
  return found;
}

/** Snapshot the editor selection so a pop-up can safely receive focus. */
export function getFListLinkDraft(editor: Editor): FListLinkDraft {
  const { state } = editor;
  const { selection } = state;

  if (!selection.empty) {
    const link = firstLinkInRange(state.doc, selection.from, selection.to);
    return {
      from: selection.from,
      to: selection.to,
      label: state.doc.textBetween(selection.from, selection.to, '\n'),
      href: String(link?.attrs.href ?? ''),
      hasLink: Boolean(link),
    };
  }

  const direct = linkInMarks(state.storedMarks ?? selection.$from.marks());
  const after = linkInMarks(selection.$from.nodeAfter?.marks);
  const before = linkInMarks(selection.$from.nodeBefore?.marks);
  const link = direct ?? after ?? before;
  const href = String(link?.attrs.href ?? '');
  const range = href ? linkedTextRange(editor, href) : null;

  if (range) {
    return {
      ...range,
      label: state.doc.textBetween(range.from, range.to, '\n'),
      href,
      hasLink: true,
    };
  }

  return {
    from: selection.from,
    to: selection.to,
    label: '',
    href: '',
    hasLink: false,
  };
}

function allowedBaseMarks(editor: Editor, draft: FListLinkDraft): Mark[] {
  const { state } = editor;
  const $position = state.doc.resolve(draft.from);
  const marks = state.storedMarks ?? $position.marks();
  return marks.filter(mark => !['link', 'subscript', 'superscript'].includes(mark.type.name));
}

/** Insert or update a [url] while preserving all compatible inline formatting. */
export function applyFListLink(
  editor: Editor,
  draft: FListLinkDraft,
  hrefInput: string,
  labelInput: string,
): FListLinkResult {
  const href = normalizeFListLinkHref(hrefInput);
  if (!href) return { ok: false, error: 'Enter an http, https, or mailto link.' };

  const label = labelInput;
  if (!label.trim()) return { ok: false, error: 'Enter the text that should be linked.' };

  const from = Math.max(0, Math.min(draft.from, editor.state.doc.content.size));
  const to = Math.max(from, Math.min(draft.to, editor.state.doc.content.size));

  if (from !== to && label === draft.label) {
    const chain = editor.chain().focus().setTextSelection({ from, to });
    chain.unsetSubscript().unsetSuperscript().unsetLink().setLink({ href }).run();
    return { ok: true };
  }

  const { state } = editor;
  const linkType = state.schema.marks.link;
  if (!linkType) return { ok: false, error: 'Links are not available in this editor.' };

  const baseMarks = allowedBaseMarks(editor, { ...draft, from, to });
  const linkedText = state.schema.text(label, [...baseMarks, linkType.create({ href })]);
  const tr = state.tr.replaceWith(from, to, linkedText);
  const end = from + linkedText.nodeSize;
  tr.setSelection(TextSelection.near(tr.doc.resolve(end)));
  tr.setStoredMarks(baseMarks);
  editor.view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
  return { ok: true };
}

export function removeFListLink(editor: Editor, draft: FListLinkDraft): boolean {
  const linkType = editor.state.schema.marks.link;
  if (!linkType) return false;

  const from = Math.max(0, Math.min(draft.from, editor.state.doc.content.size));
  const to = Math.max(from, Math.min(draft.to, editor.state.doc.content.size));
  const tr = editor.state.tr;

  if (from !== to) tr.removeMark(from, to, linkType);
  const currentMarks = editor.state.storedMarks ?? editor.state.doc.resolve(from).marks();
  tr.setStoredMarks(currentMarks.filter(mark => mark.type !== linkType));
  editor.view.dispatch(tr);
  editor.commands.focus();
  return true;
}
