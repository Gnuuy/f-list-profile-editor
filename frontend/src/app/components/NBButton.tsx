interface ButtonProps {
    buttonText: string;
    title?: string;
    iconPath?: string;
    onClick?: () => void;
    disabled?: boolean;

}

export default function NBButton({ buttonText, title, iconPath, onClick, disabled }: ButtonProps) 
{
    return (
      <div className="navBarButton">
        <button type="button" title={title} onClick={onClick} disabled={disabled}>
            <img src={iconPath} />
            <span>{buttonText}</span>
        </button>
      </div>
    );
}