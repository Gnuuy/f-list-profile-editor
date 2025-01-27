interface ButtonProps {
    title: string;
    iconPath?: string;
    onClick?: () => void;

}

export default function Button({ title, iconPath, onClick }: ButtonProps) {
    return (
      <div>
        <button
          type="button"
          onClick={onClick}
          className="
            flex items-center
            space-x-1
            bg-gradient-to-r from-[#1c4971] to-[#173e63] 
            text-white 
            px-4 py-2 
            text-sm 
            transition 
            transform 
            hover:bg-[#235a8f] 
            hover:scale-105 
            active:scale-95
            border-r-2
            border-r-[#0B345F]
          "
        >
            <img src={iconPath} className="h-4 w-4 filter invert"></img>
            <span>{title}</span>
        </button>
      </div>
    );
  }