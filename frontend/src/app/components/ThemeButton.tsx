interface ButtonProps
{
    title: string,
    onClick?: () => void,
    color: string
}

export default function TButton({title, onClick, color}: ButtonProps)
{
    return (
        <div className="navBarThemeButton">
            <button type='button' onClick={onClick} style={{ '--button-color': color } as React.CSSProperties}>
                <span>{title}</span>
                <div />
            </button>
        </div>
    )
}