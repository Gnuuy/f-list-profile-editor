'use client'

interface ButtonProps{
    title: string;
    isActive?: boolean;
    imgPath: string;

    onClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function ToolbarButton({title, isActive = false, imgPath, onClick}: ButtonProps)
{
    return (
        <div>
            <button 
                className={isActive ? "toolbar-button toolbar-button-active" : "toolbar-button"}
                type='button'
                title={title}
                onClick={(event) => onClick?.(event)}
                >
                <img src={imgPath} className="h-5 w-5 filter invert" />
            </button>
        </div>
    )
}