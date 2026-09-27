import type { Extensions } from '@tiptap/core';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';

import { AlignableImage } from '../utilities/AlignableImage';
import { Hotkeys, type HotkeyMenuCallbacks } from '../utilities/Hotkeys';
import { QuoteSelection } from '../utilities/QuoteSelection';
import { Collapsible } from '../views/components/extensions/Collapsible';
import { Eicon } from '../views/components/extensions/Eicon';
import { IndentableBlockquote } from '../views/components/extensions/IndentableBlockquote';
import { FListBlockBreak } from './FListBlockBreak';
import { FListLink } from './FListLinkExtension';
import { IndentedBlock } from './IndentedBlock';
import { InlineTextAlign } from './InlineTextAlign';
import { UnicodeTextTyping } from './UnicodeText';

export function createEditorExtensions(hotkeys: HotkeyMenuCallbacks = {}): Extensions {
  return [
    StarterKit.configure({ blockquote: false, link: false }),
    FListLink,
    TextStyleKit,
    Hotkeys.configure(hotkeys),
    Subscript,
    Superscript,
    FListBlockBreak,
    IndentableBlockquote,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    InlineTextAlign,
    UnicodeTextTyping,
    QuoteSelection,
    Eicon,
    Collapsible,
    IndentedBlock,
    AlignableImage.configure({ inline: true, allowBase64: true }),
  ];
}
