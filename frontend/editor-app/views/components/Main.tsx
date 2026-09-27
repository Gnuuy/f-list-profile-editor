interface ViewProps
{
    children: React.ReactNode
}

export default function MainView({children}: ViewProps)
{
    return (
        <div className="main-view">
                {children}
        </div>
    )
}