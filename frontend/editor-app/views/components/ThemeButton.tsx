interface ButtonProps
{
    title: string,
    onClick?: () => void,
    circleColor: string,
    isSelected: boolean
}

export default function ThemeButton({title, onClick, circleColor, isSelected}: ButtonProps)
{
    return (
        <div className="nav-bar-theme-button">
            <button
                className={isSelected ? 'is-selected' : undefined}
                type="button"
                onClick={onClick}
                aria-pressed={isSelected}
                style={{ '--button-color': circleColor } as React.CSSProperties}
            >
                <span>{title}</span>
                <span className="theme-colour-swatch" aria-hidden="true" />
            </button>
        </div>
    )
}
