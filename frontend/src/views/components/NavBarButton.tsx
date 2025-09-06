import { Link } from "wouter";

interface ButtonProps {
  buttonText: string;
  iconPath: string;
  disabled?: boolean;
  href?: string;
}

export default function NavBarButton({ buttonText, iconPath, disabled, href }: ButtonProps) {
  const content = (
    <>
      <img src={iconPath} alt="" />
      <span>{buttonText}</span>
    </>
  );

  // 🔗 If it's a link
  if (href) {
    return (
      <Link href={href}>
        <a
          className="nav-bar-button"
          aria-disabled={disabled}
          onClick={e => disabled && e.preventDefault()}
        >
          {content}
        </a>
      </Link>
    );
  }

  return (
    <button
      className="nav-bar-button"
      type="button"
      disabled={disabled}
      title={disabled ? "Service is unavailable" : ""}
    >
      {content}
    </button>
  );
}
