import { useEffect, useState } from "react";
import BubbleButton from "./BubbleButton";
import { useEditorContext } from "../context/EditorContext";

export default function BubbleMenuLayout() {
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
        toggleDrag
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
    <div className="bubble-menu">
      <div>
        <BubbleButton
          title="Bold"
          isActive={editor.isActive("bold")}
          onClick={bold}
          imgPath="/icons/bold.png"
        />
        <BubbleButton
          title="Italic"
          isActive={editor.isActive("italic")}
          onClick={italic}
          imgPath="/icons/italic.png"
        />
        <BubbleButton
          title="Underline"
          isActive={editor.isActive("underline")}
          onClick={underline}
          imgPath="/icons/underline.png"
        />
        <BubbleButton
          title="Strikethrough"
          isActive={editor.isActive("strike")}
          onClick={strikethrough}
          imgPath="/icons/strikethrough.png"
        />
      </div>
      <div>
        <BubbleButton
          title="Justify Left"
          isActive={editor.isActive({ textAlign: "left" })}
          onClick={justifyLeft}
          imgPath="/icons/justify-left.png"
        />
        <BubbleButton
          title="Justify Center"
          isActive={editor.isActive({ textAlign: "center" })}
          onClick={justifyCenter}
          imgPath="/icons/center.png"
        />
        <BubbleButton
          title="Justify Right"
          isActive={editor.isActive({ textAlign: "right" })}
          onClick={justifyRight}
          imgPath="/icons/justify-right.png"
        />
      </div>
      <div>
        <BubbleButton
          title="Subscript"
          isActive={editor.isActive("subscript")}
          onClick={subscript}
          imgPath="/icons/subscript.png"
        />
        <BubbleButton
          title="Superscript"
          isActive={editor.isActive("superscript")}
          onClick={superscript}
          imgPath="/icons/superscript.png"
        />
      </div>
    </div>
  );
}