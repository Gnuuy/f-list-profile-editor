import { useEffect, useState, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import {
  AArrowDown,
  AArrowUp,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold as BoldIcon,
  GripVertical,
  ImagePlus,
  Italic as ItalicIcon,
  Link as LinkIcon,
  ListCollapse,
  Lock,
  Minus,
  Palette,
  Quote,
  Smile,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Underline as UnderlineIcon,
  Unlock,
  UserRound,
} from "lucide-react";
import { useEditorEngine } from "../../context/EditorEngineContext";
import { useEditorUI } from "../../context/EditorUIContext";
import EditorToolBarButton from "./EditorToolbarButton";
import { getActiveTextAlignment } from "../../models/InlineTextAlign";
import { getActiveFListTextSize } from "../../models/TextSize";
import UnicodeFontSelect from "./UnicodeFontSelect";

function markActive(ed: Editor, mark: string) {
  const activeByAPI = ed.isActive(mark);
  const stored = ed.state.storedMarks?.some(m => m.type.name === mark) ?? false;
  return activeByAPI || stored;
}

type EditorToolbarProps = {
  isFloating?: boolean;
};

export default function EditorToolbar({ isFloating = false }: EditorToolbarProps) {
  const {
    editor,
    bold, italic, underline, strike, subscript, superscript, toggleTextSize,
    setTextAlign, addImageFromFilePicker, toggleEditable, addQuote, insertCollapse
  } = useEditorEngine();

  const {
    colourOpen,
    eiconOpen,
    characterIconOpen,
    horizontalRuleOpen,
    linkOpen,
    openColourAtButton,
    openEiconAtButton,
    openCharacterIconAtButton,
    openHorizontalRuleAtButton,
    openLinkAtButton,
    closeColour,
    closeEicon,
    closeCharacterIcon,
    closeHorizontalRule,
    closeLink,
    blockDragEnabled,
    toggleBlockDrag,
  } = useEditorUI();

  const [, setRevision] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const handleEditorChange = () => setRevision(revision => revision + 1);
    editor.on("update", handleEditorChange);
    editor.on("selectionUpdate", handleEditorChange);
    editor.on("transaction", handleEditorChange);

    return () => {
      editor.off("update", handleEditorChange);
      editor.off("selectionUpdate", handleEditorChange);
      editor.off("transaction", handleEditorChange);
    };
  }, [editor]);

  useEffect(() => {
    closeColour();
    closeEicon();
    closeCharacterIcon();
    closeHorizontalRule();
    closeLink();
  }, [isFloating, closeCharacterIcon, closeColour, closeEicon, closeHorizontalRule, closeLink]);

  const run = useCallback((cmd: () => void) => {
    return () => { cmd(); setRevision(revision => revision + 1); };
  }, []);

  const disabled = !editor;
  const isEditable = editor?.isEditable ?? false;

  const isBold        = editor ? markActive(editor, "bold")        : false;
  const isItalic      = editor ? markActive(editor, "italic")      : false;
  const isUnderline   = editor ? markActive(editor, "underline")   : false;
  const isStrike      = editor ? markActive(editor, "strike")      : false;
  const isSubscript   = editor ? markActive(editor, "subscript")   : false;
  const isSuperscript = editor ? markActive(editor, "superscript") : false;
  const isLink        = editor ? markActive(editor, "link")        : false;
  const textSize      = editor ? getActiveFListTextSize(editor.state) : null;

  const align = editor ? getActiveTextAlignment(editor.state) : 'left';
  const alignLeftActive   = align === 'left';
  const alignCenterActive = align === 'center';
  const alignRightActive  = align === 'right';
  const alignFullActive   = align === 'justify';

  useEffect(() => {
    if (isEditable) return;
    closeColour();
    closeEicon();
    closeCharacterIcon();
    closeHorizontalRule();
    closeLink();
  }, [isEditable, closeCharacterIcon, closeColour, closeEicon, closeHorizontalRule, closeLink]);

  if (isFloating && !isEditable) return null;

  return (
    <div className={`editor-toolbar${isFloating ? " is-floating" : ""}`}>
      <div className="editor-toolbar-group" role="group" aria-label="Formatting tools">
        <EditorToolBarButton title="Bold (Ctrl+B)"             isActive={isBold}        onClick={run(bold)}        icon={<BoldIcon />} disabled={disabled} />
        <EditorToolBarButton title="Italic (Ctrl+I)"           isActive={isItalic}      onClick={run(italic)}      icon={<ItalicIcon />} disabled={disabled} />
        <EditorToolBarButton title="Underline (Ctrl+U)"        isActive={isUnderline}   onClick={run(underline)}   icon={<UnderlineIcon />} disabled={disabled} />
        <EditorToolBarButton title="Strike (Ctrl+S)"           isActive={isStrike}      onClick={run(strike)}      icon={<Strikethrough />} disabled={disabled} />
        <EditorToolBarButton title="Subscript (Ctrl+Down)"     isActive={isSubscript}   onClick={run(subscript)}   icon={<SubscriptIcon />} disabled={disabled} />
        <EditorToolBarButton title="Superscript (Ctrl+Up)"    isActive={isSuperscript} onClick={run(superscript)} icon={<SuperscriptIcon />} disabled={disabled} />
        <EditorToolBarButton title="Big text ([big])"   isActive={textSize === "big"}   onClick={run(() => toggleTextSize("big"))}   icon={<AArrowUp />} disabled={disabled} />
        <EditorToolBarButton title="Small text ([small])" isActive={textSize === "small"} onClick={run(() => toggleTextSize("small"))} icon={<AArrowDown />} disabled={disabled} />
        <EditorToolBarButton title="Link (Ctrl+L)"             isActive={linkOpen || isLink} onClick={openLinkAtButton} icon={<LinkIcon />} disabled={disabled} />
        <EditorToolBarButton title="Text Colour (Ctrl+D)"      isActive={colourOpen} onClick={openColourAtButton}   icon={<Palette />} disabled={disabled} />
        <EditorToolBarButton title="Eicons (Ctrl+E)"           isActive={eiconOpen}  onClick={openEiconAtButton}    icon={<Smile />} disabled={disabled} />
        <EditorToolBarButton title="Character Icon (Ctrl+R)"   isActive={characterIconOpen} onClick={openCharacterIconAtButton} icon={<UserRound />} disabled={disabled} />
        <EditorToolBarButton title="Quote"            onClick={run(addQuote)}                             icon={<Quote />} disabled={disabled} />
        <EditorToolBarButton title="Collapse"         onClick={run(insertCollapse)}                       icon={<ListCollapse />} disabled={disabled} />
        <EditorToolBarButton title="Horizontal Rule"  isActive={horizontalRuleOpen} onClick={openHorizontalRuleAtButton} icon={<Minus />} disabled={disabled} />
        <EditorToolBarButton title="Insert Image"     onClick={run(addImageFromFilePicker)}               icon={<ImagePlus />} disabled={disabled} />
      </div>
      <div className="editor-toolbar-group" role="group" aria-label="Text alignment">
        <EditorToolBarButton title="Align Left"    isActive={alignLeftActive}   onClick={() => setTextAlign("left")}    icon={<AlignLeft />} disabled={disabled} />
        <EditorToolBarButton title="Align Center"  isActive={alignCenterActive} onClick={() => setTextAlign("center")}  icon={<AlignCenter />} disabled={disabled} />
        <EditorToolBarButton title="Align Right"   isActive={alignRightActive}  onClick={() => setTextAlign("right")}   icon={<AlignRight />} disabled={disabled} />
        <EditorToolBarButton title="Align Justify" isActive={alignFullActive}   onClick={() => setTextAlign("justify")} icon={<AlignJustify />} disabled={disabled} />
      </div>

      <div className="editor-toolbar-group" role="group" aria-label="Editor controls">
        <UnicodeFontSelect disabled={disabled || !isEditable} />
        <EditorToolBarButton
          title={blockDragEnabled ? "Turn block dragging off" : "Turn block dragging on"}
          isActive={blockDragEnabled}
          onClick={toggleBlockDrag}
          icon={<GripVertical />}
          disabled={disabled}
        />
        <EditorToolBarButton
          title={isEditable ? "Lock Editor" : "Unlock Editor"}
          isActive={!isEditable}
          onClick={run(toggleEditable)}
          icon={isEditable ? <Lock /> : <Unlock />}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
