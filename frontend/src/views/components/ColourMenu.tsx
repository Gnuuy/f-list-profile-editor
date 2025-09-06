// components/ColourMenu.tsx
import { useEffect, useMemo, useRef } from 'react';
import { useEditorUI } from '../../context/EditorUIContext';
import { useEditorEngine } from '../../context/EditorEngineContext';

type Swatch = { name: string; css: string };

const PALETTE: Swatch[] = [
  { name: 'red',    css: '#d32f2f' },
  { name: 'orange', css: '#f57c00' },
  { name: 'yellow', css: '#fdd835' },
  { name: 'green',  css: '#2e7d32' },
  { name: 'cyan',   css: '#00acc1' },
  { name: 'blue',   css: '#1976d2' },
  { name: 'purple', css: '#9c27b0' },
  { name: 'pink',   css: '#e91e63' },
  { name: 'brown',  css: '#795548' },
  { name: 'black',  css: '#000000' },
  { name: 'white',  css: '#ffffff' },
  { name: 'grey',   css: '#808080' },
];

export default function ColourMenu() {
  const { colourOpen, colourAnchor, closeColour } = useEditorUI();
  const { getEditor, setColour, clearColour } = useEditorEngine();
  const boxRef = useRef<HTMLDivElement | null>(null);

  const currentColor = useMemo(() => {
    const ed = getEditor();
    if (!ed) return null;
    const c = ed.getAttributes('textStyle')?.color as string | undefined;
    return c ?? null;
  }, [getEditor, colourOpen]);

  useEffect(() => {
    if (!colourOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) closeColour();
    };
    window.addEventListener('mousedown', onDown, true);
    return () => window.removeEventListener('mousedown', onDown, true);
  }, [colourOpen, closeColour]);

  if (!colourOpen || !colourAnchor) return null;

  return (
    <div
      ref={boxRef}
      className="colour-menu"
      role="dialog"
      aria-label="Choose text color"
      onMouseDown={(e) => e.preventDefault()}
      style={{
        ['--cm-top' as any]: `${colourAnchor.bottom + 8}px`,
        ['--cm-left' as any]: `${colourAnchor.left}px`,
      }}
    >
      <div className="colour-grid">
        {PALETTE.map(({ name, css }) => {
          const isActive =
            currentColor?.toLowerCase() === css.toLowerCase() ||
            currentColor?.toLowerCase() === name.toLowerCase();
          const needsContrast = name === 'white' || name === 'yellow';

          return (
            <button
              key={name}
              title={name}
              className={`colour-swatch${isActive ? ' is-active' : ''}`}
              onClick={() => { setColour(css); closeColour(); }}
              style={{ ['--swatch-color' as any]: css }}
            >
              {needsContrast && <span className="colour-contrast-ring" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div className="colour-actions">
        <button className="colour-action" onClick={() => { clearColour(); closeColour(); }}>
          Clear
        </button>
        <button className="colour-action subtle" onClick={closeColour}>
          Close
        </button>
      </div>
    </div>
  );
}
