import Button from './Button'
import Link from 'next/link'

export default function NavBar()
{
    return (
    <div className="bg-gradient-to-b from-[#1c4971] to-[#173e63] flex flex-row border-b-2 border-b-[#0B345F]">
        <Link href="/">
            <Button title="Editor" iconPath='/icons/edit.png' />
        </Link>
        <Link href="/faq">
            <Button title="FAQ" iconPath='/icons/faq.png' />
        </Link>
    </div>
    )
}