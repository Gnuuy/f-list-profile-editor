interface ButtonProps
{
    title: string,
    onClick?: () => void,

}

export default function SidebarButton({title, onClick}: ButtonProps)
{
       return <button type="button" title={title} onClick={onClick}>
        {title}
       </button>
}