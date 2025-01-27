import Button from './Button'
import Link from 'next/link'

export default function NavBar()
{
    return (
    <div className="bg-gradient-to-b from-[#1c4971] to-[#173e63] flex flex-row">
        <Link href="/">
            <Button title="Editor" />
        </Link>
        <Link href="/faq">
            <Button title="FAQ" />
        </Link>
    </div>
    )
}