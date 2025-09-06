interface ButtonProps
{
    title: string,
    onClick?: () => void,
    circleColor: string
}

export default function ThemeButton({title, onClick, circleColor}: ButtonProps)
{
    return (
        <div className="nav-bar-theme-button">
            <button type='button' onClick={onClick} style={{ '--button-color': circleColor } as React.CSSProperties}>
                <span>{title}</span>
                <div />
            </button>
        </div>
    )
}