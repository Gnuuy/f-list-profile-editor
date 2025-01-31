import BubbleButton from "./BubbleButton";
import { useEditorContext } from "../context/EditorContext";

export default function BubbleMenuLayout()
{
    const { editor, justifyLeft, justifyCenter, justifyRight, justifyFull, italic, bold, underline, strikethrough, subscript, superscript, addImage, toggleDrag } = useEditorContext();

    return (
    <div className="bubble-menu">
        <div>
            <BubbleButton className={editor?.isActive("italic") ? "is-active" : "bubble-button"} title="Italic" onClick={italic} imgPath="/icons/italic.png"/>
            <BubbleButton title="Bold" onClick={bold} imgPath="/icons/bold.png"/>
            <BubbleButton title="Underline" onClick={underline} imgPath="/icons/underline.png"/>
            <BubbleButton title="Strikethrough" onClick={strikethrough} imgPath="/icons/strikethrough.png"/>
        </div>
        <div>
            <BubbleButton title="Justify Left" onClick={justifyLeft} imgPath="/icons/justify-left.png"/>
            <BubbleButton title="Justify Center" onClick={justifyCenter} imgPath="/icons/center.png"/>
            <BubbleButton title="Justify Right" onClick={justifyRight} imgPath="/icons/justify-right.png"/>
        </div>
        <div>
            <BubbleButton title="Subscript" onClick={subscript} imgPath="/icons/subscript.png"/>
            <BubbleButton title="Superscript" onClick={superscript} imgPath="/icons/superscript.png"/>
        </div>
    </div>
    )
}