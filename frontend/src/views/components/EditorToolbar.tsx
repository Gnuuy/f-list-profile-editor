import { useEffect, useRef, useState, useCallback } from "react";
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
    getEditor,
    bold, italic, underline, strike, subscript, superscript,
    setTextAlign, addImageFromFilePicker, toggleEditable, addQuote, insertCollapse, insertHR
  } = useEditorEngine();

  const { openColourAtButton } = useEditorUI();

  const editorRef = useRef<Editor | null>(null);
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let raf = 0;

    const attach = (ed: Editor) => {
      const handle = () => setTick(t => t + 1);
      ed.on("update", handle);
      ed.on("selectionUpdate", handle);
      ed.on("transaction", handle);
      cleanup = () => {
        ed.off("update", handle);
        ed.off("selectionUpdate", handle);
        ed.off("transaction", handle);
      };
      setReady(true);
      setTick(t => t + 1);
    };

    const poll = () => {
      const ed = getEditor();
      if (ed && ed !== editorRef.current) {
        editorRef.current = ed;
        attach(ed);
      } else if (!ed) {
        editorRef.current = null;
        setReady(false);
        raf = requestAnimationFrame(poll);
      }
    };

    poll();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, [getEditor]);

  const run = useCallback((cmd: () => void) => {
    return () => { cmd(); setTick(t => t + 1); };
  }, []);

  const ed = editorRef.current;

  const disabled = !ready || !ed;

  const isBold        = ed ? markActive(ed, "bold")        : false;
  const isItalic      = ed ? markActive(ed, "italic")      : false;
  const isUnderline   = ed ? markActive(ed, "underline")   : false;
  const isStrike      = ed ? markActive(ed, "strike")      : false;
  const isSubscript   = ed ? markActive(ed, "subscript")   : false;
  const isSuperscript = ed ? markActive(ed, "superscript") : false;

  const align = ed ? activeAlign(ed) : 'left';
  const alignLeftActive   = align === 'left';
  const alignCenterActive = align === 'center';
  const alignRightActive  = align === 'right';
  const alignFullActive   = align === 'justify';

  const hasCollapsible = !!(ed as any)?.commands?.addCollapsible;

  return (
    <div className="editor-toolbar">
      <div>
        <EditorToolBarButton title="Bold"             isActive={isBold}        onClick={run(bold)}        imgPath="/icons/bold.png"        disabled={disabled} />
        <EditorToolBarButton title="Italic"           isActive={isItalic}      onClick={run(italic)}      imgPath="/icons/italic.png"      disabled={disabled} />
        <EditorToolBarButton title="Underline"        isActive={isUnderline}   onClick={run(underline)}   imgPath="/icons/underline.png"   disabled={disabled} />
        <EditorToolBarButton title="Strike"           isActive={isStrike}      onClick={run(strike)}      imgPath="/icons/strikethrough.png" disabled={disabled} />
        <EditorToolBarButton title="Subscript"        isActive={isSubscript}   onClick={run(subscript)}   imgPath="/icons/subscript.png"   disabled={disabled} />
        <EditorToolBarButton title="Superscript"      isActive={isSuperscript} onClick={run(superscript)} imgPath="/icons/superscript.png" disabled={disabled} />
        <EditorToolBarButton title="Colour Pallet"    onClick={(e) => openColourAtButton(e)}              imgPath="/icons/pallete.png" />
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
        <EditorToolBarButton title="Toggle Editable" onClick={run(toggleEditable)} imgPath="/icons/editable.png" disabled={disabled} />
      </div>
    </div>
  );
}
