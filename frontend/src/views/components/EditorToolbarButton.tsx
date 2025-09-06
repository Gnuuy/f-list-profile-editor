interface ButtonProps {
  title: string;
  isActive?: boolean;
  imgPath: string;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export default function ToolbarButton({
  title, isActive = false, imgPath, disabled = false, onClick,
}: ButtonProps) {
  const base = "editor-toolbar-button inline-flex items-center justify-center size-8 p-0 box-border";
  const active = isActive ? " editor-toolbar-button-active" : "";
  const cls = base + active;

  return (
    <button
      className={cls}
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}   // keep selection
      onClick={onClick}                          // pass through as-is
    >
      <img src={imgPath} alt={title} />
    </button>
  );
}
