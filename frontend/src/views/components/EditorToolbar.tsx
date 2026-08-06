import { useEffect, useState, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorEngine } from "../../context/EditorEngineContext";
import ColourMenu from "./ColourMenu";
import { useEditorUI } from "../../context/EditorUIContext";
import EditorToolBarButton from "./EditorToolbarButton";

function markActive(ed: Editor, mark: string) {
  const activeByAPI = ed.isActive(mark);
  const stored = ed.state.storedMarks?.some(m => m.type.name === mark) ?? false;
  return activeByAPI || stored;
}

function activeAlign(ed: Editor): 'left' | 'center' | 'right' | 'justify' {
  if (ed.isActive({ textAlign: 'center' }))  return 'center';
  if (ed.isActive({ textAlign: 'right' }))   return 'right';
  if (ed.isActive({ textAlign: 'justify' })) return 'justify';
  return 'left';
}

export default function EditorToolbar() {
  const {
    editor,
    bold, italic, underline, strike, subscript, superscript,
    setTextAlign, addImageFromFilePicker, toggleEditable, addQuote, insertCollapse, insertHR
  } = useEditorEngine();

  const { openColourAtButton } = useEditorUI();

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

  const run = useCallback((cmd: () => void) => {
    return () => { cmd(); setRevision(revision => revision + 1); };
  }, []);

  const disabled = !editor;

  const isBold        = editor ? markActive(editor, "bold")        : false;
  const isItalic      = editor ? markActive(editor, "italic")      : false;
  const isUnderline   = editor ? markActive(editor, "underline")   : false;
  const isStrike      = editor ? markActive(editor, "strike")      : false;
  const isSubscript   = editor ? markActive(editor, "subscript")   : false;
  const isSuperscript = editor ? markActive(editor, "superscript") : false;

  const align = editor ? activeAlign(editor) : 'left';
  const alignLeftActive   = align === 'left';
  const alignCenterActive = align === 'center';
  const alignRightActive  = align === 'right';
  const alignFullActive   = align === 'justify';

  return (
    <div className="editor-toolbar">
      <div>
        <EditorToolBarButton title="Bold"             isActive={isBold}        onClick={run(bold)}        imgPath="/icons/bold.png"        disabled={disabled} />
        <EditorToolBarButton title="Italic"           isActive={isItalic}      onClick={run(italic)}      imgPath="/icons/italic.png"      disabled={disabled} />
        <EditorToolBarButton title="Underline"        isActive={isUnderline}   onClick={run(underline)}   imgPath="/icons/underline.png"   disabled={disabled} />
        <EditorToolBarButton title="Strike"           isActive={isStrike}      onClick={run(strike)}      imgPath="/icons/strikethrough.png" disabled={disabled} />
        <EditorToolBarButton title="Subscript"        isActive={isSubscript}   onClick={run(subscript)}   imgPath="/icons/subscript.png"   disabled={disabled} />
        <EditorToolBarButton title="Superscript"      isActive={isSuperscript} onClick={run(superscript)} imgPath="/icons/superscript.png" disabled={disabled} />
        <EditorToolBarButton title="Text Colour"      onClick={(e) => openColourAtButton(e)}              imgPath="/icons/pallete.png" disabled={disabled} />
        <EditorToolBarButton title="Quote"            onClick={run(addQuote)}                             imgPath="/icons/quote.png" disabled={disabled} />
        <EditorToolBarButton title="Collapse"         onClick={run(insertCollapse)}                       imgPath="/icons/drop-down-arrow.png" disabled={disabled} />
        <EditorToolBarButton title="Horizontal Rule"  onClick={run(insertHR)}                             imgPath="/icons/horizontal-rule.png" disabled={disabled} />
        <EditorToolBarButton title="Insert Image"     onClick={run(addImageFromFilePicker)}               imgPath="/icons/image.png" disabled={disabled} />
      </div>
        <ColourMenu />
      <div>
        <EditorToolBarButton title="Align Left"    isActive={alignLeftActive}   onClick={() => setTextAlign("left")}    imgPath="/icons/justify-left.png" disabled={disabled} />
        <EditorToolBarButton title="Align Center"  isActive={alignCenterActive} onClick={() => setTextAlign("center")}  imgPath="/icons/center.png"        disabled={disabled} />
        <EditorToolBarButton title="Align Right"   isActive={alignRightActive}  onClick={() => setTextAlign("right")}   imgPath="/icons/justify-right.png" disabled={disabled} />
        <EditorToolBarButton title="Align Justify" isActive={alignFullActive}   onClick={() => setTextAlign("justify")} imgPath="/icons/justify.png"       disabled={disabled} />
      </div>

      <div>
        <EditorToolBarButton title="Toggle Editable" onClick={run(toggleEditable)} imgPath="/icons/edit.png" disabled={disabled} />
      </div>
    </div>
  );
}
