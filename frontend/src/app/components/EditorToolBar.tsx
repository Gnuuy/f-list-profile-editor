'use client'

import ToolbarButton from "./EditorToolbarButton";
import { useEditorContext } from "../context/EditorContext";
import { useEffect, useState } from "react";
import ColourMenu from "./ColourMenu";

export default function EditorToolBar() {
    const {
        editor,
        justifyLeft,
        justifyCenter,
        justifyRight,
        justifyFull,
        italic,
        bold,
        underline,
        strikethrough,
        subscript,
        superscript,
        addImage,
        toggleDrag,
        toggleColourPicker,
        insertQuote
    } = useEditorContext();
    const [forceUpdate, setForceUpdate] = useState(0);

    // Listen for editor updates
    useEffect(() => {
      if (!editor) return;
  
      const handleUpdate = () => {
        setForceUpdate((prev) => prev + 1);
      };
  
      editor.on("update", handleUpdate);
      editor.on("selectionUpdate", handleUpdate);
  
      return () => {
        editor.off("update", handleUpdate);
        editor.off("selectionUpdate", handleUpdate);
      };
    }, [editor]);

    if (!editor) {
        return null;
      }

  return (
    <div className="flex flex-row flex-nowrap justify-between">
      <div className="flex flex-row flex-nowrap">
        <ToolbarButton
        title="Bold"
        isActive={editor.isActive("bold")}
        onClick={bold}
        imgPath="/icons/bold.png"
        />
        <ToolbarButton 
        title="Italic"
        isActive={editor.isActive("italic")}
        onClick={italic}
        imgPath="/icons/italic.png"
        />
        <ToolbarButton
        title="Underline"
        isActive={editor.isActive("underline")}
        onClick={underline}
        imgPath="/icons/underline.png"
        />
        <ToolbarButton
        title="Strikethrough"
        isActive={editor.isActive("strike")}
        onClick={strikethrough}
        imgPath="/icons/strikethrough.png"
        />
        <ToolbarButton
        title="Subscript"
        isActive={editor.isActive("subscript")}
        onClick={subscript}
        imgPath="/icons/subscript.png"
        />
        <ToolbarButton
        title="Superscript"
        isActive={editor.isActive("superscript")}
        onClick={superscript}
        imgPath="/icons/superscript.png"
        />
        <ToolbarButton
        title="Colour"
        onClick={(event) => toggleColourPicker(event)}
        imgPath="/icons/colour.png"
        />
        <ColourMenu />
        <ToolbarButton 
        title="Insert Image" 
        onClick={addImage} 
        imgPath="/icons/image.png" 
        />
        <ToolbarButton 
        title="Insert Image" 
        onClick={addImage} 
        imgPath="/icons/image.png" 
        />
        <ToolbarButton
        title="Qoute"
        onClick={insertQuote}
        imgPath="" />
      </div>
      <div className="flex flex-row flex-nowrap">
        <ToolbarButton
        title="Justify Left"
        isActive={editor.isActive({ textAlign: "left" })}
        onClick={justifyLeft}
        imgPath="/icons/justify-left.png"
        />
        <ToolbarButton
        title="Justify Center"
        isActive={editor.isActive({ textAlign: "center" })}
        onClick={justifyCenter}
        imgPath="/icons/center.png" />
        <ToolbarButton
        title="Justify Right"
        onClick={justifyRight}
        imgPath="/icons/justify-right.png"
        />
        <ToolbarButton
        title="Justify Full"
        onClick={justifyFull}
        imgPath="/icons/justify.png"
        />
      </div>
      <div className="flex flex-row flex-nowrap">
        <ToolbarButton
        title="Toggle Drag"
        onClick={toggleDrag}
        imgPath="/icons/justify-right.png"
        />
        <ToolbarButton
        title="Toggle Bubble Menu"
        imgPath="/icons/justify-right.png"
        />
        <ToolbarButton
        title="REPLACE ME"
        imgPath="/icons/justify-right.png"
        />
      </div>
    </div>
  );
}