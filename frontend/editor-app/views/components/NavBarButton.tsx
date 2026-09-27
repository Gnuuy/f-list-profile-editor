import { Link } from "wouter";

interface ButtonProps {
  buttonText: string;
  iconPath: string;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
}

export default function NavBarButton({ buttonText, iconPath, disabled, href, onClick }: ButtonProps) {
  const content = (
    <>
      <img src={iconPath} alt="" />
      <span>{buttonText}</span>
    </>
  );

  // 🔗 If it's a link
  if (href) {
    return (
      <Link
        href={href}
        className="nav-bar-button"
        aria-disabled={disabled}
        onClick={e => disabled && e.preventDefault()}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      className="nav-bar-button"
      type="button"
      disabled={disabled}
      title={disabled ? "Service is unavailable" : ""}
      onClick={onClick}
    >
      {content}
    </button>
  );
}
