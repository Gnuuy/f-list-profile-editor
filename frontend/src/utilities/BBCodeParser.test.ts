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

  it('serializes imported links, code, and supported font sizes', () => {
    const document = documentFrom([{
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Large link',
          marks: [
            { type: 'link', attrs: { href: 'https://www.f-list.net' } },
            { type: 'textStyle', attrs: { fontSize: '1.25em' } },
          ],
        },
        { type: 'text', text: ' code', marks: [{ type: 'code' }] },
      ],
    }]);

    expect(toBBCode(document)).toBe(
      '[url=https://www.f-list.net][big]Large link[/big][/url][code] code[/code]',
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

  it('serializes semantic eicons back to canonical F-list BBCode', () => {
    const document = documentFrom([{
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Before ' },
        { type: 'eicon', attrs: { name: 'R03Chug' } },
        { type: 'text', text: ' after' },
      ],
    }]);

    expect(toBBCode(document)).toBe(
      'Before [eicon]r03chug[/eicon] after',
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
      '[center]Centered[/center]',
      '[indent][quote]Quoted',
      '[/quote]',
      '[/indent][collapse=More]Details',
      '[/collapse]',
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

    expect(toBBCode(document)).toBe(
      '[indent][indent]Indented\n[/indent][/indent]',
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
      '[collapse=First]One\n[/collapse][collapse=Second]Two\n[/collapse]\nAfter',
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
      '[collapse=First]One\n[/collapse]\n[collapse=Second]Two\n[/collapse]',
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
      '[indent][collapse=First]One\n[/collapse][/indent]'
      + '[indent][collapse=Second]Two\n[/collapse]\n[/indent]',
    );
  });
});
