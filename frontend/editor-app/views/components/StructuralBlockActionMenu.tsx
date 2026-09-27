import { MoreHorizontal } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export type StructuralBlockAction = {
  id: string;
  label: string;
  title: string;
  onSelect: () => void;
  active?: boolean;
  disabled?: boolean;
  tone?: 'default' | 'danger';
};

type StructuralBlockActionMenuProps = {
  label: string;
  actions: StructuralBlockAction[];
  onOpenChange?: (open: boolean) => void;
};

export default function StructuralBlockActionMenu({
  label,
  actions,
  onOpenChange,
}: StructuralBlockActionMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const setMenuOpen = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    document.addEventListener('keydown', closeOnEscape, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
      document.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [open, setMenuOpen]);

  return (
    <div
      ref={rootRef}
      className={`structural-block-actions${open ? ' is-open' : ''}`}
      contentEditable={false}
      data-structural-block-actions=""
    >
      <button
        type="button"
        className="structural-block-actions-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={() => setMenuOpen(!open)}
      >
        <MoreHorizontal aria-hidden="true" />
      </button>

      {open && (
        <div className="structural-block-action-menu" role="menu" aria-label={label}>
          {actions.map(action => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              className={`structural-block-action-item${action.active ? ' is-active' : ''}${action.tone === 'danger' ? ' is-danger' : ''}`}
              disabled={action.disabled}
              title={action.title}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={() => {
                setMenuOpen(false);
                action.onSelect();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
