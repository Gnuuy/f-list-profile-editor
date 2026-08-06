import type { JSONContent } from '@tiptap/core';

import { getFListColorValue } from './FListColors';
import {
  REPLACE_ME_ICON_SRC,
  REPLACE_ME_IMAGE_SRC,
} from './ImagePlaceholders';

export { REPLACE_ME_ICON_SRC, REPLACE_ME_IMAGE_SRC } from './ImagePlaceholders';

type TextNode = {
  type: 'text';
  value: string;
};

type TagNode = {
  type: 'tag';
  name: string;
  attribute: string | null;
  rawOpen: string;
  rawClose: string | null;
  start: number;
  end: number;
  joinNext: boolean;
  children: BBCodeNode[];
};

type BBCodeNode = TextNode | TagNode;
type Mark = NonNullable<JSONContent['marks']>[number];

type RenderContext = {
  align: 'left' | 'center' | 'right' | 'justify' | null;
  marks: Mark[];
  unsupportedTags: Set<string>;
};

export type BBCodeImportResult = {
  document: JSONContent;
  unsupportedTags: string[];
};

const TOKEN = /\[(\/?)([a-z*][a-z0-9_-]*)(?:=([^\]\r\n]*))?\]/gi;
const SELF_CLOSING_TAGS = new Set(['*', 'br', 'hr']);
const BLOCK_TAGS = new Set([
  'center',
  'collapse',
  'indent',
  'justify',
  'left',
  'list',
  'quote',
  'right',
]);
const MARK_TAGS = new Set([
  'b',
  'big',
  'code',
  'color',
  'i',
  's',
  'small',
  'strike',
  'sub',
  'sup',
  'u',
  'url',
]);
const IMAGE_TAGS = new Set(['eicon', 'icon', 'img']);

export function importBBCode(source: string): BBCodeImportResult {
  const unsupportedTags = new Set<string>();
  const nodes = parseBBCode(source.replace(/\r\n?/g, '\n'));
  const content = normalizeImportedIndent(renderBlocks(nodes, {
    align: null,
    marks: [],
    unsupportedTags,
  }));

  return {
    document: {
      type: 'doc',
      content: content.length > 0 ? content : [{ type: 'paragraph' }],
    },
    unsupportedTags: [...unsupportedTags].sort(),
  };
}

/**
 * F-list profiles commonly wrap a whole layout in one or more `[indent]`
 * tags. Keeping that wrapper around an imported collapse permanently narrows
 * the collapse's containing block: setting the collapse's editable indent to
 * zero can then never restore the editor's full width.
 *
 * Move inherited indentation onto each collapse instead. Other content stays
 * grouped in an indented block, so the import remains visually and
 * semantically equivalent while every collapse can be dragged all the way
 * back across the workspace.
 */
function normalizeImportedIndent(
  blocks: JSONContent[],
  inheritedIndent = 0,
): JSONContent[] {
  const normalized: JSONContent[] = [];
  let indentedRun: JSONContent[] = [];

  const flushIndentedRun = () => {
    if (indentedRun.length === 0) return;

    if (inheritedIndent > 0) {
      normalized.push({
        type: 'indentedBlock',
        attrs: { indent: inheritedIndent },
        content: indentedRun,
      });
    } else {
      normalized.push(...indentedRun);
    }
    indentedRun = [];
  };

  for (const block of blocks) {
    if (block.type === 'indentedBlock') {
      flushIndentedRun();
      const indent = Math.max(1, Number(block.attrs?.indent ?? 1) || 1);
      normalized.push(...normalizeImportedIndent(
        block.content ?? [],
        inheritedIndent + indent,
      ));
      continue;
    }

    if (block.type === 'collapsible') {
      flushIndentedRun();
      const ownIndent = Math.max(0, Number(block.attrs?.indent ?? 0) || 0);
      normalized.push({
        ...block,
        attrs: {
          ...block.attrs,
          indent: inheritedIndent + ownIndent,
        },
      });
      continue;
    }

    indentedRun.push(block);
  }

  flushIndentedRun();
  return normalized;
}

function parseBBCode(source: string): BBCodeNode[] {
  const root: BBCodeNode[] = [];
  const stack: Array<{ name: string | null; children: BBCodeNode[]; node?: TagNode }> = [
    { name: null, children: root },
  ];
  let cursor = 0;

  TOKEN.lastIndex = 0;
  for (const match of source.matchAll(TOKEN)) {
    const index = match.index;
    if (index > cursor) {
      currentChildren(stack).push({ type: 'text', value: source.slice(cursor, index) });
    }

    const raw = match[0];
    const closing = match[1] === '/';
    const name = match[2].toLowerCase();
    const attribute = match[3]?.trim() || null;

    if (closing) {
      const frameIndex = findOpenFrame(stack, name);
      if (frameIndex === -1) {
        currentChildren(stack).push({ type: 'text', value: raw });
      } else {
        stack[frameIndex].node!.rawClose = raw;
        stack[frameIndex].node!.end = index + raw.length;
        stack.length = frameIndex;
      }
    } else {
      const node: TagNode = {
        type: 'tag',
        name,
        attribute,
        rawOpen: raw,
        rawClose: null,
        start: index,
        end: index + raw.length,
        joinNext: false,
        children: [],
      };
      currentChildren(stack).push(node);

      const isUnpairedInlineImage = name === 'img'
        && attribute !== null
        && !hasImageClosingTag(source, index + raw.length);
      if (!SELF_CLOSING_TAGS.has(name) && !isUnpairedInlineImage) {
        stack.push({ name, children: node.children, node });
      }
    }

    cursor = index + raw.length;
  }

  if (cursor < source.length) {
    currentChildren(stack).push({ type: 'text', value: source.slice(cursor) });
  }

  markTouchingCollapses(root, source);
  return root;
}

/**
 * A physical line break between two collapse tags is visible on F-list. Record
 * the exact touching boundary so import and export can preserve that choice.
 * Per-collapse indent wrappers may sit between the two tags without adding a
 * line break, so those wrappers are treated as part of the same boundary.
 */
function markTouchingCollapses(nodes: BBCodeNode[], source: string): void {
  const collapses: TagNode[] = [];

  const collect = (items: BBCodeNode[]) => {
    for (const item of items) {
      if (item.type !== 'tag') continue;
      if (item.name === 'collapse' && item.rawClose) collapses.push(item);
      collect(item.children);
    }
  };

  collect(nodes);
  collapses.sort((left, right) => left.start - right.start);

  for (const collapse of collapses) {
    const next = collapses.find(candidate => candidate.start >= collapse.end);
    if (!next) continue;

    const boundary = source.slice(collapse.end, next.start);
    collapse.joinNext = /^(?:\[\/indent\])*(?:\[indent\])*$/i.test(boundary);
  }
}

/**
 * F-list inline images are normally `[img=id]name[/img]`. A few exporters emit
 * the legacy shorthand `[img=id]`, so keep accepting that form without letting
 * a malformed image consume the remainder of the profile.
 */
function hasImageClosingTag(source: string, start: number): boolean {
  const remainder = source.slice(start);
  const closingIndex = remainder.search(/\[\/img\]/i);
  if (closingIndex === -1) return false;

  const nextOpeningIndex = remainder.search(/\[img(?:=|\])/i);
  return nextOpeningIndex === -1 || closingIndex < nextOpeningIndex;
}

function currentChildren(
  stack: Array<{ name: string | null; children: BBCodeNode[] }>,
): BBCodeNode[] {
  return stack[stack.length - 1].children;
}

function findOpenFrame(
  stack: Array<{ name: string | null }>,
  name: string,
): number {
  for (let index = stack.length - 1; index > 0; index -= 1) {
    if (stack[index].name === name) return index;
  }
  return -1;
}

function renderBlocks(nodes: BBCodeNode[], context: RenderContext): JSONContent[] {
  const blocks: JSONContent[] = [];
  let inline: JSONContent[] = [];
  let followsBlock = false;

  const flushInline = () => {
    if (inline.length === 0) return;
    blocks.push(paragraph(inline, context.align));
    inline = [];
  };

  for (const node of nodes) {
    if (node.type === 'text') {
      const value = followsBlock ? trimOneLeadingLineBreak(node.value) : node.value;
      followsBlock = false;
      inline.push(...renderText(value, context.marks));
      continue;
    }

    if (MARK_TAGS.has(node.name) && containsBlock(node.children)) {
      trimOneTrailingLineBreak(inline);
      flushInline();
      const mark = markFor(node);
      if (mark) {
        blocks.push(...renderBlocks(node.children, {
          ...context,
          marks: addMark(context.marks, mark),
        }));
      } else {
        blocks.push(...renderUnsupportedBlock(node, context));
      }
      followsBlock = true;
      continue;
    }

    if (BLOCK_TAGS.has(node.name) || node.name === 'hr') {
      trimOneTrailingLineBreak(inline);
      flushInline();
      blocks.push(...renderBlockTag(node, context));
      followsBlock = true;
      continue;
    }

    inline.push(...renderInlineNode(node, context));
    followsBlock = false;
  }

  flushInline();
  return blocks;
}

function renderBlockTag(node: TagNode, context: RenderContext): JSONContent[] {
  switch (node.name) {
    case 'left':
    case 'center':
    case 'right':
    case 'justify':
      return renderBlocks(node.children, { ...context, align: node.name });

    case 'quote':
      return [{
        type: 'blockquote',
        attrs: { indent: 0 },
        content: ensureBlockContent(renderBlocks(node.children, context)),
      }];

    case 'collapse':
      return [{
        type: 'collapsible',
        attrs: {
          title: cleanAttribute(node.attribute) || 'Details',
          indent: 0,
          collapsed: false,
          joinNext: node.joinNext,
        },
        content: ensureBlockContent(renderBlocks(
          trimBoundaryLineBreaks(node.children),
          context,
        )),
      }];

    case 'indent': {
      const { depth, children } = flattenIndent(node);
      return [{
        type: 'indentedBlock',
        attrs: { indent: depth },
        content: ensureBlockContent(renderBlocks(children, context)),
      }];
    }

    case 'list':
      return [renderList(node, context)];

    case 'hr':
      return [{ type: 'horizontalRule' }];

    default:
      return renderUnsupportedBlock(node, context);
  }
}

function renderList(node: TagNode, context: RenderContext): JSONContent {
  const itemNodes = splitListItems(node.children);
  const items = itemNodes.map(children => ({
    type: 'listItem',
    content: ensureBlockContent(renderBlocks(trimBoundaryLineBreaks(children), context)),
  }));

  return {
    type: node.attribute ? 'orderedList' : 'bulletList',
    content: items.length > 0
      ? items
      : [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
  };
}

function renderUnsupportedBlock(node: TagNode, context: RenderContext): JSONContent[] {
  context.unsupportedTags.add(node.name);
  const opening = paragraph(renderText(node.rawOpen, context.marks), context.align);
  const content = renderBlocks(node.children, context);
  const closing = node.rawClose
    ? [paragraph(renderText(node.rawClose, context.marks), context.align)]
    : [];
  return [opening, ...content, ...closing];
}

function renderInlineNode(node: TagNode, context: RenderContext): JSONContent[] {
  if (node.name === 'br') return [{ type: 'hardBreak' }];
  if (node.name === '*') return renderText(node.rawOpen, context.marks);

  if (IMAGE_TAGS.has(node.name)) {
    if (node.name === 'eicon') {
      return [{
        type: 'eicon',
        attrs: { name: plainText(node.children).trim() },
      }];
    }

    const isIcon = node.name === 'icon';
    const placeholderKind = isIcon ? 'icon' : 'inline';
    return [{
      type: 'image',
      attrs: {
        src: isIcon ? REPLACE_ME_ICON_SRC : REPLACE_ME_IMAGE_SRC,
        alt: 'REPLACE ME',
        title: imageTitle(node),
        align: context.align ?? 'left',
        placeholderKind,
        width: isIcon ? 50 : null,
        height: isIcon ? 50 : null,
      },
    }];
  }

  if (MARK_TAGS.has(node.name)) {
    const mark = markFor(node);
    if (mark) {
      return renderInline(node.children, {
        ...context,
        marks: addMark(context.marks, mark),
      });
    }
  }

  context.unsupportedTags.add(node.name);
  return [
    ...renderText(node.rawOpen, context.marks),
    ...renderInline(node.children, context),
    ...(node.rawClose ? renderText(node.rawClose, context.marks) : []),
  ];
}

function renderInline(nodes: BBCodeNode[], context: RenderContext): JSONContent[] {
  const content: JSONContent[] = [];
  for (const node of nodes) {
    if (node.type === 'text') content.push(...renderText(node.value, context.marks));
    else content.push(...renderInlineNode(node, context));
  }
  return content;
}

function renderText(value: string, marks: Mark[]): JSONContent[] {
  if (!value) return [];

  const content: JSONContent[] = [];
  const lines = value.split('\n');
  lines.forEach((line, index) => {
    if (line) content.push({ type: 'text', text: line, marks: marks.length ? marks : undefined });
    if (index < lines.length - 1) content.push({ type: 'hardBreak' });
  });
  return content;
}

function markFor(node: TagNode): Mark | null {
  switch (node.name) {
    case 'b': return { type: 'bold' };
    case 'i': return { type: 'italic' };
    case 'u': return { type: 'underline' };
    case 's':
    case 'strike': return { type: 'strike' };
    case 'sub': return { type: 'subscript' };
    case 'sup': return { type: 'superscript' };
    case 'code': return { type: 'code' };
    case 'big': return { type: 'textStyle', attrs: { fontSize: '1.25em' } };
    case 'small': return { type: 'textStyle', attrs: { fontSize: '0.875em' } };
    case 'color': {
      const color = safeColor(node.attribute);
      return color ? { type: 'textStyle', attrs: { color } } : null;
    }
    case 'url': {
      const href = safeHref(node.attribute || plainText(node.children));
      return href ? { type: 'link', attrs: { href } } : null;
    }
    default: return null;
  }
}

function addMark(marks: Mark[], mark: Mark): Mark[] {
  const existingIndex = marks.findIndex(item => item.type === mark.type);
  if (existingIndex === -1) return [...marks, mark];

  if (mark.type !== 'textStyle') return marks;

  const next = [...marks];
  next[existingIndex] = {
    type: 'textStyle',
    attrs: {
      ...marks[existingIndex].attrs,
      ...mark.attrs,
    },
  };
  return next;
}

function paragraph(
  content: JSONContent[],
  align: RenderContext['align'],
): JSONContent {
  return {
    type: 'paragraph',
    attrs: align ? { textAlign: align } : undefined,
    content: content.length ? content : undefined,
  };
}

function ensureBlockContent(content: JSONContent[]): JSONContent[] {
  return content.length ? content : [{ type: 'paragraph' }];
}

function containsBlock(nodes: BBCodeNode[]): boolean {
  return nodes.some(node => node.type === 'tag' && (
    BLOCK_TAGS.has(node.name)
    || node.name === 'hr'
    || containsBlock(node.children)
  ));
}

function flattenIndent(node: TagNode): { depth: number; children: BBCodeNode[] } {
  let depth = 1;
  let children = node.children;

  while (children.length === 1) {
    const child = children[0];
    if (child.type !== 'tag' || child.name !== 'indent') break;
    depth += 1;
    children = child.children;
  }

  return { depth, children };
}

function splitListItems(nodes: BBCodeNode[]): BBCodeNode[][] {
  const items: BBCodeNode[][] = [];
  let current: BBCodeNode[] | null = null;

  for (const node of nodes) {
    if (node.type === 'tag' && node.name === '*') {
      if (current) items.push(current);
      current = [];
    } else if (current) {
      current.push(node);
    }
  }

  if (current) items.push(current);
  if (items.length === 0 && nodes.some(node => !isWhitespace(node))) return [nodes];
  return items;
}

function trimBoundaryLineBreaks(nodes: BBCodeNode[]): BBCodeNode[] {
  const cloned = nodes.map(node => node.type === 'text' ? { ...node } : node);
  const first = cloned[0];
  const last = cloned[cloned.length - 1];

  if (first?.type === 'text') first.value = first.value.replace(/^[ \t]*\n/, '');
  if (last?.type === 'text') last.value = last.value.replace(/\n[ \t]*$/, '');
  return cloned.filter(node => node.type !== 'text' || node.value !== '');
}

function trimOneLeadingLineBreak(value: string): string {
  return value.replace(/^[ \t]*\n/, '');
}

function trimOneTrailingLineBreak(content: JSONContent[]): void {
  if (content.at(-1)?.type === 'hardBreak') content.pop();
}

function isWhitespace(node: BBCodeNode): boolean {
  return node.type === 'text' && /^\s*$/.test(node.value);
}

function safeColor(attribute: string | null): string | null {
  const color = cleanAttribute(attribute).toLowerCase();
  const fListColor = getFListColorValue(color);
  if (fListColor) return fListColor;
  if (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(color)) return color;
  if (/^[a-z]{3,20}$/i.test(color)) return color;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(color)) {
    return color;
  }
  return null;
}

function safeHref(value: string): string | null {
  const href = cleanAttribute(value);
  if (/^(?:https?:\/\/|mailto:)[^\s]+$/i.test(href)) return href;
  return null;
}

function cleanAttribute(value: string | null): string {
  const cleaned = value?.trim() ?? '';
  if (cleaned.length >= 2) {
    const first = cleaned[0];
    const last = cleaned[cleaned.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return cleaned.slice(1, -1);
    }
  }
  return cleaned;
}

function plainText(nodes: BBCodeNode[]): string {
  return nodes.map(node => node.type === 'text' ? node.value : plainText(node.children)).join('');
}

function imageTitle(node: TagNode): string {
  const identity = cleanAttribute(node.attribute) || plainText(node.children).trim();
  if (node.name === 'img') return identity ? `Inline image ${identity}` : 'Inline image';
  if (node.name === 'icon') return identity ? `Character image ${identity}` : 'Character image';
  return identity ? `Eicon ${identity}` : 'Eicon';
}
