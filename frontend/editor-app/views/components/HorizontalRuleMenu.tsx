import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { useEditorEngine } from '../../context/EditorEngineContext';
import { useEditorUI } from '../../context/EditorUIContext';
import { getColourMenuPosition } from '../../models/ColourMenuModel';
import { HORIZONTAL_RULE_SPACING_OPTIONS } from '../../models/HorizontalRuleSpacing';

type CustomProperties = CSSProperties & Record<`--${string}`, string>;

export default function HorizontalRuleMenu() {
  const { horizontalRuleOpen, horizontalRuleAnchor, closeHorizontalRule } = useEditorUI();
  const { insertHR } = useEditorEngine();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!horizontalRuleOpen || !horizontalRuleAnchor || !boxRef.current) return;
    const menuRect = boxRef.current.getBoundingClientRect();
    setPosition(getColourMenuPosition(
      horizontalRuleAnchor,
      { width: menuRect.width, height: menuRect.height },
      { width: window.innerWidth, height: window.innerHeight },
    ));
    boxRef.current.querySelector<HTMLButtonElement>('[data-horizontal-rule-option]')?.focus();
  }, [horizontalRuleAnchor, horizontalRuleOpen]);

  useEffect(() => {
    if (!horizontalRuleOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) closeHorizontalRule();
    };
    window.addEventListener('mousedown', onDown, true);
    return () => window.removeEventListener('mousedown', onDown, true);
  }, [closeHorizontalRule, horizontalRuleOpen]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeHorizontalRule();
      return;
    }

    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const options = [...(boxRef.current?.querySelectorAll<HTMLButtonElement>(
      '[data-horizontal-rule-option]',
    ) ?? [])];
    const currentIndex = options.indexOf(event.target as HTMLButtonElement);
    if (currentIndex === -1) return;

    event.preventDefault();
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
    options[(currentIndex + direction + options.length) % options.length]?.focus();
  };

  if (!horizontalRuleOpen || !horizontalRuleAnchor) return null;

  return (
    <div
      ref={boxRef}
      className="colour-menu horizontal-rule-menu"
      role="dialog"
      aria-labelledby="horizontal-rule-menu-title"
      onKeyDown={onKeyDown}
      style={{
        '--cm-top': `${position?.top ?? horizontalRuleAnchor.bottom + 8}px`,
        '--cm-left': `${position?.left ?? horizontalRuleAnchor.left}px`,
      } as CustomProperties}
    >
      <div className="colour-menu-header">
        <strong id="horizontal-rule-menu-title">Horizontal rule</strong>
        <button
          type="button"
          className="colour-menu-close"
          onClick={closeHorizontalRule}
          aria-label="Close horizontal rule menu"
        >
          ×
        </button>
      </div>

      <div className="horizontal-rule-options" role="group" aria-label="Horizontal rule spacing">
        {HORIZONTAL_RULE_SPACING_OPTIONS.map(option => (
          <button
            key={option.id}
            type="button"
            data-horizontal-rule-option
            className="horizontal-rule-option"
            title={option.description}
            aria-label={`Insert ${option.label.toLowerCase()} horizontal rule`}
            onClick={() => {
              insertHR(option.id);
              closeHorizontalRule();
            }}
          >
            <span className={`horizontal-rule-preview is-${option.id}`} aria-hidden="true">
              <span className="horizontal-rule-preview-line" />
              <span className="horizontal-rule-preview-text">Text</span>
            </span>
            <span className="horizontal-rule-option-label">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
