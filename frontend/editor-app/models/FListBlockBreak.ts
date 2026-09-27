import { Extension } from '@tiptap/core';

/**
 * Records whether the original BBCode contained a physical newline after a
 * block-level F-list tag. F-list turns that newline into a real <br>, which is
 * visually different from merely placing two block elements next to each
 * other.
 *
 * `null` keeps the legacy/default serializer behaviour for newly-created
 * editor content. Imported BBCode uses an explicit boolean so touching tags
 * stay touching and line-separated tags retain their visible spacer.
 */
export const FListBlockBreak = Extension.create({
  name: 'fListBlockBreak',

  addGlobalAttributes() {
    return [{
      types: [
        'paragraph',
        'blockquote',
        'horizontalRule',
        'indentedBlock',
        'collapsible',
        'bulletList',
        'orderedList',
      ],
      attributes: {
        fListBreakAfter: {
          default: null,
          parseHTML: element => {
            const value = element.getAttribute('data-f-list-break-after');
            if (value === 'true') return true;
            if (value === 'false') return false;
            return null;
          },
          renderHTML: attributes => {
            const value = attributes.fListBreakAfter;
            return typeof value === 'boolean'
              ? { 'data-f-list-break-after': String(value) }
              : {};
          },
        },
      },
    }];
  },
});
