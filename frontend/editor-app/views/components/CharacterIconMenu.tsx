import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { useEditorEngine } from '../../context/EditorEngineContext';
import { useEditorUI } from '../../context/EditorUIContext';
import { getColourMenuPosition } from '../../models/ColourMenuModel';
import { useCharacterIconMenuViewModel } from '../../viewmodels/useCharacterIconMenuViewModel';

type CustomProperties = CSSProperties & Record<`--${string}`, string>;

export default function CharacterIconMenu() {
  const {
    characterIconOpen,
    characterIconAnchor,
    closeCharacterIcon,
  } = useEditorUI();
  const { insertCharacterIcon } = useEditorEngine();
  const {
    query,
    setQuery,
    result,
    loading,
    error,
    canLookup,
    lookup,
  } = useCharacterIconMenuViewModel(characterIconOpen);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!characterIconOpen || !characterIconAnchor || !boxRef.current) return;
    const menuRect = boxRef.current.getBoundingClientRect();
    setPosition(getColourMenuPosition(
      characterIconAnchor,
      { width: menuRect.width, height: menuRect.height },
      { width: window.innerWidth, height: window.innerHeight },
    ));
  }, [characterIconAnchor, characterIconOpen, error, loading, result]);

  useEffect(() => {
    if (characterIconOpen) inputRef.current?.focus();
  }, [characterIconOpen]);

  useEffect(() => {
    if (!characterIconOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) closeCharacterIcon();
    };
    window.addEventListener('mousedown', onDown, true);
    return () => window.removeEventListener('mousedown', onDown, true);
  }, [characterIconOpen, closeCharacterIcon]);

  if (!characterIconOpen || !characterIconAnchor) return null;

  const previewFailed = result?.avatarUrl === failedAvatarUrl;

  const insert = () => {
    if (result && insertCharacterIcon(result.character)) closeCharacterIcon();
  };

  return (
    <div
      ref={boxRef}
      className="character-icon-menu"
      role="dialog"
      aria-labelledby="character-icon-menu-title"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeCharacterIcon();
        }
      }}
      style={{
        '--cim-top': `${position?.top ?? characterIconAnchor.bottom + 8}px`,
        '--cim-left': `${position?.left ?? characterIconAnchor.left}px`,
      } as CustomProperties}
    >
      <div className="character-icon-menu-header">
        <div className="character-icon-menu-heading">
          <span className="character-icon-menu-symbol" aria-hidden="true">♟</span>
          <div>
            <strong id="character-icon-menu-title">Character icon</strong>
            <span>Insert an F-list avatar</span>
          </div>
        </div>
        <button
          type="button"
          className="character-icon-menu-close"
          onClick={closeCharacterIcon}
          aria-label="Close character icon menu"
        >
          ×
        </button>
      </div>

      <form
        className="character-icon-search-form"
        onSubmit={event => {
          event.preventDefault();
          void lookup();
        }}
      >
        <label htmlFor="character-icon-search">F-list character name</label>
        <div className="character-icon-search-row">
          <input
            ref={inputRef}
            id="character-icon-search"
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="FKLR-R03"
            maxLength={64}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" disabled={!canLookup}>
            {loading ? 'Looking…' : 'Look up'}
          </button>
        </div>
      </form>

      <div className="character-icon-status" aria-live="polite">
        {loading && 'Checking the public F-list profile…'}
        {!loading && error && <span role="alert">{error}</span>}
        {!loading && !error && !result && 'Enter the exact character name used on F-list.'}
      </div>

      {result && (
        <div className="character-icon-result">
          <div className="character-icon-preview">
            {!previewFailed ? (
              // The URL is returned dynamically by F-list and is not known to the image optimizer.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.avatarUrl}
                width={50}
                height={50}
                alt={`${result.character} avatar`}
                referrerPolicy="no-referrer"
                onError={() => setFailedAvatarUrl(result.avatarUrl)}
              />
            ) : (
              <span aria-label="Avatar preview unavailable">?</span>
            )}
          </div>
          <div className="character-icon-result-copy">
            <strong>{result.character}</strong>
            <code>[icon]{result.character}[/icon]</code>
            <a href={result.profileUrl} target="_blank" rel="noreferrer">
              Open F-list profile
            </a>
          </div>
          <button
            type="button"
            className="character-icon-insert"
            disabled={previewFailed}
            onMouseDown={event => event.preventDefault()}
            onClick={insert}
          >
            Insert
          </button>
        </div>
      )}

      <div className="character-icon-menu-footer">
        The avatar stays editable and exports as its original <code>[icon]</code> tag.
      </div>
    </div>
  );
}
