import { useState } from 'react';

import { useTheme } from '../../context/ThemeContext'
import { FeedbackDialog } from './FeedbackDialog';
import NavBarButton from './NavBarButton';
import ThemeButton from './ThemeButton';

export default function NavBar() {
  const { theme, setTheme } = useTheme();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div className="nav-bar">
      <div>
        <NavBarButton buttonText="Editor"     iconPath="/icons/edit.png"  href="/" />
        <NavBarButton buttonText="FAQ"        iconPath="/icons/faq.png"   href="/faq" />
        <NavBarButton buttonText="Profiles"   iconPath="/icons/faq.png"   href="/profiles" />
        <NavBarButton buttonText="Image Converter" iconPath="/icons/image.png" href="/image-converter" />
        <NavBarButton buttonText="Feedback"   iconPath="/icons/faq.png"   onClick={() => setFeedbackOpen(true)} />
      </div>
      <div>
        <ThemeButton title="Default"  onClick={() => setTheme('default')} circleColor="#1b446f" isSelected={theme === 'default'} />
        <ThemeButton title="Dark"     onClick={() => setTheme('dark')}    circleColor="#2e2828" isSelected={theme === 'dark'} />
        <ThemeButton title="Light"    onClick={() => setTheme('light')}   circleColor="#ffffff" isSelected={theme === 'light'} />
      </div>
      {feedbackOpen && <FeedbackDialog onClose={() => setFeedbackOpen(false)} />}
    </div>
  );
}
