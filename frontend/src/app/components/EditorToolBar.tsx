import ToolbarButton from "./EditorToolbarButton";
import { useEditorContext } from "../context/EditorContext";

export default function EditorToolBar() {
  const { justifyLeft, justifyCenter, justifyRight, justifyFull } = useEditorContext();

  return (
    <div className="flex flex-row flex-nowrap justify-between">
      <div className="flex flex-row flex-nowrap">
        <ToolbarButton title="Italic" imgPath="/icons/italic.png" />
        <ToolbarButton title="Bold" imgPath="/icons/bold.png" />
        <ToolbarButton title="Underline" imgPath="/icons/underline.png" />
        <ToolbarButton title="Colour" imgPath="/icons/colour.png" />
        <ToolbarButton title="Insert Image" imgPath="/icons/image.png" />
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