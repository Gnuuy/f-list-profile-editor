import type { Node as PMNode, Mark as PMMark } from '@tiptap/pm/model';

import { normalizeEiconName } from '../models/Eicon';
import { F_LIST_COLORS, F_LIST_COLOR_NAMES } from '../models/FListColors';

const INLINE_IMAGE_PLACEHOLDER = '[big][color=red]REPLACE ME WITH YOUR INLINE[/color][/big]';
const EICON_PLACEHOLDER = '[big][color=red]REPLACE ME WITH YOUR EICON[/color][/big]';

type MarkTok =
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

const MARK_ORDER: MarkTok['t'][] = [
  'url', 'color', 'big', 'small', 'b', 'i', 'u', 's', 'code', 'sub', 'sup',
];

function marksToTokens(marks: ReadonlyArray<PMMark>): MarkTok[] {
  const out: MarkTok[] = [];
  for (const m of marks ?? []) {
    switch (m.type.name) {
      case 'textStyle': {
        const raw = (m.attrs?.color ?? '') as string;
        if (raw) out.push({ t: 'color', v: normalizeColor(raw) });
        const fontSize = (m.attrs?.fontSize ?? '') as string;
        if (fontSize === '1.25em') out.push({ t: 'big' });
        if (fontSize === '0.875em') out.push({ t: 'small' });
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
  return true;
}
function openTok(t: MarkTok): string {
  switch (t.t) {
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
    case 'center': return `[center]${s}[/center]`;
    case 'right': return `[right]${s}[/right]`;
    case 'justify': return `[justify]${s}[/justify]`;
    default: return s;
  }
}

function imagePlaceholder(node: PMNode): string {
  return node.attrs?.placeholderKind === 'eicon'
    ? EICON_PLACEHOLDER
    : INLINE_IMAGE_PLACEHOLDER;
}

function eiconBBCode(node: PMNode): string {
  const name = normalizeEiconName(String(node.attrs?.name ?? ''));
  return name ? `[eicon]${name}[/eicon]` : EICON_PLACEHOLDER;
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

  const emitInlineFrom = (node: PMNode) => {
    node.forEach(child => {
      if (child.isText) {
        switchTo(marksToTokens(child.marks));
        emitText(child.text || '');
        return;
      }
      if (child.type.name === 'hardBreak') { out.push('\n'); return; }
      if (child.type.name === 'eicon') { out.push(eiconBBCode(child)); return; }
      if (child.type.name === 'image') { out.push(imagePlaceholder(child)); return; }
      if (child.isInline) {
        switchTo(marksToTokens(child.marks));
        emitInlineFrom(child);
        return;
      }
      flushCloseAll();
      emitNode(child);
    });
  };

  const emitParagraph = (node: PMNode) => {
    const align = node.attrs?.textAlign as string | undefined;
    if (align && align !== 'left') {
      const savedOpen = open.slice();
      flushCloseAll();
      const para = serializeParagraphInlineAlone(node);
      out.push(wrapAlign(para, align), '\n');
      for (const t of savedOpen) out.push(openTok(t));
      open = savedOpen.slice();
      return;
    }
    emitInlineFrom(node);
    out.push('\n');
  };

  const emitNode = (node: PMNode, nextSibling: PMNode | null = null) => {
    switch (node.type.name) {
      case 'doc': emitChildren(node); break;
      case 'paragraph': emitParagraph(node); break;

      case 'blockquote': {
        flushCloseAll();
        const inner = serializeContainerLocally(node);
        const quoted = `[quote]${inner}[/quote]\n`;
        const indent = Number(node.attrs?.indent ?? 0) || 0;
        out.push(wrapIndent(quoted, indent));
        break;
      }

      case 'collapsible': {
        flushCloseAll();
        const title = (node.attrs?.title || 'Details').toString();
        const inner = serializeContainerLocally(node);
        const joinsAdjacentCollapse = node.attrs?.joinNext === true
          && nextSibling?.type.name === 'collapsible';
        const bb = `[collapse=${title}]${inner}[/collapse]${joinsAdjacentCollapse ? '' : '\n'}`;
        const indent = Number(node.attrs?.indent ?? 0) || 0;
        out.push(wrapIndent(bb, indent));
        break;
      }

      case 'indentedBlock': {
        flushCloseAll();
        const inner = serializeContainerLocally(node);
        const indent = Math.max(1, Number(node.attrs?.indent ?? 1) || 1);
        out.push(wrapIndent(inner, indent));
        break;
      }

      case 'horizontalRule':
        flushCloseAll();
        out.push('[hr]\n');
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
        out.push(`[list]\n${acc}[/list]\n`);
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
        out.push(`[list=1]\n${acc}[/list]\n`);
        break;
      }

      case 'image':
        flushCloseAll();
        out.push(imagePlaceholder(node) + '\n');
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

    para.forEach(child => {
      if (child.isText) { localSwitch(marksToTokens(child.marks)); buf.push(child.text || ''); return; }
      if (child.type.name === 'hardBreak') { buf.push('\n'); return; }
      if (child.type.name === 'eicon') { buf.push(eiconBBCode(child)); return; }
      if (child.type.name === 'image') { buf.push(imagePlaceholder(child)); return; }
      if (child.isInline) {
        localSwitch(marksToTokens(child.marks));
        child.forEach(grand => {
          if (grand.isText) { localSwitch(marksToTokens(grand.marks)); buf.push(grand.text || ''); }
          else if (grand.type.name === 'hardBreak') buf.push('\n');
          else if (grand.type.name === 'eicon') buf.push(eiconBBCode(grand));
          else if (grand.type.name === 'image') buf.push(imagePlaceholder(grand));
        });
        return;
      }
      localFlush();
    });

    localFlush();
    return buf.join('');
  };

  const serializeContainerLocally = (container: PMNode): string => {
    const outerOpen = open.slice();
    const start = out.length;
    open = [];
    container.forEach((child, _offset, index) => {
      const nextSibling = index + 1 < container.childCount
        ? container.child(index + 1)
        : null;
      if (child.type.name === 'paragraph') {
        emitParagraph(child);
      } else {
        emitNode(child, nextSibling);
      }
    });
    flushCloseAll();
    const rendered = out.splice(start).join('');
    open = outerOpen;
    return rendered;
  };

  emitNode(doc);
  flushCloseAll();
  return tidy(out.join(''));
}

function tidy(s: string): string {
  s = s.replace(/\n{3,}/g, '\n\n');
  s = s.replace(
    /\n(?=(?:\s*\[(?:\/(?:url|color|big|small|b|i|u|s|code|sub|sup))\]\s*)+(?:$|\s*\[\/(?:quote|collapse|indent|list(?:=1)?)\]))/g,
    ''
  );
  s = s.replace(/^\s+|\s+$/g, '');
  return s;
}
