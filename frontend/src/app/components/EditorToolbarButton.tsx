interface ButtonProps{
    title: string
    imgPath: string

    onClick?: () => void;
}

export default function ToolbarButton({title, imgPath, onClick}: ButtonProps)
{
    return (
        <div>
            <div className="rounded-t-lg bg-indigo-500 w-8 h-8 px-1">
                <button 
                type='button'
                title={title}
                onClick={onClick}
                >
                <img src={imgPath} className="h-5 w-5 filter invert" />
                </button>
            </div>
        </div>
    )
}