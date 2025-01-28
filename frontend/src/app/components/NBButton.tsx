interface ButtonProps {
    title: string;
    iconPath?: string;
    onClick?: () => void;

}

export default function NBButton({ title, iconPath, onClick }: ButtonProps) 
{
    return (
      <div className="navBarButton">
        <button type="button" onClick={onClick}>
            <img src={iconPath} />
            <span>{title}</span>
        </button>
      </div>
    );
}