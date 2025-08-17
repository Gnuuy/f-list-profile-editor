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
          <Button buttonText="Editor" iconPath="/icons/edit.png" disabled={false} />
        </Link>
        <Link href="/faq">
          <Button buttonText="FAQ" iconPath="/icons/faq.png" disabled={false} />
        </Link>
        <Link href="/faq">
          <Button buttonText="Profiles" title="Service Unavailable" iconPath="/icons/faq.png" disabled={true} />
        </Link>
        <Link href="/faq">
          <Button buttonText="Feedback" title="Service Unavailable" iconPath="/icons/faq.png" disabled={true} />
        </Link>
      </div>
      <div>
        <TButton
          title="Default"
          onClick={() => setTheme('default')}
          circleColor="#1b446f"
        />
        <TButton
          title="Dark"
          onClick={() => setTheme('dark')}
          circleColor="#2e2828"
        />
        <TButton
          title="Light"
          onClick={() => setTheme('light')}
          circleColor="#ffffff"
        />
      </div>
    </div>
  );
}