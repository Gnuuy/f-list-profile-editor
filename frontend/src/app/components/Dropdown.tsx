import { useState, useRef, useEffect } from "react";
import { Editor } from "@tiptap/react";

interface DropdownProps {
  editor: Editor | null;
}

export default function CustomDropdown({ editor }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState("Select Format");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (option: string) => {
    setSelected(option);
    setIsOpen(false);

    if (!editor) return;

    switch (option) {
      case "Bold":
        editor.chain().focus().toggleBold().run();
        break;
      case "Italic":
        editor.chain().focus().toggleItalic().run();
        break;
      case "Strikethrough":
        editor.chain().focus().toggleStrike().run();
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Dropdown Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-gray-200 rounded-md border border-gray-300 shadow-sm hover:bg-gray-300 focus:outline-none"
      >
        {selected}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-lg">
          {["Bold", "Italic", "Underline", "Strikethrough"].map((option) => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className="block px-4 py-2 w-full text-left hover:bg-gray-100"
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}