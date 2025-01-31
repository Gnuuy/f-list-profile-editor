interface BubbleButtonProps
{
    title: string;
    className: string;
    onClick?: () => void;
    imgPath:string;
}

export default function BubbleButton({className, title, imgPath, onClick}: BubbleButtonProps) {
    return (
        <div>
            <button 
            className={className}

            title={title}
            type="button"
            onClick={onClick}
            >
                <img src={imgPath} className="h-4 w-4 filter invert" />
            </button>
        </div>
    )
}