interface ButtonProps{
    title: string
    imgPath: string
}

export default function EButton({title, imgPath}: ButtonProps)
{
    return (
        <div>
            <div className="rounded-t-lg bg-indigo-500 w-8 h-8 px-1">
                <button 
                type='button'
                title={title}

                className='
                pt-1
                rounded-t-lg
                border-t-indigo-500
                border-l-indigo-500
                border-r-indigo-500
                '
                >
                <img src={imgPath} className="h-5 w-5 filter invert" />
                </button>
            </div>
        </div>
    )
}