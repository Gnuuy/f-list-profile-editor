import type { JSONContent } from '@tiptap/core';

import { getFListColorValue } from './FListColors';
import { F_LIST_BIG_FONT_SIZE, F_LIST_SMALL_FONT_SIZE } from './FListTypography';
import {
  REPLACE_ME_ICON_SRC,
  REPLACE_ME_IMAGE_SRC,
} from './ImagePlaceholders';
import { characterAvatarUrl } from './FListProfile';
import type { FListInlineAsset } from './FListProfile';

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
  inlineAssets: Record<string, FListInlineAsset>;
  marks: Mark[];
  unsupportedTags: Set<string>;
  /** Tags F-list allows here, or null when every tag is allowed. */
  allowedTags: ReadonlySet<string> | null;
};

export type BBCodeImportAssets = {
  inlines?: Record<string, FListInlineAsset>;
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

// Child tags F-list allows inside these tags (github.com/f-list/exported,
// bbcode/core.ts and bbcode/standard.ts). Restrictions add up through nesting,
// and a tag used where it isn't allowed is shown as literal text.
const INLINE_FORMATTING_CHILDREN = new Set(['url', 'i', 'u', 'b', 'color', 's']);
const SCRIPT_CHILDREN = new Set(['b', 'i', 'u', 's', 'color']);
const F_LIST_ALLOWED_CHILDREN: Record<string, ReadonlySet<string>> = {
  big: INLINE_FORMATTING_CHILDREN,
  small: INLINE_FORMATTING_CHILDREN,
  sub: SCRIPT_CHILDREN,
  sup: SCRIPT_CHILDREN,
};
const F_LIST_BREAKABLE_BLOCK_TYPES = new Set([
  'blockquote',
  'bulletList',
  'collapsible',
  'horizontalRule',
  'indentedBlock',
  'orderedList',
  'paragraph',
]);
const SUPPORTED_TAGS = new Set([
  ...SELF_CLOSING_TAGS,
  ...BLOCK_TAGS,
  ...MARK_TAGS,
  ...IMAGE_TAGS,
]);

export function importBBCode(
  source: string,
  assets: BBCodeImportAssets = {},
): BBCodeImportResult {
  const unsupportedTags = new Set<string>();
  const nodes = parseBBCode(source.replace(/\r\n?/g, '\n'));
  const content = normalizeImportedIndent(renderBlocks(nodes, {
    align: null,
    inlineAssets: assets.inlines ?? {},
    marks: [],
    unsupportedTags,
    allowedTags: null,
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
      const pieces = normalizeImportedIndent(block.content ?? [], inheritedIndent + indent);
      // A newline after the original [/indent] now follows its last piece.
      // It only adds one: the piece may already end with its own newline.
      const last = pieces.at(-1);
      if (block.attrs?.fListBreakAfter === true && last && F_LIST_BREAKABLE_BLOCK_TYPES.has(last.type ?? '')) {
        last.attrs = { ...last.attrs, fListBreakAfter: true };
      }
      normalized.push(...pieces);
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
      // Bracketed prose such as "[REDACTED]" is common in F-list profiles.
      // An unknown token can only be BBCode when a matching closing token
      // exists; otherwise treating it as an open container swallows every
      // supported tag that follows it into one unsupported raw fragment.
      if (!SUPPORTED_TAGS.has(name)
        && !hasClosingTag(source, name, index + raw.length)) {
        currentChildren(stack).push({ type: 'text', value: raw });
        cursor = index + raw.length;
        continue;
      }

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

function hasClosingTag(source: string, name: string, from: number): boolean {
  return source.toLowerCase().indexOf(`[/${name}]`, from) !== -1;
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
  const activeContext = context;

  const flushInline = (
    fListBreakAfter?: boolean,
    preserveEmptyLine = false,
  ) => {
    if (inline.length === 0 && !preserveEmptyLine) return;
    blocks.push(paragraph(inline, activeContext.align, fListBreakAfter));
    inline = [];
  };

  // The newline before a nested block only ends the line above it. After an
  // inline image, whose div already ended the line, F-list shows it as a
  // blank line, so it becomes an empty line here.
  const flushBeforeBlock = () => {
    const hadInlineContent = inline.length > 0;
    const breakBeforeBlock = trimOneTrailingLineBreak(inline);
    if (breakBeforeBlock && endsWithInlineImage(inline)) {
      flushInline(false);
      flushInline(!activeContext.align, true);
      return;
    }
    flushInline(activeContext.align ? false : breakBeforeBlock, hadInlineContent && breakBeforeBlock);
  };

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];

    if (node.type === 'text') {
      let value = node.value;
      if (followsBlock) {
        const leadingLineBreak = value.match(/^[ \t]*\n/);
        if (leadingLineBreak) {
          markLastFListBreak(blocks, true);
          value = value.slice(leadingLineBreak[0].length);
        }
      }
      followsBlock = false;
      inline.push(...renderText(value, activeContext.marks));
      continue;
    }

    if (
      MARK_TAGS.has(node.name)
      && node.name !== 'url'
      && !F_LIST_ALLOWED_CHILDREN[node.name]
      && containsBlock(node.children)
    ) {
      flushBeforeBlock();
      const mark = markFor(node);
      if (mark) {
        blocks.push(...renderBlocks(node.children, {
          ...activeContext,
          marks: addMark(activeContext.marks, mark),
        }));
      } else {
        blocks.push(...renderUnsupportedBlock(node, activeContext));
      }
      markLastFListBreak(blocks, false);
      followsBlock = true;
      continue;
    }

    if (BLOCK_TAGS.has(node.name) || node.name === 'hr') {
      flushBeforeBlock();
      blocks.push(...renderBlockTag(node, activeContext));
      markLastFListBreak(blocks, false);
      followsBlock = true;
      continue;
    }

    inline.push(...renderInlineNode(node, activeContext));
    followsBlock = false;
  }

  // Line breaks after a block (or filling a block on their own) each show as
  // an empty line on F-list. An empty line accounts for one of them.
  if (inline.length > 0 && inline.every(node => node.type === 'hardBreak')) {
    inline.pop();
    flushInline(undefined, true);
    return blocks;
  }

  // A trailing <br> at the end of an HTML block does not create another
  // visible line. Keeping it as a final ProseMirror hardBreak would make the
  // editor render two breaks because ProseMirror adds its own caret sentinel.
  // After an inline image it is a blank line of its own, as before a block.
  if (trimOneTrailingLineBreak(inline) && endsWithInlineImage(inline)) {
    flushInline(false);
    flushInline(undefined, true);
    return blocks;
  }
  flushInline();
  return blocks;
}

/**
 * A [color] around a dropdown or quote colours it as a whole on F-list, and
 * each theme decides what that means for the block (the default theme keeps
 * quotes grey, for one). The block keeps the colour instead of its text.
 */
function takeInheritedColour(context: RenderContext): { colour: string | null; marks: Mark[] } {
  const colour = context.marks.find(mark => (
    mark.type === 'textStyle' && typeof mark.attrs?.color === 'string'
  ))?.attrs?.color as string | undefined;
  const marks = context.marks.flatMap(mark => {
    if (mark.type !== 'textStyle' || !mark.attrs?.color) return [mark];
    const remaining = { ...mark.attrs };
    delete remaining.color;
    return Object.keys(remaining).length > 0
      ? [{ ...mark, attrs: remaining }]
      : [];
  });
  return { colour: colour ?? null, marks };
}

function markLastFListBreak(blocks: JSONContent[], value: boolean): void {
  const block = blocks.at(-1);
  if (!block || !F_LIST_BREAKABLE_BLOCK_TYPES.has(block.type ?? '')) return;

  block.attrs = {
    ...block.attrs,
    fListBreakAfter: value,
  };
}

function renderBlockTag(node: TagNode, context: RenderContext): JSONContent[] {
  switch (node.name) {
    case 'left':
    case 'center':
    case 'right':
    case 'justify':
      return renderBlocks(node.children, { ...context, align: node.name });

    case 'quote': {
      const { colour, marks } = takeInheritedColour(context);
      return [{
        type: 'blockquote',
        attrs: { indent: 0, color: colour },
        content: ensureBlockContent(renderBlocks(node.children, { ...context, marks })),
      }];
    }

    case 'collapse': {
      const { colour, marks } = takeInheritedColour(context);
      return [{
        type: 'collapsible',
        attrs: {
          title: cleanAttribute(node.attribute) || 'Details',
          indent: 0,
          collapsed: false,
          joinNext: node.joinNext,
          textAlign: context.align,
          color: colour,
        },
        content: ensureBlockContent(renderBlocks(
          trimBoundaryLineBreaks(node.children),
          { ...context, align: null, marks },
        )),
      }];
    }

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

function isAllowedHere(name: string, context: RenderContext): boolean {
  return context.allowedTags === null || context.allowedTags.has(name);
}

/** The context for a tag's content: its own allowed children narrow the parent's. */
function withTagRules(name: string, context: RenderContext): RenderContext {
  const own = F_LIST_ALLOWED_CHILDREN[name];
  if (!own) return context;
  const parent = context.allowedTags;
  return {
    ...context,
    allowedTags: parent ? new Set([...own].filter(tag => parent.has(tag))) : own,
  };
}

/** The exact source text of these nodes, e.g. the raw content of a [url]. */
function rawSource(nodes: BBCodeNode[]): string {
  return nodes.map(node => (
    node.type === 'text'
      ? node.value
      : `${node.rawOpen}${rawSource(node.children)}${node.rawClose ?? ''}`
  )).join('');
}

function renderInlineNode(node: TagNode, context: RenderContext): JSONContent[] {
  if (node.name === 'br') return [{ type: 'hardBreak' }];

  // F-list prints a tag that isn't allowed here as text, but still formats its
  // content (under this tag's own restrictions too).
  if (!isAllowedHere(node.name, context)) {
    return [
      ...renderText(node.rawOpen, context.marks),
      ...renderInline(node.children, withTagRules(node.name, context)),
      ...(node.rawClose ? renderText(node.rawClose, context.marks) : []),
    ];
  }

  if (node.name === '*') return renderText(node.rawOpen, context.marks);

  if (IMAGE_TAGS.has(node.name)) {
    if (node.name === 'eicon') {
      return [{
        type: 'eicon',
        attrs: { name: plainText(node.children).trim() },
        marks: inlineNodeMarks(context.marks),
      }];
    }

    const isIcon = node.name === 'icon';
    const value = isIcon
      ? plainText(node.children).trim()
      : cleanAttribute(node.attribute);
    const label = plainText(node.children).trim();
    const inlineAsset = !isIcon && /^\d+$/.test(value)
      ? context.inlineAssets[value]
      : undefined;
    const resolvedSource = isIcon
      ? characterAvatarUrl(value)
      : inlineAsset?.url;
    const placeholderKind = isIcon ? 'icon' : 'inline';
    return [{
      type: 'image',
      attrs: {
        src: resolvedSource
          ?? (isIcon ? REPLACE_ME_ICON_SRC : REPLACE_ME_IMAGE_SRC),
        alt: resolvedSource ? (label || value) : 'REPLACE ME',
        title: imageTitle(node),
        align: context.align ?? 'left',
        placeholderKind,
        width: isIcon ? 50 : null,
        height: isIcon ? 50 : null,
        bbcodeTag: resolvedSource ? node.name : null,
        bbcodeValue: resolvedSource ? value : null,
        bbcodeLabel: resolvedSource && !isIcon ? label : null,
      },
      marks: inlineNodeMarks(context.marks),
    }];
  }

  if (MARK_TAGS.has(node.name)) {
    const mark = markFor(node);
    // [url] content is plain text on F-list: tags inside it show literally.
    if (mark && node.name === 'url') {
      return renderText(rawSource(node.children), addMark(context.marks, mark));
    }
    if (mark) {
      return renderInline(node.children, {
        ...withTagRules(node.name, context),
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

function inlineNodeMarks(marks: Mark[]): Mark[] | undefined {
  const supported = marks.filter(mark => mark.type === 'inlineTextAlign');
  return supported.length > 0 ? supported : undefined;
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
    case 'big': return { type: 'textStyle', attrs: { fontSize: F_LIST_BIG_FONT_SIZE } };
    case 'small': return { type: 'textStyle', attrs: { fontSize: F_LIST_SMALL_FONT_SIZE } };
    case 'color': {
      const color = safeColor(node.attribute);
      return color ? { type: 'textStyle', attrs: { color } } : null;
    }
    case 'url': {
      const href = safeHref(node.attribute || rawSource(node.children));
      return href ? { type: 'link', attrs: { href } } : null;
    }
    default: return null;
  }
}

function addMark(marks: Mark[], mark: Mark): Mark[] {
  const isScript = mark.type === 'subscript' || mark.type === 'superscript';
  const isSize = mark.type === 'textStyle' && Boolean(mark.attrs?.fontSize);
  const isLink = mark.type === 'link';
  let next = marks;

  if (isScript) {
    next = marks.flatMap(item => {
      if (item.type === 'subscript' || item.type === 'superscript' || item.type === 'link') return [];
      if (item.type !== 'textStyle' || !item.attrs?.fontSize) return [item];

      const attrs = { ...item.attrs };
      delete attrs.fontSize;
      return Object.values(attrs).some(value => value !== null && value !== undefined && value !== '')
        ? [{ type: 'textStyle', attrs }]
        : [];
    });
  } else if (isSize) {
    next = marks.filter(item => item.type !== 'subscript' && item.type !== 'superscript');
  } else if (isLink) {
    next = marks.filter(item => item.type !== 'subscript' && item.type !== 'superscript');
  }

  const existingIndex = next.findIndex(item => item.type === mark.type);
  if (existingIndex === -1) return [...next, mark];

  if (mark.type !== 'textStyle' && mark.type !== 'inlineTextAlign') return next;

  const merged = [...next];
  merged[existingIndex] = {
    type: mark.type,
    attrs: {
      ...next[existingIndex].attrs,
      ...mark.attrs,
    },
  };
  return merged;
}

function paragraph(
  content: JSONContent[],
  align: RenderContext['align'],
  fListBreakAfter?: boolean,
): JSONContent {
  const attrs = {
    ...(align ? { textAlign: align } : {}),
    ...(typeof fListBreakAfter === 'boolean' ? { fListBreakAfter } : {}),
  };

  return {
    type: 'paragraph',
    attrs: Object.keys(attrs).length > 0 ? attrs : undefined,
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

/** F-list puts each inline image in its own div, which ends its line. */
function endsWithInlineImage(content: JSONContent[]): boolean {
  const last = content.at(-1);
  return last?.type === 'image' && last.attrs?.placeholderKind === 'inline';
}

function trimOneTrailingLineBreak(content: JSONContent[]): boolean {
  if (content.at(-1)?.type !== 'hardBreak') return false;
  content.pop();
  return true;
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
