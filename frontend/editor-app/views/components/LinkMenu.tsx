import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';

import { useEditorEngine } from '../../context/EditorEngineContext';
import { useEditorUI } from '../../context/EditorUIContext';
import type { FListLinkDraft } from '../../models/Link';
import { getColourMenuPosition } from '../../models/ColourMenuModel';

type CustomProperties = CSSProperties & Record<`--${string}`, string>;

const EMPTY_DRAFT: FListLinkDraft = {
  from: 0,
  to: 0,
  label: '',
  href: '',
  hasLink: false,
};

export default function LinkMenu() {
  const { linkOpen, linkAnchor, closeLink } = useEditorUI();
  const { getLinkDraft, applyLink, removeLink } = useEditorEngine();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const urlRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<FListLinkDraft>(EMPTY_DRAFT);
  const [href, setHref] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!linkOpen || !linkAnchor || !boxRef.current) return;

    const nextDraft = getLinkDraft() ?? EMPTY_DRAFT;
    setDraft(nextDraft);
    setHref(nextDraft.href);
    setLabel(nextDraft.label);
    setError('');

    const menuRect = boxRef.current.getBoundingClientRect();
    setPosition(getColourMenuPosition(
      linkAnchor,
      { width: menuRect.width, height: menuRect.height },
      { width: window.innerWidth, height: window.innerHeight },
    ));
    requestAnimationFrame(() => urlRef.current?.focus());
  }, [getLinkDraft, linkAnchor, linkOpen]);

  useEffect(() => {
    if (!linkOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) closeLink();
    };
    window.addEventListener('mousedown', onDown, true);
    return () => window.removeEventListener('mousedown', onDown, true);
  }, [closeLink, linkOpen]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = applyLink(draft, href, label);
    if (!result.ok) {
      setError(result.error ?? 'The link could not be added.');
      return;
    }
    closeLink();
  };

  if (!linkOpen || !linkAnchor) return null;

  return (
    <div
      ref={boxRef}
      className="colour-menu link-menu"
      role="dialog"
      aria-labelledby="link-menu-title"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeLink();
        }
      }}
      style={{
        '--cm-top': `${position?.top ?? linkAnchor.bottom + 8}px`,
        '--cm-left': `${position?.left ?? linkAnchor.left}px`,
      } as CustomProperties}
    >
      <div className="colour-menu-header">
        <strong id="link-menu-title">{draft.hasLink ? 'Edit link' : 'Insert link'}</strong>
        <button
          type="button"
          className="colour-menu-close"
          onClick={closeLink}
          aria-label="Close link menu"
        >
          ×
        </button>
      </div>

      <form className="link-menu-form" onSubmit={submit}>
        <label className="link-menu-field">
          <span>Link</span>
          <input
            ref={urlRef}
            type="text"
            inputMode="url"
            autoComplete="url"
            value={href}
            onChange={event => { setHref(event.target.value); setError(''); }}
            placeholder="https://example.com"
          />
        </label>
        <label className="link-menu-field">
          <span>Label</span>
          <input
            type="text"
            value={label}
            onChange={event => { setLabel(event.target.value); setError(''); }}
            placeholder="Link text"
          />
        </label>

        {error ? <p className="link-menu-error" role="alert">{error}</p> : null}

        <div className="link-menu-actions">
          {draft.hasLink ? (
            <button
              type="button"
              className="link-menu-button is-secondary"
              onClick={() => {
                removeLink(draft);
                closeLink();
              }}
            >
              Remove
            </button>
          ) : null}
          <button type="submit" className="link-menu-button is-primary">
            {draft.hasLink ? 'Update' : 'Insert'}
          </button>
        </div>
      </form>
    </div>
  );
}
