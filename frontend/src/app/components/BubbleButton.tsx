interface BubbleButtonProps {
    title: string;
    isActive?: boolean;
    imgPath: string;

    onClick?: () => void;
  }
  
  export default function BubbleButton({ title, isActive = false, imgPath, onClick }: BubbleButtonProps) {
    return (
      <div>
        <button
          className={isActive ? "bubble-button bubble-button-active" : "bubble-button"}
          type="button"
          title={title}
          onClick={onClick}
        >
          <img src={imgPath} className="h-4 w-4 filter invert" alt={title} />
        </button>
      </div>
    );
  }