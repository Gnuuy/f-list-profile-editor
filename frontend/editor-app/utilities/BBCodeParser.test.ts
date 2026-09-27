import { Schema } from '@tiptap/pm/model';
import type { Node as PMNode } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';

import { toBBCode } from './BBCodeParser';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block',
      content: 'inline*',
      attrs: { textAlign: { default: null } },
    },
    heading: {
      group: 'block',
      content: 'inline*',
      attrs: { textAlign: { default: null } },
    },
    blockquote: {
      group: 'block',
      content: 'block+',
      attrs: { indent: { default: 0 } },
    },
    collapsible: {
      group: 'block',
      content: 'block+',
      attrs: {
        title: { default: 'Details' },
        indent: { default: 0 },
        joinNext: { default: false },
      },
    },
    indentedBlock: {
      group: 'block',
      content: 'block+',
      attrs: { indent: { default: 1 } },
    },
    bulletList: { group: 'block', content: 'listItem+' },
    orderedList: { group: 'block', content: 'listItem+' },
    listItem: { content: 'paragraph+' },
    horizontalRule: { group: 'block' },
    text: { group: 'inline' },
    hardBreak: { inline: true, group: 'inline' },
    image: {
      inline: true,
      group: 'inline',
      attrs: {
        src: { default: null },
        placeholderKind: { default: null },
        bbcodeTag: { default: null },
        bbcodeValue: { default: null },
        bbcodeLabel: { default: null },
      },
    },
    eicon: {
      inline: true,
      group: 'inline',
      atom: true,
      attrs: { name: { default: '' } },
    },
  },
  marks: {
    inlineTextAlign: {
      attrs: { alignment: { default: 'left' } },
    },
    textStyle: {
      attrs: {
        color: { default: null },
        fontSize: { default: null },
      },
    },
    link: { attrs: { href: { default: null } } },
    code: {},
    bold: {},
    italic: {},
    underline: {},
    strike: {},
    subscript: {},
    superscript: {},
  },
});

function documentFrom(content: unknown[]): PMNode {
  return schema.nodeFromJSON({ type: 'doc', content });
}

describe('toBBCode', () => {
  it('serializes paragraphs with readable line breaks', () => {
    const document = documentFrom([
      { type: 'paragraph', content: [{ type: 'text', text: 'First line' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Second line' }] },
    ]);

    expect(toBBCode(document)).toBe('First line\nSecond line');
  });

  it('serializes independently aligned fragments on one BBCode line', () => {
    const document = documentFrom([{
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Left',
          marks: [{ type: 'inlineTextAlign', attrs: { alignment: 'left' } }],
        },
        {
          type: 'text',
          text: 'Centre',
          marks: [{ type: 'inlineTextAlign', attrs: { alignment: 'center' } }],
        },
        {
          type: 'text',
          text: 'Right',
          marks: [{ type: 'inlineTextAlign', attrs: { alignment: 'right' } }],
        },
      ],
    }]);

    expect(toBBCode(document)).toBe(
      '[left]Left[/left][center]Centre[/center][right]Right[/right]',
    );
  });

  it('keeps overlapping inline marks balanced', () => {
    const document = documentFrom([{
      type: 'paragraph',
      content: [
        { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' and italic', marks: [{ type: 'bold' }, { type: 'italic' }] },
        { type: 'text', text: ' italic', marks: [{ type: 'italic' }] },
      ],
    }]);

    expect(toBBCode(document)).toBe(
      '[b]bold[i] and italic[/i][/b][i] italic[/i]',
    );
  });

  it('normalizes known colors to F-list palette names', () => {
    const document = documentFrom([{
      type: 'paragraph',
      content: [{
        type: 'text',
        text: 'Alert',
        marks: [{ type: 'textStyle', attrs: { color: '#ff4444' } }],
      }],
    }]);

    expect(toBBCode(document)).toBe('[color=red]Alert[/color]');
  });

  it('closes formatting before a hard break when the next line uses different marks', () => {
    const document = documentFrom([{
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
          text: 'DOCUMENTATION',
          marks: [{ type: 'superscript' }],
        },
      ],
    }]);

    expect(toBBCode(document)).toBe(
      '[right][color=red]________________[/color]\n[sup]DOCUMENTATION[/sup][/right]',
    );
  });

  it('keeps formatting open across a hard break when it continues on the next line', () => {
    const document = documentFrom([{
      type: 'paragraph',
      content: [
        { type: 'text', text: 'First', marks: [{ type: 'bold' }] },
        { type: 'hardBreak' },
        { type: 'text', text: 'Second', marks: [{ type: 'bold' }] },
      ],
    }]);

    expect(toBBCode(document)).toBe('[b]First\nSecond[/b]');
  });

  it('serializes imported links, code, and supported font sizes', () => {
    const document = documentFrom([{
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Large link',
          marks: [
            { type: 'link', attrs: { href: 'https://www.f-list.net' } },
            { type: 'textStyle', attrs: { fontSize: '1.4em' } },
          ],
        },
        { type: 'text', text: ' code', marks: [{ type: 'code' }] },
      ],
    }]);

    expect(toBBCode(document)).toBe(
      '[big][url=https://www.f-list.net]Large link[/url][/big][code] code[/code]',
    );
  });

  it('uses a dedicated replacement instruction for imported eicons', () => {
    const document = documentFrom([{
      type: 'paragraph',
      content: [
        { type: 'image', attrs: { src: '/eicon.svg', placeholderKind: 'eicon' } },
        { type: 'text', text: ' ' },
        { type: 'image', attrs: { src: '/inline.svg', placeholderKind: 'inline' } },
      ],
    }]);

    expect(toBBCode(document)).toBe(
      '[big][color=red]REPLACE ME WITH YOUR EICON[/color][/big] '
      + '[big][color=red]REPLACE ME WITH YOUR INLINE[/color][/big]',
    );
  });

  it('distinguishes imported inlines and character icons from manual images', () => {
    const document = documentFrom([{
      type: 'paragraph',
      content: [
        {
          type: 'image',
          attrs: {
            src: 'https://static.f-list.net/images/charinline/f4/8f/example.png',
            placeholderKind: 'inline',
            bbcodeTag: 'img',
            bbcodeValue: '3728954',
            bbcodeLabel: 'falkeinline',
          },
        },
        { type: 'text', text: ' ' },
        {
          type: 'image',
          attrs: {
            src: 'https://static.f-list.net/images/avatar/fklr-r03.png',
            placeholderKind: 'icon',
            bbcodeTag: 'icon',
            bbcodeValue: 'FKLR-R03',
          },
        },
        { type: 'text', text: ' ' },
        {
          type: 'image',
          attrs: {
            src: 'data:image/png;base64,manual',
            placeholderKind: 'inline',
          },
        },
      ],
    }]);

    expect(toBBCode(document)).toBe(
      '[img=3728954]falkeinline[/img] '
      + '[icon]FKLR-R03[/icon] '
      + '[big][color=red]REPLACE ME WITH YOUR INLINE[/color][/big]',
    );
  });

  it('serializes eicons with their names exactly as written', () => {
    const document = documentFrom([{
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Before ' },
        { type: 'eicon', attrs: { name: 'R03Chug' } },
        { type: 'text', text: ' after' },
      ],
    }]);

    expect(toBBCode(document)).toBe(
      'Before [eicon]R03Chug[/eicon] after',
    );
  });

  it('does not emit unsafe eicon names as BBCode', () => {
    const document = documentFrom([{
      type: 'paragraph',
      content: [{ type: 'eicon', attrs: { name: 'name[/eicon]' } }],
    }]);

    expect(toBBCode(document)).toBe(
      '[big][color=red]REPLACE ME WITH YOUR EICON[/color][/big]',
    );
  });

  it('serializes alignment, indentation, quotes, collapses, and lists', () => {
    const document = documentFrom([
      {
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: [{ type: 'text', text: 'Centered' }],
      },
      {
        type: 'blockquote',
        attrs: { indent: 1 },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Quoted' }] }],
      },
      {
        type: 'collapsible',
        attrs: { title: 'More', indent: 0 },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Details' }] }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One' }] }],
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Two' }] }],
          },
        ],
      },
    ]);

    expect(toBBCode(document)).toBe([
      // A centred line made in the editor shows no gap before the quote, so no
      // newline is exported: F-list would turn it into a blank line.
      '[center]Centered[/center][indent][quote]Quoted',
      '[/quote]',
      '[/indent][collapse=More]Details[/collapse]',
      '[list]',
      '[*]One',
      '[*]Two',
      '[/list]',
    ].join('\n'));
  });

  it('serializes imported generic indentation', () => {
    const document = documentFrom([{
      type: 'indentedBlock',
      attrs: { indent: 2 },
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: 'Indented' }],
      }],
    }]);

    // No stray newline before [/indent]; F-list wouldn't show it anyway.
    expect(toBBCode(document)).toBe(
      '[indent][indent]Indented[/indent][/indent]',
    );
  });

  it('keeps explicitly joined collapses touching while retaining other block separators', () => {
    const document = documentFrom([
      {
        type: 'collapsible',
        attrs: { title: 'First', indent: 0, joinNext: true },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One' }] }],
      },
      {
        type: 'collapsible',
        attrs: { title: 'Second', indent: 0 },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Two' }] }],
      },
      { type: 'paragraph', content: [{ type: 'text', text: 'After' }] },
    ]);

    expect(toBBCode(document)).toBe(
      '[collapse=First]One[/collapse][collapse=Second]Two[/collapse]\nAfter',
    );
  });

  it('retains a visible separator between ungrouped adjacent collapses', () => {
    const document = documentFrom([
      {
        type: 'collapsible',
        attrs: { title: 'First', indent: 0, joinNext: false },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One' }] }],
      },
      {
        type: 'collapsible',
        attrs: { title: 'Second', indent: 0, joinNext: false },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Two' }] }],
      },
    ]);

    expect(toBBCode(document)).toBe(
      '[collapse=First]One[/collapse]\n[collapse=Second]Two[/collapse]',
    );
  });

  it('removes collapse gaps across per-collapse indentation wrappers', () => {
    const document = documentFrom([
      {
        type: 'collapsible',
        attrs: { title: 'First', indent: 1, joinNext: true },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One' }] }],
      },
      {
        type: 'collapsible',
        attrs: { title: 'Second', indent: 1 },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Two' }] }],
      },
    ]);

    expect(toBBCode(document)).toBe(
      '[indent][collapse=First]One[/collapse][/indent]'
      + '[indent][collapse=Second]Two[/collapse]\n[/indent]',
    );
  });

  it('closes single-line and multi-line dropdowns on their final content line', () => {
    const document = documentFrom([
      {
        type: 'collapsible',
        attrs: { title: 'Single' },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Only line' }] }],
      },
      {
        type: 'collapsible',
        attrs: { title: 'Multiple' },
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Line 1' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Line 2' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Line 3' }] },
        ],
      },
    ]);

    expect(toBBCode(document)).toBe(
      '[collapse=Single]Only line[/collapse]\n'
      + '[collapse=Multiple]Line 1\nLine 2\nLine 3[/collapse]',
    );
  });

  it('retains an intentional blank final dropdown line', () => {
    const document = documentFrom([{
      type: 'collapsible',
      attrs: { title: 'Trailing line' },
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Content' }] },
        { type: 'paragraph' },
      ],
    }]);

    // One newline ends "Content", one is the blank line, and F-list ignores
    // one just before [/collapse] (the importer reads it back the same way).
    expect(toBBCode(document)).toBe(
      '[collapse=Trailing line]Content\n\n\n[/collapse]',
    );
  });
});
