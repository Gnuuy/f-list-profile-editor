import { getSchema } from '@tiptap/core';
import { describe, expect, it } from 'vitest';

import { toBBCode } from '../utilities/BBCodeParser';
import {
  importBBCode,
  REPLACE_ME_ICON_SRC,
  REPLACE_ME_IMAGE_SRC,
} from './BBCodeImporter';
import { createEditorExtensions } from './EditorExtensions';

const schema = getSchema(createEditorExtensions());

describe('importBBCode', () => {
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
            marks: [{ type: 'textStyle', attrs: { color: '#ff4444', fontSize: '1.25em' } }],
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

  it('replaces unavailable images and preserves an eicon name as an editable node', () => {
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
      REPLACE_ME_ICON_SRC,
    ]);
    expect(images.map(image => image.attrs?.alt)).toEqual([
      'REPLACE ME',
      'REPLACE ME',
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
      '[collapse=Details]\n[/collapse]\n[collapse=Details]\n[/collapse]',
    );
    expect(toBBCode(schema.nodeFromJSON(touching.document))).toBe(
      '[collapse=Details]\n[/collapse][collapse=Details]\n[/collapse]',
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
    expect(toBBCode(document)).toBe(
      '[indent][collapse=First]One\n[/collapse][/indent]'
      + '[indent][collapse=Second]Two\n[/collapse]\n[/indent]',
    );
  });

  it('preserves unsupported tags as visible text instead of discarding content', () => {
    const result = importBBCode('[mystery=value]Keep [b]everything[/b][/mystery]');
    const document = schema.nodeFromJSON(result.document);

    expect(result.unsupportedTags).toEqual(['mystery']);
    expect(document.textContent).toBe('[mystery=value]Keep everything[/mystery]');
    expect(toBBCode(document)).toBe('[mystery=value]Keep [b]everything[/b][/mystery]');
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

  it('uses F-list palette values and Bootstrap font sizing for imported text', () => {
    const result = importBBCode(
      '[color=green]Green[/color] [color=blue]Blue[/color] [small]Small[/small]',
    );

    expect(result.document.content?.[0].content).toMatchObject([
      { marks: [{ type: 'textStyle', attrs: { color: '#44ff44' } }] },
      {},
      { marks: [{ type: 'textStyle', attrs: { color: '#1e90ff' } }] },
      {},
      { marks: [{ type: 'textStyle', attrs: { fontSize: '0.875em' } }] },
    ]);
  });
});
