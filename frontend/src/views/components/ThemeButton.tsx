interface ButtonProps
{
    title: string,
    onClick?: () => void,
    circleColor: string
}

export default function ThemeButton({title, onClick, circleColor}: ButtonProps)
{
    return (
        <div className="navBarThemeButton">
            <button type='button' onClick={onClick} style={{ '--button-color': circleColor } as React.CSSProperties}>
                <span>{title}</span>
                <div />
            </button>
        </div>
    )
}