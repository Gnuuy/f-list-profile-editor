import EButton from "./EditorButton";

export default function EditorControlBar()
{
    return (
        <div className="flex flex-row flex-nowarp justify-between">
            <div className="flex flex-row flex-nowarp">
                <EButton title='Italic' imgPath='/icons/italic.png' />
                <EButton title='Bold' imgPath='/icons/bold.png' />
                <EButton title='Underline' imgPath='/icons/underline.png' />
                <EButton title='Colour' imgPath='/icons/colour.png' />
                <EButton title='Insert Image' imgPath='/icons/image.png' />
            </div>
            <div className="flex flex-row flex-nowarp">
                <EButton title='Justify Left' imgPath='/icons/justify-left.png' />
                <EButton title='Center' imgPath='/icons/center.png' />
                <EButton title='Justify' imgPath='/icons/justify.png' />
                <EButton title='Justify Right' imgPath='/icons/justify-right.png' />
            </div>
            <div className="flex flex-row flex-nowarp">
                <EButton title='REPLACE ME' imgPath='/icons/justify-right.png' />
                <EButton title='REPLACE ME' imgPath='/icons/justify-right.png' />
                <EButton title='REPLACE ME' imgPath='/icons/justify-right.png' />
            </div>
        </div>
    )
}