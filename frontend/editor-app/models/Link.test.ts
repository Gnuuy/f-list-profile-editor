import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { toBBCode } from '../utilities/BBCodeParser';
import { createEditorExtensions } from './EditorExtensions';
import {
  applyFListLink,
  getFListLinkDraft,
  normalizeFListLinkHref,
  removeFListLink,
} from './Link';
import { getFListLinkHost } from './FListLinkExtension';
import { toggleFListTextScript } from './TextScript';
import { toggleFListTextSize } from './TextSize';

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function createTextEditor(text = 'F-list'): Editor {
  editor = new Editor({
    extensions: createEditorExtensions(),
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] },
  });
  editor.commands.setTextSelection({ from: 1, to: text.length + 1 });
  return editor;
}

describe('F-list links', () => {
  it('accepts safe links and upgrades bare hostnames to HTTPS', () => {
    expect(normalizeFListLinkHref('f-list.net/c/fklr-r03')).toBe('https://f-list.net/c/fklr-r03');
    expect(normalizeFListLinkHref('mailto:test@example.com')).toBe('mailto:test@example.com');
    expect(normalizeFListLinkHref('javascript:alert(1)')).toBeNull();
    expect(getFListLinkHost('https://static.f-list.net/images/example.gif')).toBe('static.f-list.net');
    expect(getFListLinkHost('mailto:test@example.com')).toBeNull();
  });

  it('renders F-list link chrome without changing the label or exported BBCode', () => {
    const current = createTextEditor('Horizon Portrait');
    const draft = getFListLinkDraft(current);
    const href = 'https://static.f-list.net/images/charimage/45951647.gif';

    expect(applyFListLink(current, draft, href, draft.label)).toEqual({ ok: true });
    const linkMark = current.schema.marks.link.create({ href });
    const rendered = current.schema.marks.link.spec.toDOM?.(linkMark, true);
    expect(rendered).toMatchObject([
      'a',
      { href, 'data-link-host': 'static.f-list.net' },
      0,
    ]);
    expect(current.getText()).toBe('Horizon Portrait');
    expect(toBBCode(current.state.doc)).toBe(
      `[url=${href}]Horizon Portrait[/url]`,
    );
  });

  it('inserts a selected link and preserves compatible formatting', () => {
    const current = createTextEditor();
    current.chain().setBold().setItalic().run();
    toggleFListTextSize(current, 'big');
    const draft = getFListLinkDraft(current);

    expect(applyFListLink(current, draft, 'https://www.f-list.net', draft.label)).toEqual({ ok: true });
    expect(toBBCode(current.state.doc)).toBe(
      '[big][b][i][url=https://www.f-list.net]F-list[/url][/i][/b][/big]',
    );
  });

  it('uses an entered label at a caret and does not continue the link afterwards', () => {
    const current = createTextEditor('Before ');
    current.commands.setTextSelection(8);
    const draft = getFListLinkDraft(current);

    expect(applyFListLink(current, draft, 'example.com', 'Example')).toEqual({ ok: true });
    current.view.dispatch(current.state.tr.insertText(' after'));

    expect(toBBCode(current.state.doc)).toBe('Before [url=https://example.com]Example[/url] after');
  });

  it('edits and removes the complete link when the caret is inside it', () => {
    const current = createTextEditor();
    const initial = getFListLinkDraft(current);
    applyFListLink(current, initial, 'https://old.example', initial.label);
    current.commands.setTextSelection(4);

    const linked = getFListLinkDraft(current);
    expect(linked).toMatchObject({ from: 1, to: 7, label: 'F-list', hasLink: true });
    expect(applyFListLink(current, linked, 'https://new.example', linked.label)).toEqual({ ok: true });
    expect(toBBCode(current.state.doc)).toBe('[url=https://new.example]F-list[/url]');

    expect(removeFListLink(current, getFListLinkDraft(current))).toBe(true);
    expect(toBBCode(current.state.doc)).toBe('F-list');
  });

  it('makes links and scripts mutually exclusive while sizes remain compatible', () => {
    const current = createTextEditor();
    toggleFListTextScript(current, 'subscript');
    const draft = getFListLinkDraft(current);
    applyFListLink(current, draft, 'https://www.f-list.net', draft.label);
    expect(toBBCode(current.state.doc)).toBe('[url=https://www.f-list.net]F-list[/url]');

    current.commands.setTextSelection({ from: 1, to: 7 });
    toggleFListTextSize(current, 'small');
    expect(toBBCode(current.state.doc)).toBe('[small][url=https://www.f-list.net]F-list[/url][/small]');

    current.commands.setTextSelection({ from: 1, to: 7 });
    toggleFListTextScript(current, 'superscript');
    expect(toBBCode(current.state.doc)).toBe('[sup]F-list[/sup]');
  });
});
