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
      placeholderKind: {
        default: null,
        parseHTML: el => el.getAttribute('data-placeholder-kind'),
        renderHTML: attrs => attrs.placeholderKind
          ? { 'data-placeholder-kind': attrs.placeholderKind }
          : {},
      },
      bbcodeTag: {
        default: null,
        parseHTML: el => el.getAttribute('data-bbcode-tag'),
        renderHTML: attrs => attrs.bbcodeTag
          ? { 'data-bbcode-tag': attrs.bbcodeTag }
          : {},
      },
      bbcodeValue: {
        default: null,
        parseHTML: el => el.getAttribute('data-bbcode-value'),
        renderHTML: attrs => attrs.bbcodeValue
          ? { 'data-bbcode-value': attrs.bbcodeValue }
          : {},
      },
      bbcodeLabel: {
        default: null,
        parseHTML: el => el.getAttribute('data-bbcode-label'),
        renderHTML: attrs => attrs.bbcodeLabel
          ? { 'data-bbcode-label': attrs.bbcodeLabel }
          : {},
      },
    };
  },
});
