import Button from './NBButton'
import Link from 'next/link'
import TButton from './ThemeButton'

export default function NavBar()
{
    return (
    <div className="navBar">
        <div>
            <Link href="/">
                <Button title="Editor" iconPath='/icons/edit.png' />
            </Link>
            <Link href="/faq">
                <Button title="FAQ" iconPath='/icons/faq.png' />
            </Link>
        </div>
        <div>
            <TButton title="Default" color="#1b446f" />
            <TButton title="Dark" color="#2e2828" />
            <TButton title="Light" color="#ffffff" />
        </div>
    </div>
    )
}