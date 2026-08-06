import { useEffect, useRef, useState } from 'react';

import { useEditorEngine } from '../../context/EditorEngineContext';
import { useEditorUI } from '../../context/EditorUIContext';
import { toast } from '../../utilities/Toast';

export function ImportDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [source, setSource] = useState('');
  const { importBBCode } = useEditorEngine();
  const { closeImport } = useEditorUI();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const result = importBBCode(source);
      closeImport();

      if (result.unsupportedTags.length > 0) {
        toast(
          `Imported BBCode. Preserved unsupported tags as text: ${result.unsupportedTags.join(', ')}`,
        );
      } else {
        toast('Successfully imported BBCode');
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast('Failed to import BBCode', 'error');
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
            <h2 id="import-dialog-title">Import F-list BBCode</h2>
            <p>Paste the profile BBCode below. Existing editor content will be replaced.</p>
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

        <label htmlFor="bbcode-import-source">Profile BBCode</label>
        <textarea
          id="bbcode-import-source"
          value={source}
          onChange={event => setSource(event.target.value)}
          placeholder="[center][b]Paste your profile here[/b][/center]"
          rows={18}
          autoFocus
          spellCheck={false}
        />

        <p className="import-dialog-note">
          Inline images and character images become REPLACE ME placeholders. Eicons
          load by name from F-list, fall back locally if unavailable, and retain their
          <code>[eicon]name[/eicon]</code> BBCode on export.
        </p>

        <div className="import-dialog-actions">
          <button type="button" onClick={closeImport}>Cancel</button>
          <button type="submit" className="primary" disabled={!source.trim()}>OK</button>
        </div>
      </form>
    </dialog>
  );
}
