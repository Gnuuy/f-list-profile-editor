import type { Node as PMNode, Mark as PMMark } from '@tiptap/pm/model';

import { normalizeEiconName } from '../models/Eicon';
import { F_LIST_COLORS, F_LIST_COLOR_NAMES } from '../models/FListColors';
import { F_LIST_BIG_FONT_SIZE, F_LIST_SMALL_FONT_SIZE } from '../models/FListTypography';

const INLINE_IMAGE_PLACEHOLDER = '[big][color=red]REPLACE ME WITH YOUR INLINE[/color][/big]';
const EICON_PLACEHOLDER = '[big][color=red]REPLACE ME WITH YOUR EICON[/color][/big]';

type MarkTok =
  | { t: 'align'; v: string }
  | { t: 'url'; v: string }
  | { t: 'color'; v: string }
  | { t: 'big' }
  | { t: 'small' }
  | { t: 'b' }
  | { t: 'i' }
  | { t: 'u' }
  | { t: 's' }
  | { t: 'code' }
  | { t: 'sub' }
  | { t: 'sup' };

// Outermost first. F-list reads [url] content as plain text, so any tag
// inside it would show up literally; [url] therefore always goes innermost.
const MARK_ORDER: MarkTok['t'][] = [
  'align', 'color', 'big', 'small', 'b', 'i', 'u', 's', 'code', 'sub', 'sup', 'url',
];

function marksToTokens(marks: ReadonlyArray<PMMark>): MarkTok[] {
  const out: MarkTok[] = [];
  for (const m of marks ?? []) {
    switch (m.type.name) {
      case 'inlineTextAlign': {
        const alignment = String(m.attrs?.alignment ?? '');
        if (['left', 'center', 'right', 'justify'].includes(alignment)) {
          out.push({ t: 'align', v: alignment });
        }
        break;
      }
      case 'textStyle': {
        const raw = (m.attrs?.color ?? '') as string;
        if (raw) out.push({ t: 'color', v: normalizeColor(raw) });
        const fontSize = (m.attrs?.fontSize ?? '') as string;
        if (fontSize === F_LIST_BIG_FONT_SIZE) out.push({ t: 'big' });
        if (fontSize === F_LIST_SMALL_FONT_SIZE) out.push({ t: 'small' });
        break;
      }
      case 'link': {
        const href = (m.attrs?.href ?? '') as string;
        if (href) out.push({ t: 'url', v: href });
        break;
      }
      case 'bold': out.push({ t: 'b' }); break;
      case 'italic': out.push({ t: 'i' }); break;
      case 'underline': out.push({ t: 'u' }); break;
      case 'strike': out.push({ t: 's' }); break;
      case 'code': out.push({ t: 'code' }); break;
      case 'subscript': out.push({ t: 'sub' }); break;
      case 'superscript': out.push({ t: 'sup' }); break;
      default: break;
    }
  }
  out.sort((a, b) => MARK_ORDER.indexOf(a.t) - MARK_ORDER.indexOf(b.t));
  return out;
}

function tokEq(a: MarkTok, b: MarkTok): boolean {
  if (a.t !== b.t) return false;
  if (a.t === 'color' && b.t === 'color') {
    return a.v.toLowerCase() === b.v.toLowerCase();
  }
  if (a.t === 'url' && b.t === 'url') return a.v === b.v;
  if (a.t === 'align' && b.t === 'align') return a.v === b.v;
  return true;
}
function openTok(t: MarkTok): string {
  switch (t.t) {
    case 'align': return `[${t.v}]`;
    case 'url': return `[url=${t.v}]`;
    case 'color': return `[color=${t.v}]`;
    case 'big': return '[big]';
    case 'small': return '[small]';
    case 'b': return '[b]';
    case 'i': return '[i]';
    case 'u': return '[u]';
    case 's': return '[s]';
    case 'code': return '[code]';
    case 'sub': return '[sub]';
    case 'sup': return '[sup]';
  }
}
function closeTok(t: MarkTok): string {
  switch (t.t) {
    case 'align': return `[/${t.v}]`;
    case 'url': return '[/url]';
    case 'color': return '[/color]';
    case 'big': return '[/big]';
    case 'small': return '[/small]';
    case 'b': return '[/b]';
    case 'i': return '[/i]';
    case 'u': return '[/u]';
    case 's': return '[/s]';
    case 'code': return '[/code]';
    case 'sub': return '[/sub]';
    case 'sup': return '[/sup]';
  }
}

function normalizeColor(input: string): string {
  const v = input.trim().toLowerCase();
  if (v === 'grey') return 'gray';
  if ((F_LIST_COLOR_NAMES as readonly string[]).includes(v)) return v;
  if (v.startsWith('#')) {
    const hex = canonicalHex(v);
    for (const name of F_LIST_COLOR_NAMES) {
      if (F_LIST_COLORS[name] === hex) return name;
    }
    return hex;
  }
  if (v.startsWith('rgb')) {
    const rgb = parseRgb(v);
    if (rgb) {
      const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
      for (const name of F_LIST_COLOR_NAMES) {
        if (F_LIST_COLORS[name] === hex) return name;
      }
      const nearest = nearestPaletteName(rgb[0], rgb[1], rgb[2]);
      return nearest;
    }
  }
  return input;
}

function canonicalHex(h: string): string {
  let s = h.toLowerCase();
  if (s.length === 4 && s[0] === '#') {
    s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  }
  return s;
}
function parseRgb(s: string): [number, number, number] | null {
  const m = s.match(/rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,[^)]+)?\)/i);
  if (!m) return null;
  const r = clamp255(+m[1]), g = clamp255(+m[2]), b = clamp255(+m[3]);
  return [r, g, b];
}
function clamp255(n: number) { return Math.max(0, Math.min(255, Math.round(n))); }
function rgbToHex(r: number, g: number, b: number): string {
  const to2 = (x: number) => x.toString(16).padStart(2, '0');
  return '#' + to2(r) + to2(g) + to2(b);
}
function nearestPaletteName(r: number, g: number, b: number): string {
  let best = 'red', bestD = Infinity;
  for (const name of F_LIST_COLOR_NAMES) {
    const hex = F_LIST_COLORS[name];
    const rr = parseInt(hex.slice(1, 3), 16);
    const gg = parseInt(hex.slice(3, 5), 16);
    const bb = parseInt(hex.slice(5, 7), 16);
    const d = (r - rr) ** 2 + (g - gg) ** 2 + (b - bb) ** 2;
    if (d < bestD) { bestD = d; best = name; }
  }
  return best;
}

function wrapIndent(s: string, n: number): string {
  if (!n || n < 0) return s;
  const open = '[indent]'.repeat(n);
  const close = '[/indent]'.repeat(n);
  return open + s + close;
}
function wrapAlign(s: string, align?: string | null): string {
  switch (align) {
    case 'left': return `[left]${s}[/left]`;
    case 'center': return `[center]${s}[/center]`;
    case 'right': return `[right]${s}[/right]`;
    case 'justify': return `[justify]${s}[/justify]`;
    default: return s;
  }
}

function wrapColor(s: string, color?: string | null): string {
  return color ? `[color=${normalizeColor(color)}]${s}[/color]` : s;
}

function imageBBCode(node: PMNode): string {
  const tag = String(node.attrs?.bbcodeTag ?? '');
  const value = String(node.attrs?.bbcodeValue ?? '').trim();
  if (tag === 'icon' && /^[a-z0-9_ -]{1,64}$/i.test(value)) {
    return `[icon]${value}[/icon]`;
  }
  if (tag === 'img' && /^\d+$/.test(value)) {
    const rawLabel = String(node.attrs?.bbcodeLabel ?? '').trim();
    const label = rawLabel && !/[\[\]\r\n]/.test(rawLabel) ? rawLabel : 'inline';
    return `[img=${value}]${label}[/img]`;
  }

  return node.attrs?.placeholderKind === 'eicon'
    ? EICON_PLACEHOLDER
    : INLINE_IMAGE_PLACEHOLDER;
}

/**
 * F-list doesn't show the last line break before a block ends, while the
 * editor shows an empty line, or a line's trailing break, as a visible line.
 * One extra newline keeps the same number of lines when such a line is closed.
 */
function absorbedBreak(node: PMNode): string {
  if (!node.isTextblock) return '';
  return node.childCount === 0 || node.lastChild?.type.name === 'hardBreak' ? '\n' : '';
}

/** F-list puts each inline image in its own div, which ends its line. */
function endsWithInlineImage(node: PMNode): boolean {
  const last = node.lastChild;
  return last?.type.name === 'image' && last.attrs?.placeholderKind === 'inline';
}

/**
 * Whether the newline after a container's last block is a visible line that
 * must stay, rather than a generated separator before the closing tag. A
 * container's only, empty line is the one every dropdown and quote needs.
 */
function keepsFinalNewline(last: PMNode | null, childCount: number): boolean {
  if (!last) return false;
  if (last.isTextblock && !last.attrs?.textAlign) {
    // A plain line's own newline just before the closing tag wouldn't show.
    if (last.childCount === 0) return childCount > 1;
    return last.lastChild?.type.name === 'hardBreak';
  }
  return last.attrs?.fListBreakAfter === true;
}

function eiconBBCode(node: PMNode): string {
  const name = String(node.attrs?.name ?? '').trim();
  // Validated like any eicon, but written with its original capitals.
  return normalizeEiconName(name) ? `[eicon]${name}[/eicon]` : EICON_PLACEHOLDER;
}

export function toBBCode(doc: PMNode): string {
  const out: string[] = [];
  let open: MarkTok[] = [];

  const flushCloseAll = () => { for (let i = open.length - 1; i >= 0; i--) out.push(closeTok(open[i])); open = []; };
  const switchTo = (next: MarkTok[]) => {
    let keep = 0;
    while (keep < open.length && keep < next.length && tokEq(open[keep], next[keep])) keep++;
    for (let i = open.length - 1; i >= 0; i--) if (i >= keep) out.push(closeTok(open[i]));
    for (let i = keep; i < next.length; i++) out.push(openTok(next[i]));
    open = next.slice();
  };
  const emitText = (text: string) => { if (text) out.push(text); };
  const isParagraph = (node: PMNode | null, aligned: boolean) => (
    node?.type.name === 'paragraph' && Boolean(node.attrs?.textAlign) === aligned
  );
  const blockBreak = (node: PMNode, nextSibling: PMNode | null = null) => {
    // The image's own div already ends the line; a newline would add a blank one.
    if (isParagraph(node, false) && endsWithInlineImage(node)) return '';
    const breakAfter = node.attrs?.fListBreakAfter;
    if (breakAfter === false) {
      // `false` means the next tag touched this block. Two plain-text lines
      // still need a real newline, or F-list would join them into one line,
      // and an empty line is nothing but its newline.
      const plain = isParagraph(node, false);
      return plain && (node.childCount === 0 || isParagraph(nextSibling, false)) ? '\n' : '';
    }
    // Alignment tags are display:block on F-list, so a newline after one adds
    // a visible blank line. Lines made in the editor (null) show no gap there,
    // so don't add one; imported lines keep their recorded true/false.
    if (breakAfter == null && isParagraph(node, true)) return '';
    return '\n';
  };

  const emitInlineFrom = (node: PMNode) => {
    node.forEach((child, _offset, index) => {
      if (child.isText) {
        switchTo(marksToTokens(child.marks));
        emitText(child.text || '');
        return;
      }
      if (child.type.name === 'hardBreak') {
        const next = index + 1 < node.childCount ? marksToTokens(node.child(index + 1).marks) : [];
        let keep = 0;
        while (keep < open.length && keep < next.length && tokEq(open[keep], next[keep])) keep++;
        switchTo(open.slice(0, keep));
        out.push('\n');
        return;
      }
      if (child.type.name === 'eicon') {
        switchTo(marksToTokens(child.marks));
        out.push(eiconBBCode(child));
        return;
      }
      if (child.type.name === 'image') {
        switchTo(marksToTokens(child.marks));
        out.push(imageBBCode(child));
        return;
      }
      if (child.isInline) {
        switchTo(marksToTokens(child.marks));
        emitInlineFrom(child);
        return;
      }
      flushCloseAll();
      emitNode(child);
    });
  };

  const emitParagraph = (node: PMNode, nextSibling: PMNode | null = null) => {
    const align = node.attrs?.textAlign as string | undefined;
    if (align) {
      const savedOpen = open.slice();
      flushCloseAll();
      const para = serializeParagraphInlineAlone(node) + absorbedBreak(node);
      out.push(wrapAlign(para, align), blockBreak(node, nextSibling));
      for (const t of savedOpen) out.push(openTok(t));
      open = savedOpen.slice();
      return;
    }
    emitInlineFrom(node);
    flushCloseAll();
    out.push(blockBreak(node, nextSibling));
  };

  const emitNode = (node: PMNode, nextSibling: PMNode | null = null) => {
    switch (node.type.name) {
      case 'doc': emitChildren(node); break;
      case 'paragraph': emitParagraph(node, nextSibling); break;

      case 'blockquote': {
        flushCloseAll();
        const inner = serializeContainerLocally(node);
        const quote = wrapColor(`[quote]${inner}[/quote]`, node.attrs?.color as string | undefined);
        const quoted = `${quote}${blockBreak(node)}`;
        const indent = Number(node.attrs?.indent ?? 0) || 0;
        out.push(wrapIndent(quoted, indent));
        break;
      }

      case 'collapsible': {
        flushCloseAll();
        const title = (node.attrs?.title || 'Details').toString();
        const inner = serializeContainerLocally(node, {
          preserveTrailingWhitespaceParagraph: true,
          closeOnLastContentLine: true,
          boundaryLineBreaks: true,
        });
        const joinsAdjacentCollapse = node.attrs?.joinNext === true
          && nextSibling?.type.name === 'collapsible';
        const collapse = `[collapse=${title}]${inner}[/collapse]`;
        const aligned = wrapAlign(collapse, node.attrs?.textAlign as string | undefined);
        const styled = wrapColor(aligned, node.attrs?.color as string | undefined);
        // An imported dropdown directly followed by a block had no newline there.
        const separator = joinsAdjacentCollapse || node.attrs?.fListBreakAfter === false ? '' : '\n';
        const bb = `${styled}${separator}`;
        const indent = Number(node.attrs?.indent ?? 0) || 0;
        out.push(wrapIndent(bb, indent));
        break;
      }

      case 'indentedBlock': {
        flushCloseAll();
        const inner = serializeContainerLocally(node, { closeOnLastContentLine: true });
        const indent = Math.max(1, Number(node.attrs?.indent ?? 1) || 1);
        // Only a recorded newline follows [/indent]; F-list shows it as a blank line.
        out.push(wrapIndent(inner, indent), node.attrs?.fListBreakAfter === true ? '\n' : '');
        break;
      }

      case 'horizontalRule':
        flushCloseAll();
        out.push(`[hr]${blockBreak(node)}`);
        break;

      case 'heading':
        emitParagraph(node);
        break;

      case 'bulletList': {
        flushCloseAll();
        let acc = '';
        node.forEach(li => {
          let line = '';
          li.forEach(p => { line += serializeInlineOnly(p) + '\n'; });
          acc += `[*]${line}`;
        });
        out.push(`[list]\n${acc}[/list]${blockBreak(node)}`);
        break;
      }
      case 'orderedList': {
        flushCloseAll();
        let acc = '';
        node.forEach(li => {
          let line = '';
          li.forEach(p => { line += serializeInlineOnly(p) + '\n'; });
          acc += `[*]${line}`;
        });
        out.push(`[list=1]\n${acc}[/list]${blockBreak(node)}`);
        break;
      }

      case 'image':
        flushCloseAll();
        out.push(imageBBCode(node) + '\n');
        break;

      case 'eicon':
        flushCloseAll();
        out.push(eiconBBCode(node));
        break;

      default:
        emitChildren(node);
        break;
    }
  };

  const emitChildren = (parent: PMNode) => {
    parent.forEach((child, _offset, index) => {
      const nextSibling = index + 1 < parent.childCount
        ? parent.child(index + 1)
        : null;
      emitNode(child, nextSibling);
    });
  };

  const serializeInlineOnly = (block: PMNode): string => {
    return serializeParagraphInlineAlone(block);
  };

  const serializeParagraphInlineAlone = (para: PMNode): string => {
    const buf: string[] = [];
    let localOpen: MarkTok[] = [];
    const localFlush = () => { for (let i = localOpen.length - 1; i >= 0; i--) buf.push(closeTok(localOpen[i])); localOpen = []; };
    const localSwitch = (next: MarkTok[]) => {
      let keep = 0;
      while (keep < localOpen.length && keep < next.length && tokEq(localOpen[keep], next[keep])) keep++;
      for (let i = localOpen.length - 1; i >= 0; i--) if (i >= keep) buf.push(closeTok(localOpen[i]));
      for (let i = keep; i < next.length; i++) buf.push(openTok(next[i]));
      localOpen = next.slice();
    };

    const localBreak = (next: MarkTok[]) => {
      let keep = 0;
      while (keep < localOpen.length && keep < next.length && tokEq(localOpen[keep], next[keep])) keep++;
      localSwitch(localOpen.slice(0, keep));
      buf.push('\n');
    };

    para.forEach((child, _offset, index) => {
      if (child.isText) { localSwitch(marksToTokens(child.marks)); buf.push(child.text || ''); return; }
      if (child.type.name === 'hardBreak') {
        const next = index + 1 < para.childCount ? marksToTokens(para.child(index + 1).marks) : [];
        localBreak(next);
        return;
      }
      if (child.type.name === 'eicon') {
        localSwitch(marksToTokens(child.marks));
        buf.push(eiconBBCode(child));
        return;
      }
      if (child.type.name === 'image') {
        localSwitch(marksToTokens(child.marks));
        buf.push(imageBBCode(child));
        return;
      }
      if (child.isInline) {
        localSwitch(marksToTokens(child.marks));
        child.forEach((grand, _grandOffset, grandIndex) => {
          if (grand.isText) { localSwitch(marksToTokens(grand.marks)); buf.push(grand.text || ''); }
          else if (grand.type.name === 'hardBreak') {
            const next = grandIndex + 1 < child.childCount
              ? marksToTokens(child.child(grandIndex + 1).marks)
              : [];
            localBreak(next);
          }
          else if (grand.type.name === 'eicon') buf.push(eiconBBCode(grand));
          else if (grand.type.name === 'image') buf.push(imageBBCode(grand));
        });
        return;
      }
      localFlush();
    });

    localFlush();
    return buf.join('');
  };

  const serializeContainerLocally = (
    container: PMNode,
    options: {
      preserveTrailingWhitespaceParagraph?: boolean;
      boundaryLineBreaks?: boolean;
      closeOnLastContentLine?: boolean;
    } = {},
  ): string => {
    const {
      preserveTrailingWhitespaceParagraph = false,
      boundaryLineBreaks = false,
      closeOnLastContentLine = false,
    } = options;
    const outerOpen = open.slice();
    const start = out.length;
    open = [];
    container.forEach((child, _offset, index) => {
      const nextSibling = index + 1 < container.childCount
        ? container.child(index + 1)
        : null;
      const isLiteralTrailingSpace = preserveTrailingWhitespaceParagraph
        && index === container.childCount - 1
        && child.type.name === 'paragraph'
        && child.textContent.length > 0
        && /^\s+$/.test(child.textContent);
      if (isLiteralTrailingSpace) {
        // F-list treats literal content between a block tag and [/collapse] as
        // a final visual line. Preserve that content without inventing a
        // physical newline so `...[/left] [/collapse]` round-trips exactly.
        out.push(serializeParagraphInlineAlone(child));
      } else if (child.type.name === 'paragraph') {
        emitParagraph(child, nextSibling);
      } else {
        emitNode(child, nextSibling);
      }
    });
    flushCloseAll();
    let rendered = out.splice(start).join('');
    if (closeOnLastContentLine && rendered.endsWith('\n') && !keepsFinalNewline(container.lastChild, container.childCount)) {
      // Paragraph separators belong between dropdown lines. The generic block
      // serializer also emits one after the final block; keeping that separator
      // would put [/collapse] on a new line and create an unintended final BR
      // on F-list. Remove only that generated final separator. An intentional
      // empty final paragraph or hard break still leaves its own newline.
      rendered = rendered.slice(0, -1);
    }
    if (boundaryLineBreaks) {
      // F-list ignores one newline just inside [collapse=…] and one just
      // before [/collapse], so visible blank lines at either edge need one more.
      if (rendered.endsWith('\n')) rendered += '\n';
      if (rendered.startsWith('\n')) rendered = `\n${rendered}`;
    }
    open = outerOpen;
    return rendered;
  };

  emitNode(doc);
  flushCloseAll();
  return tidy(out.join(''));
}

function tidy(s: string): string {
  // Runs of line breaks are left alone: on F-list each one is a visible line,
  // so empty lines the profile uses for spacing must survive export.
  s = s.replace(/^\s+|\s+$/g, '');
  return s;
}
