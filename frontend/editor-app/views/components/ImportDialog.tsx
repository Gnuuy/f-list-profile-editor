import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { useEditorEngine } from '../../context/EditorEngineContext';
import { useEditorUI } from '../../context/EditorUIContext';
import { useProfileDrafts } from '../../context/ProfileDraftsContext';
import { resolveFListProfileInput } from '../../models/FListProfile';
import type { FListProfileImport } from '../../models/FListProfile';
import { draftCharacter, importedDraftName } from '../../models/ProfileDrafts';
import { toast } from '../../utilities/Toast';

type ImportMode = 'profile' | 'bbcode';

type ProfileImportError = {
  error?: string;
};

export function ImportDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<ImportMode>('profile');
  const [profileInput, setProfileInput] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { parseImport } = useEditorEngine();
  const { createDraft } = useProfileDrafts();
  const { closeImport } = useEditorUI();

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
    setLoading(true);
    try {
      let result;
      let successMessage = 'Imported BBCode into a new draft';

      if (mode === 'profile') {
        const location = resolveFListProfileInput(profileInput);
        if (!location) {
          throw new Error(
            'Enter a character name or a full F-list profile link such as https://www.f-list.net/c/character/.',
          );
        }
        const response = await fetch(`/api/profile-import?url=${encodeURIComponent(location.url)}`);
        const payload = await response.json() as FListProfileImport & ProfileImportError;
        if (!response.ok) {
          throw new Error(payload.error || 'The F-list profile could not be imported.');
        }

        result = parseImport(payload.bbcode, { inlines: payload.inlines });
        await createDraft({
          name: importedDraftName('profile'),
          character: draftCharacter(payload.character) ?? draftCharacter(location.character),
          document: result.document,
        });
        const inlineCount = Object.keys(payload.inlines).length;
        successMessage = `Imported ${payload.character} with ${inlineCount} inline image${inlineCount === 1 ? '' : 's'} into a new draft`;
      } else {
        result = parseImport(source);
        await createDraft({ name: importedDraftName('bbcode'), document: result.document });
      }
      closeImport();

      if (result.unsupportedTags.length > 0) {
        toast(
          `Imported BBCode. Preserved unsupported tags as text: ${result.unsupportedTags.join(', ')}`,
        );
      } else {
        toast(successMessage);
      }
    } catch (error) {
      console.error('Import failed:', error);
      const message = error instanceof Error ? error.message : 'The import failed.';
      setErrorMessage(message);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="import-dialog"
      aria-labelledby="import-dialog-title"
      onCancel={closeImport}
      onClick={event => {
        if (event.target === event.currentTarget) closeImport();
      }}
    >
      <form className="import-dialog-form" onSubmit={handleSubmit}>
        <div className="import-dialog-header">
          <div>
            <h2 id="import-dialog-title">Import F-list profile</h2>
            <p>Import a public profile or paste BBCode. It opens as a new draft, so your current draft is kept.</p>
          </div>
          <button
            type="button"
            className="import-dialog-close"
            aria-label="Close import dialog"
            onClick={closeImport}
          >
            ×
          </button>
        </div>

        <div className="import-dialog-tabs" role="tablist" aria-label="Import method">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'profile'}
            className={mode === 'profile' ? 'is-active' : ''}
            onClick={() => {
              setMode('profile');
              setErrorMessage('');
            }}
          >
            F-list profile
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'bbcode'}
            className={mode === 'bbcode' ? 'is-active' : ''}
            onClick={() => {
              setMode('bbcode');
              setErrorMessage('');
            }}
          >
            Paste BBCode
          </button>
        </div>

        {mode === 'profile' ? (
          <div className="import-dialog-panel" role="tabpanel">
            <label htmlFor="profile-import-url">Character name or profile link</label>
            <input
              id="profile-import-url"
              type="text"
              value={profileInput}
              onChange={event => setProfileInput(event.target.value)}
              placeholder="fklr-r03 or https://www.f-list.net/c/fklr-r03/"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              required
            />
            <p className="import-dialog-note">
              Public profile BBCode, inline images, eicons, and character icons are loaded from F-list.
              The draft is filed under that character.
            </p>
          </div>
        ) : (
          <div className="import-dialog-panel" role="tabpanel">
            <label htmlFor="bbcode-import-source">Profile BBCode</label>
            <textarea
              id="bbcode-import-source"
              value={source}
              onChange={event => setSource(event.target.value)}
              placeholder="[center][b]Paste your profile here[/b][/center]"
              rows={18}
              autoFocus
              spellCheck={false}
              required
            />

            <p className="import-dialog-note">
              Inline images without profile metadata remain REPLACE ME placeholders.
              Character <code>[icon]name[/icon]</code> tags load their F-list avatars.
            </p>
          </div>
        )}

        {errorMessage && <p className="import-dialog-error" role="alert">{errorMessage}</p>}

        <div className="import-dialog-actions">
          <button type="button" onClick={closeImport} disabled={loading}>Cancel</button>
          <button
            type="submit"
            className="primary"
            disabled={loading || (mode === 'profile' ? !profileInput.trim() : !source.trim())}
          >
            {loading ? 'Importing…' : 'Import'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
