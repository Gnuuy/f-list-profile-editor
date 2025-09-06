// AlignableImage.ts
import Image from '@tiptap/extension-image';

export const AlignableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'left',
        parseHTML: el => el.getAttribute('data-align') ?? 'left',
        renderHTML: attrs => ({ 'data-align': attrs.align }),
      },
    };
  },
});