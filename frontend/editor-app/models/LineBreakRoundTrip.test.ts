import { getSchema } from '@tiptap/core';
import { describe, expect, it } from 'vitest';

import { toBBCode } from '../utilities/BBCodeParser';
import { importBBCode } from './BBCodeImporter';
import { createEditorExtensions } from './EditorExtensions';

const schema = getSchema(createEditorExtensions());
const assets = {
  inlines: { 1: { id: '1', url: 'https://static.f-list.net/images/charinline/1.png', extension: 'png', nsfw: false } },
};
const importDocument = (source: string) => schema.nodeFromJSON(importBBCode(source, assets).document);
const roundTrip = (source: string) => toBBCode(importDocument(source));

// On F-list every newline is a visible line, except the last one before a
// block ends and one just inside [collapse=…] / [/collapse]. Exports must keep
// the same visible lines as the profile they came from.
describe('line breaks survive import and export', () => {
  it.each([
    ['blank lines at the end of a block', '[justify]Example Text\n\n\n\n\n\n[/justify]After'],
    ['a newline after an indent block', '[indent]Entry[/indent]\n[hr]Next'],
    ['blank lines after a block at the end of a dropdown', '[collapse=T][right]Signed[/right]\n\n[/collapse]'],
    ['a block holding only a newline', '[justify]\n[/justify]\nNext'],
    ['a blank last line in a dropdown', '[collapse=T]Content\n\n\n[/collapse]'],
    ['empty dropdowns', '[collapse=Details][/collapse]\n[collapse=Details][/collapse]'],
    ['a dropdown directly followed by a block', '[collapse=T]x[/collapse][right]y[/right]'],
    ['eicon names in their original case', '[eicon]ADLR[/eicon]'],
    ['an inline image between rules', '[hr][center][img=1]x[/img][/center][hr]'],
    ['a newline after an inline image before a rule', 'T1\n[img=1]x[/img]\n[hr]T2'],
    ['an inline image touching a rule', 'T1\n[img=1]x[/img][hr]T2'],
    ['an inline image closing a quote', '[quote][img=1]x[/img][/quote]T2'],
    ['two newlines after an inline image', '[center][img=1]x[/img]\n\n[/center]T2'],
    ['a blank line after an inline image in a dropdown', '[collapse=T][img=1]x[/img]\n\n[/collapse]T2'],
  ])('keeps %s exactly', (_label, source) => {
    expect(roundTrip(source)).toBe(source);
  });

  // F-list puts each inline image in its own div, so a newline right after
  // one is a blank line, not the end of a text line.
  it('keeps the blank line from a newline after an inline image', () => {
    const document = importDocument('[center][img=1]x[/img]\n[/center]T2');

    expect(document.child(0).lastChild?.type.name).toBe('image');
    expect(document.child(1)).toMatchObject({ childCount: 0, attrs: { textAlign: 'center' } });
    const exported = toBBCode(document);
    expect(exported).toBe('[center][img=1]x[/img][/center][center]\n[/center]T2');
    expect(roundTrip(exported)).toBe(exported);
  });

  it('writes no newline after a line that ends with an inline image', () => {
    const image = {
      type: 'image',
      attrs: { placeholderKind: 'inline', bbcodeTag: 'img', bbcodeValue: '1', bbcodeLabel: 'x' },
    };
    const document = schema.nodeFromJSON({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'T1' }, image] },
        { type: 'paragraph', content: [{ type: 'text', text: 'T2' }] },
      ],
    });

    expect(toBBCode(document)).toBe('T1[img=1]x[/img]T2');
  });

  it('keeps blank lines that a colour wrapper keeps inside a dropdown', () => {
    const source = '[collapse=S][color=white]x\n[right]y[/right]\n\n[/color][/collapse]';
    const exported = roundTrip(source);
    const document = schema.nodeFromJSON(importBBCode(exported).document);
    const dropdown = document.child(0);

    // Two blank lines: the break after [right] and an empty last line.
    expect(dropdown.lastChild?.childCount).toBe(0);
    expect(dropdown.child(dropdown.childCount - 2).attrs.fListBreakAfter).toBe(true);
    expect(roundTrip(exported)).toBe(exported);
  });

  it('keeps newlines before a nested block inside its alignment tag', () => {
    const document = schema.nodeFromJSON(
      importBBCode('[left]LILY LOST\n\n[indent]Quote[/indent][/left]').document,
    );
    // No "break after" spacer: F-list hides the last newline before [indent].
    expect(document.child(0).attrs).toMatchObject({ textAlign: 'left', fListBreakAfter: false });
    expect(toBBCode(document)).toBe('[left]LILY LOST\n\n[/left][indent][left]Quote[/left][/indent]');
  });
});
