import { useTheme } from '../context/ThemeContext'
import Button from './NBButton';
import Link from 'next/link';
import TButton from './ThemeButton';

export default function NavBar() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="navBar">
      <div>
        <Link href="/">
          <Button title="Editor" iconPath="/icons/edit.png" />
        </Link>
        <Link href="/faq">
          <Button title="FAQ" iconPath="/icons/faq.png" />
        </Link>
      </div>
      <div>
        <TButton
          title="Default"
          onClick={() => setTheme('default')}
          color="#1b446f"
        />
        <TButton
          title="Dark"
          onClick={() => setTheme('dark')}
          color="#2e2828"
        />
        <TButton
          title="Light"
          onClick={() => setTheme('light')}
          color="#ffffff"
        />
      </div>
    </div>
  );
}