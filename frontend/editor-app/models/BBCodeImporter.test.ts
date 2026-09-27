import { getSchema } from '@tiptap/core';
import { describe, expect, it } from 'vitest';

import { toBBCode } from '../utilities/BBCodeParser';
import {
  importBBCode,
  REPLACE_ME_IMAGE_SRC,
} from './BBCodeImporter';
import { createEditorExtensions } from './EditorExtensions';

const schema = getSchema(createEditorExtensions());

describe('importBBCode', () => {
  const hrBoundaryText = 'Welcome to the Funny Site WYSIWYG Profile Editor!';
  const hrBoundaryCases = [
    {
      label: 'breaks after the opening HR and before the closing HR',
      source: `[hr]\n${hrBoundaryText}\n[hr]`,
      afterOpeningHr: true,
      beforeClosingHr: true,
    },
    {
      label: 'touching HRs on both sides',
      source: `[hr]${hrBoundaryText}[hr]`,
      afterOpeningHr: false,
      beforeClosingHr: false,
    },
    {
      label: 'a break only after the opening HR',
      source: `[hr]\n${hrBoundaryText}[hr]`,
      afterOpeningHr: true,
      beforeClosingHr: false,
    },
    {
      label: 'a break only before the closing HR',
      source: `[hr]${hrBoundaryText}\n[hr]`,
      afterOpeningHr: false,
      beforeClosingHr: true,
    },
  ] as const;

  // F-list only allows url/i/u/b/color/s inside [big]/[small], and b/i/u/s/color
  // inside [sub]/[sup]; any other tag there is printed as literal text.
  it('shows size and script tags nested inside each other as literal text, like F-list', () => {
    const source = '[big][sup]Raised[/sup][/big] '
      + '[sup][big]Large[/big][/sup] '
      + '[small][sub]Lowered[/sub][/small] '
      + '[sub][small]Tiny[/small][/sub]';
    const result = importBBCode(source);
    const document = schema.nodeFromJSON(result.document);
    const runs: Array<[string, string[]]> = [];
    document.firstChild?.forEach(node => {
      if (node.text !== ' ') runs.push([node.text ?? '', node.marks.map(mark => mark.attrs.fontSize ?? mark.type.name)]);
    });

    expect(runs).toEqual([
      ['[sup]Raised[/sup]', ['1.4em']],
      ['[big]Large[/big]', ['superscript']],
      ['[sub]Lowered[/sub]', ['0.8em']],
      ['[small]Tiny[/small]', ['subscript']],
    ]);
    expect(toBBCode(document)).toBe(source);
  });

  it('applies restrictions through every enclosing tag', () => {
    // [color] allows anything, but [big] around it still doesn't allow [sub].
    const result = importBBCode('[big][color=red][sub]Alert[/sub][/color][/big]');
    const document = schema.nodeFromJSON(result.document);
    const text = document.firstChild?.firstChild;

    expect(text?.text).toBe('[sub]Alert[/sub]');
    expect(text?.marks.map(mark => mark.toJSON())).toMatchObject([
      { type: 'textStyle', attrs: { color: '#ff4444', fontSize: '1.4em' } },
    ]);
  });

  it('round-trips a right-aligned coloured rule followed by superscript text', () => {
    const source = '[right][color=red]________________[/color]\n'
      + '[sup]AEON DOCUMENTATION FOR INTERNAL USE ONLY[/sup][/right]';
    const result = importBBCode(source);
    const document = schema.nodeFromJSON(result.document);

    expect(result.document.content).toMatchObject([{
      type: 'paragraph',
      attrs: { textAlign: 'right' },
      content: [
        {
          type: 'text',
          text: '________________',
          marks: [{ type: 'textStyle', attrs: { color: '#ff4444' } }],
        },
        { type: 'hardBreak' },
        {
          type: 'text',
          text: 'AEON DOCUMENTATION FOR INTERNAL USE ONLY',
          marks: [{ type: 'superscript' }],
        },
      ],
    }]);
    expect(toBBCode(document)).toBe(source);
  });

  it('preserves the semantic white colour through import and export', () => {
    const source = '[color=white]White text[/color]';
    const result = importBBCode(source);
    const document = schema.nodeFromJSON(result.document);

    expect(JSON.stringify(result.document)).toContain('"color":"#ffffff"');
    expect(toBBCode(document)).toBe(source);
  });

  it.each(hrBoundaryCases)(
    'round-trips $label',
    ({ source, afterOpeningHr, beforeClosingHr }) => {
      const result = importBBCode(source);
      const document = schema.nodeFromJSON(result.document);

      expect(result.document.content).toMatchObject([
        {
          type: 'horizontalRule',
          attrs: { fListBreakAfter: afterOpeningHr },
        },
        {
          type: 'paragraph',
          attrs: { fListBreakAfter: beforeClosingHr },
          content: [{ type: 'text', text: hrBoundaryText }],
        },
        {
          type: 'horizontalRule',
          attrs: { fListBreakAfter: false },
        },
      ]);
      expect(toBBCode(document)).toBe(source);
    },
  );

  it('round-trips all four HR boundary combinations with blank lines between them', () => {
    const source = hrBoundaryCases.map(item => item.source).join('\n\n');
    const result = importBBCode(source);

    expect(toBBCode(schema.nodeFromJSON(result.document))).toBe(source);
  });

  it('preserves F-list block separators without inventing a trailing aligned line', () => {
    const source = '[center][eicon]wip[/eicon][eicon]wip[/eicon][eicon]wip[/eicon][/center]\n'
      + '[hr]\n'
      + '[center]Inline[/center]\n'
      + '[hr][b][center]Approaches\n[/center][/b]'
      + '[right][sub]Pings[/sub][/right][hr]';
    const result = importBBCode(source);
    const document = schema.nodeFromJSON(result.document);

    expect(result.document.content).toMatchObject([
      {
        type: 'paragraph',
        attrs: { textAlign: 'center', fListBreakAfter: true },
      },
      {
        type: 'horizontalRule',
        attrs: { fListBreakAfter: true },
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'center', fListBreakAfter: true },
      },
      {
        type: 'horizontalRule',
        attrs: { fListBreakAfter: false },
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'center', fListBreakAfter: false },
        content: [{ type: 'text', text: 'Approaches', marks: [{ type: 'bold' }] }],
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'right', fListBreakAfter: false },
        content: [{ type: 'text', text: 'Pings', marks: [{ type: 'subscript' }] }],
      },
      {
        type: 'horizontalRule',
        attrs: { fListBreakAfter: false },
      },
    ]);
    expect(JSON.stringify(result.document.content?.[4])).not.toContain('hardBreak');
    expect(toBBCode(document)).toBe(
      '[center][eicon]wip[/eicon][eicon]wip[/eicon][eicon]wip[/eicon][/center]\n'
      + '[hr]\n'
      + '[center]Inline[/center]\n'
      + '[hr][center][b]Approaches[/b][/center]'
      + '[right][sub]Pings[/sub][/right][hr]',
    );
  });

  it('imports nested formatting, colors, links, alignment, and line breaks', () => {
    const result = importBBCode(
      '[center][b]Bold [i]and italic[/i][/b]\n'
      + '[color=red][big]Important[/big][/color]\n'
      + '[url=https://www.f-list.net]F-list[/url][/center]',
    );

    expect(result.unsupportedTags).toEqual([]);
    expect(result.document).toMatchObject({
      type: 'doc',
      content: [{
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: [
          { type: 'text', text: 'Bold ', marks: [{ type: 'bold' }] },
          {
            type: 'text',
            text: 'and italic',
            marks: [{ type: 'bold' }, { type: 'italic' }],
          },
          { type: 'hardBreak' },
          {
            type: 'text',
            text: 'Important',
            marks: [{ type: 'textStyle', attrs: { color: '#ff4444', fontSize: '1.4em' } }],
          },
          { type: 'hardBreak' },
          {
            type: 'text',
            text: 'F-list',
            marks: [{ type: 'link', attrs: { href: 'https://www.f-list.net' } }],
          },
        ],
      }],
    });
    expect(() => schema.nodeFromJSON(result.document)).not.toThrow();
  });

  // The [color] around a quote colours the quote, which the default theme
  // shows grey and the dark theme in that colour. Its text isn't coloured.
  it('keeps the colour around a quote on the quote', () => {
    const source = '[collapse=Facility][color=white][quote]'
      + '[collapse=Garrison][color=white][sup]WHITE[/sup][/color][/collapse]'
      + '[sup]GREY[/sup]'
      + '[/quote][/color][/collapse]';
    const result = importBBCode(source);
    const facility = result.document.content?.[0];
    const quote = facility?.content?.[0];
    const garrison = quote?.content?.[0];
    const white = garrison?.content?.[0].content?.[0];
    const grey = quote?.content?.[1].content?.[0];

    expect(quote?.attrs).toMatchObject({ color: '#ffffff' });
    expect(garrison?.attrs).toMatchObject({ color: null });
    const exported = toBBCode(schema.nodeFromJSON(result.document));
    expect(exported).toContain('[collapse=Facility][color=white][quote][collapse=Garrison]');
    expect(exported).toMatch(/\[\/quote\]\[\/color\]\[\/collapse\]$/);
    expect(white).toMatchObject({
      text: 'WHITE',
      marks: [
        { type: 'textStyle', attrs: { color: '#ffffff' } },
        { type: 'superscript' },
      ],
    });
    expect(grey).toMatchObject({
      text: 'GREY',
      marks: [{ type: 'superscript' }],
    });
  });

  // F-list reads [url] content as plain text, and doesn't allow [url] in [sub]/[sup].
  it('shows tags inside a link, or links inside scripts, as literal text', () => {
    const cases = [
      ['[sub][url=https://www.f-list.net]Link[/url][/sub]', '[url=https://www.f-list.net]Link[/url]', ['subscript']],
      ['[url=https://www.f-list.net][sup]Script[/sup][/url]', '[sup]Script[/sup]', ['link']],
      ['[url=https://www.f-list.net][big]Both[/big][/url]', '[big]Both[/big]', ['link']],
    ] as const;

    for (const [source, text, marks] of cases) {
      const document = schema.nodeFromJSON(importBBCode(source).document);
      const node = document.firstChild?.firstChild;
      expect(node?.text).toBe(text);
      expect(node?.marks.map(mark => mark.type.name)).toEqual(marks);
      expect(toBBCode(document)).toBe(source);
    }
  });

  it('keeps formatting outside the link so F-list applies it', () => {
    const source = '[small][url=https://static.f-list.net/images/charimage/45951647.gif]Horizon Portrait[/url][/small]';
    const document = schema.nodeFromJSON(importBBCode(source).document);
    const node = document.firstChild?.firstChild;

    expect(node?.text).toBe('Horizon Portrait');
    expect(node?.marks.map(mark => mark.type.name).sort()).toEqual(['link', 'textStyle']);
    expect(toBBCode(document)).toBe(source);
  });

  // F-list renders every alignment tag as `span.<x>Text { display: block }`,
  // so touching tags still start new lines.
  it('imports touching alignment tags as separate lines, like F-list', () => {
    const source = '[left]Left[/left][center]Centre[/center][right]Right[/right]';
    const result = importBBCode(source);
    const document = schema.nodeFromJSON(result.document);

    expect(result.document.content).toMatchObject([
      { type: 'paragraph', attrs: { textAlign: 'left', fListBreakAfter: false }, content: [{ text: 'Left' }] },
      { type: 'paragraph', attrs: { textAlign: 'center', fListBreakAfter: false }, content: [{ text: 'Centre' }] },
      { type: 'paragraph', attrs: { textAlign: 'right' }, content: [{ text: 'Right' }] },
    ]);
    expect(toBBCode(document)).toBe(source);
  });

  it('keeps a coloured right-aligned rule below a centred one', () => {
    const source = '[center]‾‾‾‾[/center][right][color=red]____[/color][/right]';
    const result = importBBCode(source);
    const document = schema.nodeFromJSON(result.document);

    expect(result.document.content).toMatchObject([
      { type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ text: '‾‾‾‾' }] },
      {
        type: 'paragraph',
        attrs: { textAlign: 'right' },
        content: [{ text: '____', marks: [{ type: 'textStyle', attrs: { color: '#ff4444' } }] }],
      },
    ]);
    expect(toBBCode(document)).toBe(source);
  });

  it('keeps unavailable inlines as placeholders and resolves character icons', () => {
    const result = importBBCode(
      'Before [img=3728954]falkeinline[/img] '
      + '[icon]EULR with a gun[/icon] [eicon]eicon[/eicon] after',
    );
    const content = result.document.content?.[0].content ?? [];
    const images = content.filter(node => node.type === 'image');
    const eicon = content.find(node => node.type === 'eicon');

    expect(images).toHaveLength(2);
    expect(images.map(image => image.attrs?.src)).toEqual([
      REPLACE_ME_IMAGE_SRC,
      'https://static.f-list.net/images/avatar/eulr%20with%20a%20gun.png',
    ]);
    expect(images.map(image => image.attrs?.alt)).toEqual([
      'REPLACE ME',
      'EULR with a gun',
    ]);
    expect(images.map(image => image.attrs?.placeholderKind)).toEqual([
      'inline',
      'icon',
    ]);
    expect(images.map(image => [image.attrs?.width, image.attrs?.height])).toEqual([
      [null, null],
      [50, 50],
    ]);
    expect(eicon).toMatchObject({ type: 'eicon', attrs: { name: 'eicon' } });
    expect(JSON.stringify(result.document)).not.toContain('falkeinline');
    expect(JSON.stringify(result.document)).not.toContain('[/img]');
    expect(result.unsupportedTags).toEqual([]);
    expect(() => schema.nodeFromJSON(result.document)).not.toThrow();
    expect(toBBCode(schema.nodeFromJSON(result.document))).toContain(
      '[icon]EULR with a gun[/icon]',
    );
  });

  it('loads and round-trips inline assets supplied by a profile import', () => {
    const source = '[center][img=3728954]falkeinline[/img][/center]';
    const result = importBBCode(source, {
      inlines: {
        '3728954': {
          id: '3728954',
          extension: 'png',
          nsfw: false,
          url: 'https://static.f-list.net/images/charinline/f4/8f/f48f8fc16b03b84a2233f798666a636a6dbae96a.png',
        },
      },
    });
    const document = schema.nodeFromJSON(result.document);
    const image = result.document.content?.[0].content?.[0];

    expect(image).toMatchObject({
      type: 'image',
      attrs: {
        src: 'https://static.f-list.net/images/charinline/f4/8f/f48f8fc16b03b84a2233f798666a636a6dbae96a.png',
        bbcodeTag: 'img',
        bbcodeValue: '3728954',
        bbcodeLabel: 'falkeinline',
      },
    });
    expect(toBBCode(document)).toBe(source);
  });

  it('round-trips an eicon by name while retaining the inline-image placeholder', () => {
    const result = importBBCode(
      '[eicon]r03chug[/eicon] [img=3728954]falkeinline[/img]',
    );
    const document = schema.nodeFromJSON(result.document);

    expect(toBBCode(document)).toBe(
      '[eicon]r03chug[/eicon] '
      + '[big][color=red]REPLACE ME WITH YOUR INLINE[/color][/big]',
    );
  });

  it.each([
    ['center', 'center'],
    ['right', 'right'],
    ['justify', 'justify'],
  ] as const)(
    'retains %s line alignment around movable eicons',
    (tag, alignment) => {
      const source = `[${tag}]Before [eicon]r03chug[/eicon] after[/${tag}]`;
      const result = importBBCode(source);
      const document = schema.nodeFromJSON(result.document);

      expect(result.document.content?.[0]).toMatchObject({
        type: 'paragraph',
        attrs: { textAlign: alignment },
        content: [
          { type: 'text', text: 'Before ' },
          { type: 'eicon', attrs: { name: 'r03chug' } },
          { type: 'text', text: ' after' },
        ],
      });
      expect(toBBCode(document)).toBe(source);
    },
  );

  it('accepts an unpaired legacy inline-image shorthand without consuming later text', () => {
    const result = importBBCode('Before [img=42] after');
    const content = result.document.content?.[0].content ?? [];

    expect(content.map(node => node.type)).toEqual(['text', 'image', 'text']);
    expect(content[2]).toMatchObject({ type: 'text', text: ' after' });
    expect(() => schema.nodeFromJSON(result.document)).not.toThrow();
  });

  it('imports indentation, quotes, collapses, lists, and rules as editable blocks', () => {
    const result = importBBCode([
      '[indent][quote]Quoted[/quote][/indent]',
      '[collapse=More]Hidden[/collapse]',
      '[list=1]',
      '[*]One',
      '[*][u]Two[/u]',
      '[/list]',
      '[hr]',
    ].join('\n'));

    expect(result.document.content?.map(node => node.type)).toEqual([
      'indentedBlock',
      'collapsible',
      'orderedList',
      'horizontalRule',
    ]);
    expect(result.document.content?.[0]).toMatchObject({
      type: 'indentedBlock',
      attrs: { indent: 1 },
      content: [{ type: 'blockquote' }],
    });
    expect(result.document.content?.[1]).toMatchObject({
      type: 'collapsible',
      attrs: { title: 'More', indent: 0, collapsed: false },
    });
    expect(result.document.content?.[2].content).toHaveLength(2);
    const document = schema.nodeFromJSON(result.document);
    expect(toBBCode(document)).toContain('[*][u]Two[/u]');
  });

  it('round-trips nested dropdowns without lifting the child out of its parent', () => {
    const source = '[collapse=Outer]Before\n'
      + '[collapse=Inner]Inside[/collapse]\n'
      + 'After[/collapse]';
    const imported = importBBCode(source);
    const document = schema.nodeFromJSON(imported.document);
    const outer = imported.document.content?.[0];

    expect(outer).toMatchObject({
      type: 'collapsible',
      attrs: { title: 'Outer' },
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
        {
          type: 'collapsible',
          attrs: { title: 'Inner' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Inside' }] }],
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'After' }] },
      ],
    });

    const exported = toBBCode(document);
    const reimported = importBBCode(exported);
    expect(reimported.document.content?.[0].content?.[1]).toMatchObject({
      type: 'collapsible',
      attrs: { title: 'Inner' },
    });
  });

  it('gives every dropdown inside one [color] that colour', () => {
    const result = importBBCode(
      '[color=white][collapse=A][color=white]a[/color][/collapse]'
      + '[collapse=B]b[/collapse][collapse=C]c[/collapse][/color]',
    );

    expect(result.document.content?.map(block => block.attrs?.color))
      .toEqual(['#ffffff', '#ffffff', '#ffffff']);
  });

  it('stores outer dropdown colour and alignment while inner blocks override inheritance', () => {
    const source = '[color=blue][right][collapse=Record]Inherited\n'
      + '[left]Local override[/left][/collapse][/right][/color]';
    const result = importBBCode(source);
    const dropdown = result.document.content?.[0];

    expect(dropdown).toMatchObject({
      type: 'collapsible',
      attrs: {
        title: 'Record',
        textAlign: 'right',
        color: '#1e90ff',
      },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Inherited' }],
        },
        {
          type: 'paragraph',
          attrs: { textAlign: 'left' },
          content: [{ type: 'text', text: 'Local override' }],
        },
      ],
    });
    expect(JSON.stringify(dropdown?.content?.[0])).not.toContain('textStyle');

    const exported = toBBCode(schema.nodeFromJSON(result.document));
    expect(exported).toContain('[color=blue][right][collapse=Record]');
    expect(exported).toContain('[left]Local override[/left]');
    expect(exported).toContain('[/collapse][/right][/color]');
  });

  it('preserves a trailing dropdown line only when content exists before the closing tag', () => {
    const withTrailingLine = '[color=red][center][collapse=Details]'
      + '[left][color=green]wadadadwadadadaw[/color][/left] '
      + '[/collapse][/center][/color]';
    const tightlyClosed = '[color=red][center][collapse=Details]'
      + '[left][color=green]wadadadwadadadaw[/color][/left]'
      + '[/collapse][/center][/color]';

    const spaced = importBBCode(withTrailingLine);
    const tight = importBBCode(tightlyClosed);
    const spacedDropdown = spaced.document.content?.[0];
    const tightDropdown = tight.document.content?.[0];

    expect(spacedDropdown?.type).toBe('collapsible');
    expect(spacedDropdown?.content).toHaveLength(2);
    expect(spacedDropdown?.content?.[1]).toMatchObject({
      type: 'paragraph',
      content: [{ type: 'text', text: ' ' }],
    });
    expect(tightDropdown?.content).toHaveLength(1);
    expect(toBBCode(schema.nodeFromJSON(spaced.document))).toBe(withTrailingLine);
    expect(toBBCode(schema.nodeFromJSON(tight.document))).toBe(tightlyClosed);
  });

  it('round-trips dropdown closing tags on the final content line', () => {
    const sources = [
      '[collapse=title]adwadadadadadwa[/collapse]',
      '[collapse=title]Line 1\nLine 2\nLine 3[/collapse]',
      '[color=red][center][collapse=Details]'
        + '[left][color=green]Aligned[/color][/left]'
        + '[/collapse][/center][/color]',
      '[collapse=Outer]Before\n'
        + '[collapse=Inner]Inside[/collapse]\n'
        + 'After[/collapse]',
    ];

    for (const source of sources) {
      const imported = importBBCode(source);
      expect(toBBCode(schema.nodeFromJSON(imported.document))).toBe(source);
    }
  });

  it('moves imported parent indentation onto collapses so they can use the full workspace', () => {
    const result = importBBCode(
      '[indent][indent]Before\n'
      + '[collapse=First]One[/collapse]\n'
      + '[collapse=Second]Two[/collapse]\n'
      + 'After[/indent][/indent]',
    );

    expect(result.document.content).toMatchObject([
      {
        type: 'indentedBlock',
        attrs: { indent: 2 },
      },
      {
        type: 'collapsible',
        attrs: { title: 'First', indent: 2, collapsed: false },
      },
      {
        type: 'collapsible',
        attrs: { title: 'Second', indent: 2, collapsed: false },
      },
      {
        type: 'indentedBlock',
        attrs: { indent: 2 },
      },
    ]);

    const collapses = result.document.content?.filter(node => node.type === 'collapsible') ?? [];
    expect(collapses).toHaveLength(2);
    expect(collapses.every(node => node.attrs?.indent === 2)).toBe(true);
    expect(collapses.every(node => node.content?.[0].type === 'paragraph')).toBe(true);
    expect(() => schema.nodeFromJSON(result.document)).not.toThrow();

    const profileDepth = 16;
    const deeplyIndented = importBBCode(
      `${'[indent]'.repeat(profileDepth)}`
      + '[collapse=Profile section]Content[/collapse]'
      + `${'[/indent]'.repeat(profileDepth)}`,
    );
    expect(deeplyIndented.document.content).toMatchObject([{
      type: 'collapsible',
      attrs: { title: 'Profile section', indent: profileDepth },
    }]);
  });

  it('preserves whether adjacent dropdowns are separated or grouped', () => {
    const separated = importBBCode(
      '[collapse][/collapse]\n[collapse][/collapse]',
    );
    const touching = importBBCode(
      '[collapse]\n[/collapse][collapse]\n[/collapse]',
    );

    for (const result of [separated, touching]) {
      expect(result.unsupportedTags).toEqual([]);
      expect(result.document.content?.map(node => node.type)).toEqual([
        'collapsible',
        'collapsible',
      ]);
      expect(result.document.content?.every(node => (
        node.content?.length === 1
        && node.content[0].type === 'paragraph'
        && !node.content[0].content
      ))).toBe(true);
      expect(() => schema.nodeFromJSON(result.document)).not.toThrow();
    }

    expect(separated.document.content?.map(node => node.attrs?.joinNext)).toEqual([
      false,
      false,
    ]);
    expect(touching.document.content?.map(node => node.attrs?.joinNext)).toEqual([
      true,
      false,
    ]);
    expect(toBBCode(schema.nodeFromJSON(separated.document))).toBe(
      '[collapse=Details][/collapse]\n[collapse=Details][/collapse]',
    );
    expect(toBBCode(schema.nodeFromJSON(touching.document))).toBe(
      '[collapse=Details][/collapse][collapse=Details][/collapse]',
    );
  });

  it('automatically joins touching populated dropdowns during import', () => {
    const result = importBBCode(
      '[collapse=Hello World]\n'
      + 'This is some content\n'
      + '[/collapse][collapse=Hello World Again]\n'
      + 'This is some content more\n'
      + '[/collapse]',
    );
    const document = schema.nodeFromJSON(result.document);

    expect(result.document.content).toMatchObject([
      { type: 'collapsible', attrs: { title: 'Hello World', joinNext: true } },
      { type: 'collapsible', attrs: { title: 'Hello World Again', joinNext: false } },
    ]);
    expect(toBBCode(document)).toContain(
      '[/collapse][collapse=Hello World Again]',
    );
  });

  it('preserves grouped dropdowns across independent indent wrappers', () => {
    const result = importBBCode(
      '[indent][collapse=First]One[/collapse][/indent]'
      + '[indent][collapse=Second]Two[/collapse][/indent]',
    );
    const document = schema.nodeFromJSON(result.document);

    expect(result.document.content).toMatchObject([
      { type: 'collapsible', attrs: { title: 'First', indent: 1, joinNext: true } },
      { type: 'collapsible', attrs: { title: 'Second', indent: 1, joinNext: false } },
    ]);
    // Exported exactly as written: nothing followed the second dropdown.
    expect(toBBCode(document)).toBe(
      '[indent][collapse=First]One[/collapse][/indent]'
      + '[indent][collapse=Second]Two[/collapse][/indent]',
    );
  });

  it('preserves unsupported tags as visible text instead of discarding content', () => {
    const result = importBBCode('[mystery=value]Keep [b]everything[/b][/mystery]');
    const document = schema.nodeFromJSON(result.document);

    expect(result.unsupportedTags).toEqual(['mystery']);
    expect(document.textContent).toBe('[mystery=value]Keep everything[/mystery]');
    expect(toBBCode(document)).toBe('[mystery=value]Keep [b]everything[/b][/mystery]');
  });

  it('keeps bracketed prose literal without swallowing later supported tags', () => {
    const source = "[icon]KRAR-R03-01[/icon] '[REDACTED]'\n"
      + '[hr][right][small]Further information[/small][/right]';
    const result = importBBCode(source);
    const document = schema.nodeFromJSON(result.document);

    expect(result.unsupportedTags).toEqual([]);
    expect(result.document.content?.map(node => node.type)).toEqual([
      'paragraph',
      'horizontalRule',
      'paragraph',
    ]);
    expect(JSON.stringify(result.document)).toContain('[REDACTED]');
    expect(JSON.stringify(result.document)).not.toContain('[hr]');
    expect(toBBCode(document)).toContain(
      "[icon]KRAR-R03-01[/icon] '[REDACTED]'\n[hr][right][small]Further information[/small][/right]",
    );
  });

  it('round-trips supported profile text back to readable F-list BBCode', () => {
    const imported = importBBCode(
      '[right][color=blue][b]Hello[/b][/color][/right]\n[small]Quiet[/small]',
    );
    const document = schema.nodeFromJSON(imported.document);

    expect(toBBCode(document)).toBe(
      '[right][color=blue][b]Hello[/b][/color][/right]\n[small]Quiet[/small]',
    );
  });

  it('uses F-list palette values and website font sizing for imported text', () => {
    const result = importBBCode(
      '[color=green]Green[/color] [color=blue]Blue[/color] [small]Small[/small]',
    );

    expect(result.document.content?.[0].content).toMatchObject([
      { marks: [{ type: 'textStyle', attrs: { color: '#44ff44' } }] },
      {},
      { marks: [{ type: 'textStyle', attrs: { color: '#1e90ff' } }] },
      {},
      { marks: [{ type: 'textStyle', attrs: { fontSize: '0.8em' } }] },
    ]);
  });
});
