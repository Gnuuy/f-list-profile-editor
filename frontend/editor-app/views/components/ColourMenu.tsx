// components/ColourMenu.tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useEditorUI } from '../../context/EditorUIContext';
import { useEditorEngine } from '../../context/EditorEngineContext';
import {
  getColourMenuPosition,
  getNextColourOptionIndex,
} from '../../models/ColourMenuModel';
import {
  F_LIST_COLOR_SHORTCUTS,
  F_LIST_COLOR_SWATCHES,
  getFListColourByShortcut,
} from '../../models/FListColors';
import { selectedCollapsible } from '../../models/CollapsibleFormatting';

type CustomProperties = CSSProperties & Record<`--${string}`, string>;

export default function ColourMenu() {
  const { colourOpen, colourAnchor, closeColour } = useEditorUI();
  const { getEditor, setColour, clearColour } = useEditorEngine();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const liveEditor = getEditor();
  const currentColor = (liveEditor && selectedCollapsible(liveEditor.state)?.attrs?.color)
    || liveEditor?.getAttributes('textStyle')?.color as string | undefined;
  useLayoutEffect(() => {
    if (!colourOpen || !colourAnchor || !boxRef.current) return;
    const menuRect = boxRef.current.getBoundingClientRect();
    setPosition(getColourMenuPosition(
      colourAnchor,
      { width: menuRect.width, height: menuRect.height },
      { width: window.innerWidth, height: window.innerHeight },
    ));

    const active = boxRef.current.querySelector<HTMLButtonElement>('.colour-option.is-active');
    const first = boxRef.current.querySelector<HTMLButtonElement>('.colour-option');
    (active ?? first)?.focus();
  }, [colourOpen, colourAnchor]);

  useEffect(() => {
    if (!colourOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) closeColour();
    };
    window.addEventListener('mousedown', onDown, true);
    return () => window.removeEventListener('mousedown', onDown, true);
  }, [colourOpen, closeColour]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeColour();
      return;
    }

    if (!event.altKey && !event.ctrlKey && !event.metaKey) {
      const colour = getFListColourByShortcut(event.key);
      if (colour) {
        event.preventDefault();
        setColour(colour.css);
        closeColour();
        return;
      }
    }

    const target = event.target as HTMLElement;
    if (!target.matches('[data-colour-option]')) return;
    const options = [...(boxRef.current?.querySelectorAll<HTMLButtonElement>('[data-colour-option]') ?? [])];
    const nextIndex = getNextColourOptionIndex(
      options.indexOf(target as HTMLButtonElement),
      event.key,
      options.length,
    );
    if (nextIndex === null) return;

    event.preventDefault();
    options[nextIndex]?.focus();
  };

  if (!colourOpen || !colourAnchor) return null;

  return (
    <div
      ref={boxRef}
      className="colour-menu"
      role="dialog"
      aria-labelledby="colour-menu-title"
      onKeyDown={onKeyDown}
      style={{
        '--cm-top': `${position?.top ?? colourAnchor.bottom + 8}px`,
        '--cm-left': `${position?.left ?? colourAnchor.left}px`,
      } as CustomProperties}
    >
      <div className="colour-menu-header">
        <strong id="colour-menu-title">Text colour</strong>
        <div className="colour-menu-header-actions">
          <button
            type="button"
            className="colour-action"
            onMouseDown={event => event.preventDefault()}
            onClick={() => { clearColour(); closeColour(); }}
            title="Use default colour"
            aria-label="Use default colour"
          >
            ↺
          </button>
          <button
            type="button"
            className="colour-menu-close"
            onClick={closeColour}
            aria-label="Close colour menu"
          >
            ×
          </button>
        </div>
      </div>

      <div className="colour-grid" role="group" aria-label="F-list text colours">
        {F_LIST_COLOR_SWATCHES.map(({ name, css }) => {
          const isActive =
            currentColor?.toLowerCase() === css.toLowerCase() ||
            currentColor?.toLowerCase() === name.toLowerCase();

          return (
            <button
              key={name}
              type="button"
              data-colour-option
              data-colour-name={name}
              title={`Set text colour to ${name} (${F_LIST_COLOR_SHORTCUTS[name]})`}
              aria-label={`Set text colour to ${name}`}
              aria-keyshortcuts={F_LIST_COLOR_SHORTCUTS[name]}
              aria-pressed={isActive}
              className={`colour-option${isActive ? ' is-active' : ''}`}
              onMouseDown={event => event.preventDefault()}
              onClick={() => { setColour(css); closeColour(); }}
            >
              <span
                className="colour-option-chip"
                style={{ '--swatch-color': css } as CustomProperties}
                aria-hidden="true"
              />
              <span className="colour-option-check" aria-hidden="true">
                {isActive ? '✓' : ''}
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
