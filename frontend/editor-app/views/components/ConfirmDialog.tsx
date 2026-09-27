import { useEffect, useId, useRef } from 'react';

type ConfirmDialogProps = {
  title: string;
  message: string;
  /** Label of the red confirm button, e.g. "Delete draft". */
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({ title, message, confirmLabel, onCancel, onConfirm }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="import-dialog reset-dialog"
      aria-labelledby={titleId}
      onCancel={onCancel}
      onClick={event => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="import-dialog-form">
        <div className="import-dialog-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            <p>{message}</p>
          </div>
          <button
            type="button"
            className="import-dialog-close"
            aria-label="Close"
            onClick={onCancel}
          >
            ×
          </button>
        </div>
        <div className="import-dialog-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" className="primary reset-confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
