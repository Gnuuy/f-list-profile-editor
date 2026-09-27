import { useEditorState } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Link as LinkIcon,
  Palette,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Underline as UnderlineIcon,
} from 'lucide-react';

import { useEditorEngine } from '../../context/EditorEngineContext';
import { useEditorUI } from '../../context/EditorUIContext';
import { hasFormattableSelection } from '../../models/BubbleMenu';
import EditorToolBarButton from './EditorToolbarButton';

/** Formatting buttons that pop up above selected text. */
export default function EditorBubbleMenu() {
  const { editor } = useEditorEngine();
  return editor ? <SelectionMenu editor={editor} /> : null;
}

function SelectionMenu({ editor }: { editor: Editor }) {
  const { bold, italic, underline, strike, subscript, superscript } = useEditorEngine();
  const { openColourAtButton, openLinkAtButton } = useEditorUI();
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive('bold') ?? false,
      italic: current?.isActive('italic') ?? false,
      underline: current?.isActive('underline') ?? false,
      strike: current?.isActive('strike') ?? false,
      subscript: current?.isActive('subscript') ?? false,
      superscript: current?.isActive('superscript') ?? false,
      link: current?.isActive('link') ?? false,
    }),
  });

  return (
    <BubbleMenu
      editor={editor}
      className="editor-bubble-menu"
      shouldShow={({ editor: current, view, state }) => (
        current.isEditable && view.hasFocus() && hasFormattableSelection(state)
      )}
      options={{ placement: 'top', offset: 8 }}
    >
      <EditorToolBarButton title="Bold (Ctrl+B)" isActive={active.bold} onClick={bold} icon={<BoldIcon />} />
      <EditorToolBarButton title="Italic (Ctrl+I)" isActive={active.italic} onClick={italic} icon={<ItalicIcon />} />
      <EditorToolBarButton title="Underline (Ctrl+U)" isActive={active.underline} onClick={underline} icon={<UnderlineIcon />} />
      <EditorToolBarButton title="Strike (Ctrl+S)" isActive={active.strike} onClick={strike} icon={<Strikethrough />} />
      <EditorToolBarButton title="Subscript (Ctrl+Down)" isActive={active.subscript} onClick={subscript} icon={<SubscriptIcon />} />
      <EditorToolBarButton title="Superscript (Ctrl+Up)" isActive={active.superscript} onClick={superscript} icon={<SuperscriptIcon />} />
      <EditorToolBarButton title="Link (Ctrl+L)" isActive={active.link} onClick={openLinkAtButton} icon={<LinkIcon />} />
      <EditorToolBarButton title="Text Colour (Ctrl+D)" onClick={openColourAtButton} icon={<Palette />} />
    </BubbleMenu>
  );
}
