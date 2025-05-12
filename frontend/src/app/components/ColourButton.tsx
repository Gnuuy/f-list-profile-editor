interface ColourButtonProps
{
    onClick?: () => void;
}

export default function ColourButton({onClick}: ColourButtonProps)
{
    return (
        <div 
            className="colour-button"
            onClick={onClick}>
        </div>
    )
}