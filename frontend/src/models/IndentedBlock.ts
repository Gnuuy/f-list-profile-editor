import { mergeAttributes, Node } from '@tiptap/core';

export const IndentedBlock = Node.create({
  name: 'indentedBlock',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      indent: {
        default: 1,
        parseHTML: element => Math.max(
          1,
          Number(element.getAttribute('data-indent-block') ?? 1) || 1,
        ),
        renderHTML: attributes => ({
          'data-indent-block': Math.max(1, Number(attributes.indent) || 1),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-indent-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const indent = Math.max(1, Number(HTMLAttributes['data-indent-block']) || 1);
    return [
      'div',
      mergeAttributes(HTMLAttributes, { style: `--import-indent:${indent}` }),
      0,
    ];
  },
});
