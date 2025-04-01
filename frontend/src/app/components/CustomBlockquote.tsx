import { Node, mergeAttributes } from '@tiptap/core'

export const CustomBlockquote = Node.create({
  name: 'blockquote',
  group: 'block',
  content: 'block+',
  defining: true,
  parseHTML() {
    return [
      {
        tag: 'blockquote',
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'blockquote',
      mergeAttributes(HTMLAttributes),
      [
        'div',
        { class: 'QuoteHeader' },
        'Quote:',
      ],
      ['br'],
      ['br'],
      0, // actual content goes here
    ]
  },
})
