import type { Extensions } from '@tiptap/core';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';

import { AlignableImage } from '../utilities/AlignableImage';
import { Hotkeys } from '../utilities/Hotkeys';
import { QuoteSelection } from '../utilities/QuoteSelection';
import { Collapsible } from '../views/components/extensions/Collapsible';
import { Eicon } from '../views/components/extensions/Eicon';
import { IndentableBlockquote } from '../views/components/extensions/IndentableBlockquote';
import { IndentedBlock } from './IndentedBlock';

export function createEditorExtensions(): Extensions {
  return [
    StarterKit.configure({ blockquote: false }),
    TextStyleKit,
    Hotkeys,
    Subscript,
    Superscript,
    IndentableBlockquote,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    QuoteSelection,
    Eicon,
    Collapsible,
    IndentedBlock,
    AlignableImage.configure({ inline: true, allowBase64: true }),
  ];
}
