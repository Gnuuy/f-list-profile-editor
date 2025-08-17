// context/types.ts

export type Mark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'underline' }
  | { type: 'strike' }
  | { type: 'subscript' }
  | { type: 'superscript' }
  | { type: 'textStyle'; attrs: { color: string } }
  | { type: 'link'; attrs: { href: string } };

export interface TextNode {
  type: 'text';
  text: string;
  marks?: Mark[];
}

export interface ParagraphNode {
  type: 'paragraph';
  attrs?: { textAlign?: 'left' | 'right' | 'center' };
  content?: Node[];
}

export interface ListItemNode {
  type: 'listItem';
  content?: Node[];
}

export interface BulletListNode {
  type: 'bulletList';
  content?: ListItemNode[];
}

export interface OrderedListNode {
  type: 'orderedList';
  content?: ListItemNode[];
}

export interface ImageNode {
  type: 'image';
  attrs: { src: string; alt?: string };
}

export interface HorizontalRuleNode {
  type: 'horizontalRule';
}

export interface BlockquoteNode {
  type: 'blockquote';
  content?: Node[];
}

export type Node =
  | TextNode
  | ParagraphNode
  | ListItemNode
  | BulletListNode
  | OrderedListNode
  | ImageNode
  | HorizontalRuleNode
  | BlockquoteNode;

export interface DocumentNode {
  type: 'doc';
  content: Node[];
}