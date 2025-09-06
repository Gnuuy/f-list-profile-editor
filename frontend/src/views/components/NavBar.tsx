import { useTheme } from '../../context/ThemeContext'
import NavBarButton from './NavBarButton';
import ThemeButton from './ThemeButton';

export default function NavBar() {
  const { setTheme } = useTheme();

  return (
    <div className="nav-bar">
      <div>
        <NavBarButton buttonText="Editor"     iconPath="/icons/edit.png"  href="/" />
        <NavBarButton buttonText="FAQ"        iconPath="/icons/faq.png"   href="/faq" />
        <NavBarButton buttonText="Profiles"   iconPath="/icons/faq.png"   disabled={true} />
        <NavBarButton buttonText="Feedback"   iconPath="/icons/faq.png"   disabled={true} />
      </div>
      <div>
        <ThemeButton title="Default"  onClick={() => setTheme('default')} circleColor="#1b446f" />
        <ThemeButton title="Dark"     onClick={() => setTheme('dark')}    circleColor="#2e2828" />
        <ThemeButton title="Light"    onClick={() => setTheme('light')}   circleColor="#ffffff" />
      </div>
    </div>
  );
}