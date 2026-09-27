import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { resolveFListProfileInput } from '../../models/FListProfile';
import { draftCharacter } from '../../models/ProfileDrafts';
import type { DraftCharacter, DraftDetails } from '../../models/ProfileDrafts';

type DraftDetailsDialogProps = {
  title: string;
  submitLabel: string;
  initialName?: string;
  initialCharacterName?: string;
  onCancel: () => void;
  onSubmit: (details: DraftDetails) => Promise<void>;
};

export function DraftDetailsDialog({
  title,
  submitLabel,
  initialName = '',
  initialCharacterName = '',
  onCancel,
  onSubmit,
}: DraftDetailsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [name, setName] = useState(initialName);
  const [characterInput, setCharacterInput] = useState(initialCharacterName);
  const [saving, setSaving] = useState(false);
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

    let character: DraftCharacter | null = null;
    if (characterInput.trim()) {
      character = draftCharacter(resolveFListProfileInput(characterInput)?.character);
      if (!character) {
        setErrorMessage(
          'Enter an F-list character name (letters, numbers, spaces, hyphens and underscores) or their profile link.',
        );
        return;
      }
    }

    setSaving(true);
    try {
      await onSubmit({ name, character });
    } catch (error) {
      console.error('Draft details could not be saved:', error);
      setErrorMessage(error instanceof Error ? error.message : 'The draft could not be saved.');
      setSaving(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="import-dialog draft-details-dialog"
      aria-labelledby={`${id}-title`}
      onCancel={onCancel}
      onClick={event => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <form className="import-dialog-form" onSubmit={handleSubmit}>
        <div className="import-dialog-header">
          <div>
            <h2 id={`${id}-title`}>{title}</h2>
            <p>Drafts are grouped by character on the Profiles page.</p>
          </div>
          <button type="button" className="import-dialog-close" aria-label="Close" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="import-dialog-panel">
          <label htmlFor={`${id}-name`}>Draft name</label>
          <input
            id={`${id}-name`}
            type="text"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Untitled draft"
            maxLength={80}
            autoFocus
            autoComplete="off"
          />
        </div>

        <div className="import-dialog-panel">
          <label htmlFor={`${id}-character`}>Character (optional)</label>
          <input
            id={`${id}-character`}
            type="text"
            value={characterInput}
            onChange={event => setCharacterInput(event.target.value)}
            placeholder="Character name or profile link"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="import-dialog-note">Leave this empty to file the draft under “No character”.</p>
        </div>

        {errorMessage && <p className="import-dialog-error" role="alert">{errorMessage}</p>}

        <div className="import-dialog-actions">
          <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
