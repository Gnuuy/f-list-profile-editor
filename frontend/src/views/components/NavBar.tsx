import { useTheme } from '../../context/ThemeContext'
import NavBarButton from './NavBarButton';
import { Link } from 'wouter';
import ThemeButton from './ThemeButton';

export default function NavBar() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="navBar">
      <div>
        <Link href="/">
          <NavBarButton buttonText="Editor" iconPath="/icons/edit.png" disabled={false} />
        </Link>
        <Link href="/faq">
          <NavBarButton buttonText="FAQ" iconPath="/icons/faq.png" disabled={false} />
        </Link>
        <Link href="/">
          <NavBarButton buttonText="Profiles" title="Service Unavailable" iconPath="/icons/faq.png" disabled={true} />
        </Link>
        <Link href="/">
          <NavBarButton buttonText="Feedback" title="Service Unavailable" iconPath="/icons/faq.png" disabled={true} />
        </Link>
      </div>
      <div>
        <ThemeButton
          title="Default"
          onClick={() => setTheme('default')}
          circleColor="#1b446f"
        />
        <ThemeButton
          title="Dark"
          onClick={() => setTheme('dark')}
          circleColor="#2e2828"
        />
        <ThemeButton
          title="Light"
          onClick={() => setTheme('light')}
          circleColor="#ffffff"
        />
      </div>
    </div>
  );
}