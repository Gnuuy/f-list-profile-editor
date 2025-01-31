import ToolbarButton from "./EditorToolbarButton";
import { useEditorContext } from "../context/EditorContext";

export default function EditorToolBar() {
  const { editor, justifyLeft, justifyCenter, justifyRight, justifyFull, italic, bold, underline, strikethrough, subscript, superscript, addImage, toggleDrag } = useEditorContext();

  return (
    <div className="flex flex-row flex-nowrap justify-between">
      <div className="flex flex-row flex-nowrap">
        <ToolbarButton title="Italic" onClick={italic} imgPath="/icons/italic.png" />
        <ToolbarButton title="Bold" onClick={bold} imgPath="/icons/bold.png" />
        <ToolbarButton title="Underline" onClick={underline} imgPath="/icons/underline.png" />
        <ToolbarButton title="Strikethrough" onClick={strikethrough} imgPath="/icons/strikethrough.png" />
        <ToolbarButton title="Subscript" onClick={subscript} imgPath="/icons/subscript.png" />
        <ToolbarButton title="Superscript" onClick={superscript} imgPath="/icons/superscript.png" />
        <ToolbarButton title="Colour" onClick={strikethrough} imgPath="/icons/colour.png" />
        <ToolbarButton title="Insert Image" onClick={addImage} imgPath="/icons/image.png" />
        <ToolbarButton title="Insert Image" onClick={toggleDrag} imgPath="/icons/image.png" />
      </div>
      <div className="flex flex-row flex-nowrap">
        <ToolbarButton title="Justify Left" onClick={justifyLeft} imgPath="/icons/justify-left.png" />
        <ToolbarButton title="Justify Center" onClick={justifyCenter} imgPath="/icons/center.png" />
        <ToolbarButton title="Justify Full" onClick={justifyFull} imgPath="/icons/justify.png" />
        <ToolbarButton title="Justify Right" onClick={justifyRight} imgPath="/icons/justify-right.png" />
      </div>
      <div className="flex flex-row flex-nowrap">
        <ToolbarButton title="REPLACE ME" imgPath="/icons/justify-right.png" />
        <ToolbarButton title="REPLACE ME" imgPath="/icons/justify-right.png" />
        <ToolbarButton title="REPLACE ME" imgPath="/icons/justify-right.png" />
      </div>
    </div>
  );
}