import React from "react";
import { useEditorContext } from "../context/EditorContext";

export default function ColourMenu() {
    const { isColourPickerOpen, setColour, colourPickerPosition } = useEditorContext();

    const colours = [
        "#FF0000", "#00FF00", "#0000FF",
        "#FFA500", "#800080", "#FFFF00",
        "#000000", "#808080", "#FFFFFF"]

        if (!isColourPickerOpen) return null;
        console.log("This is working");
        
        return (
          <div
            className="color-palette"
            style={{
              position: "absolute",
              top: `${colourPickerPosition.top}px`,
              left: `${colourPickerPosition.left}px`,
            }}
          >
            {colours.map((colour) => (
              <button
                key={colour}
                className="color-option"
                style={{ backgroundColor: colour }}
                onClick={() => setColour(colour)}
              />
            ))}
          </div>
        );
    };
