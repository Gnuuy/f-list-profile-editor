interface ButtonProps{
     title: string,
    onClick?: () => void
}

export default function Button({title, onClick}: ButtonProps)
{   return(
        <button
            className="genericButton"
            title={title}
            onClick={onClick}>
        <p>{title}</p>
        </button>
    )
}