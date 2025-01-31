import React from "react";

interface ToolbarButtonProps {
  title: string;
  imgPath: string;
  onClick?: () => void;
}

export default function ToolbarButton({ title, imgPath, onClick }: ToolbarButtonProps) {
  return (
    <button
      className="p-2 hover:bg-gray-200 rounded"
      title={title}
      onClick={onClick}
    >
      <img src={imgPath} alt={title} className="w-6 h-6" />
    </button>
  );
}