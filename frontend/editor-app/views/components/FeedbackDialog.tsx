import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { MAX_FEEDBACK_LENGTH } from '../../models/Feedback';
import { toast } from '../../utilities/Toast';

type FeedbackDialogProps = {
  onClose: () => void;
};

export function FeedbackDialog({ onClose }: FeedbackDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSending(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error || 'Your feedback could not be sent.');
      }
      toast('Thanks! Your feedback was sent.');
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Your feedback could not be sent.');
      setSending(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="import-dialog feedback-dialog"
      aria-labelledby={`${id}-title`}
      onCancel={onClose}
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="import-dialog-form" onSubmit={handleSubmit}>
        <div className="import-dialog-header">
          <div>
            <h2 id={`${id}-title`}>Send feedback</h2>
            <p>
              Tell us what works, what&apos;s broken, or what you&apos;d like to see. Only the text
              you write is saved. We don&apos;t record who sent it or where it came from.
            </p>
          </div>
          <button type="button" className="import-dialog-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="import-dialog-panel">
          <label htmlFor={`${id}-text`}>Your feedback</label>
          <textarea
            id={`${id}-text`}
            value={text}
            onChange={event => setText(event.target.value)}
            maxLength={MAX_FEEDBACK_LENGTH}
            rows={8}
            autoFocus
            required
          />
          <p className="import-dialog-note">{text.length} / {MAX_FEEDBACK_LENGTH} characters</p>
        </div>

        {errorMessage && <p className="import-dialog-error" role="alert">{errorMessage}</p>}

        <div className="import-dialog-actions">
          <button type="button" onClick={onClose} disabled={sending}>Cancel</button>
          <button type="submit" className="primary" disabled={sending || !text.trim()}>
            {sending ? 'Sending…' : 'Submit'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
