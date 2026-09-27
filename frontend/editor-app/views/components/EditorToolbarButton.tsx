import type { ReactNode } from 'react';

interface ButtonProps {
  title: string;
  isActive?: boolean;
  icon: ReactNode;
  imgPath?: string;
  glyph?: string;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export default function ToolbarButton({
  title, isActive, icon, disabled = false, onClick,
}: ButtonProps) {
  const cls = isActive
    ? "editor-toolbar-button editor-toolbar-button-active"
    : "editor-toolbar-button";

  return (
    <button
      className={cls}
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={isActive === undefined ? undefined : isActive}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <span className="editor-toolbar-button-icon" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}
