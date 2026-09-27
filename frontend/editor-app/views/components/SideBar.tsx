interface ComponentProps
{
    children: React.ReactNode
}

export default function SideBar({children}: ComponentProps)
{
    return (
    <div className="side-bar">
        {children}
    </div>
    )
}