'use client';

import { useEditorContext } from '../context/EditorContext';
import { useEffect, useRef } from 'react';

const COLORS = [
  'red','orange','yellow','green','cyan','purple',
  'blue','pink','black','brown','white','grey',
];

export default function ColourMenu() {
  const {
    isColourPickerOpen,
    colourPickerPosition,
    closeColourPicker,
    setColour,
  } = useEditorContext();

  const ref = useRef<HTMLDivElement>(null);

  // close when clicking outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeColourPicker();
      }
    };
    if (isColourPickerOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isColourPickerOpen, closeColourPicker]);

  if (!isColourPickerOpen || !colourPickerPosition) return null;

  return (
    <div
      ref={ref}
      className="colour-menu"
      style={{
        position: 'absolute',
        top: `${colourPickerPosition.bottom + 5}px`,
        left: `${colourPickerPosition.left}px`,
      }}
    >
      {COLORS.map(c => (
        <button
          key={c}
          className="colour-swatch"
          title={c}
          style={{ backgroundColor: c }}
          onClick={() => setColour(c)}
        />
      ))}
    </div>
  );
}
