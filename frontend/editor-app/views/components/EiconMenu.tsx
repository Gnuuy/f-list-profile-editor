import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, UIEvent } from 'react';

import { useEditorEngine } from '../../context/EditorEngineContext';
import { useEditorUI } from '../../context/EditorUIContext';
import { getColourMenuPosition } from '../../models/ColourMenuModel';
import { getFListEiconUrl } from '../../models/Eicon';
import { REPLACE_ME_ICON_SRC } from '../../models/ImagePlaceholders';
import { useEiconMenuViewModel } from '../../viewmodels/useEiconMenuViewModel';
import type { EiconMenuSection } from '../../viewmodels/useEiconMenuViewModel';

type CustomProperties = CSSProperties & Record<`--${string}`, string>;

const SECTIONS: Array<{
  id: EiconMenuSection;
  label: string;
  shortLabel: string;
}> = [
  { id: 'search', label: 'Search all eicons', shortLabel: 'Search' },
  { id: 'favourites', label: 'Favourite eicons', shortLabel: 'Favourites' },
  { id: 'frequent', label: 'Frequently used eicons', shortLabel: 'Frequent' },
];

function PinIcon() {
  return <span className="eicon-pin-icon" aria-hidden="true" />;
}

function EiconPreview({ name }: { name: string }) {
  const remoteSource = getFListEiconUrl(name);
  const [failed, setFailed] = useState(false);

  return (
    <img
      src={!remoteSource || failed ? REPLACE_ME_ICON_SRC : remoteSource}
      width={50}
      height={50}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

export default function EiconMenu() {
  const { eiconOpen, eiconAnchor, closeEicon } = useEditorUI();
  const { insertEicon } = useEditorEngine();
  const {
    activeSection,
    setActiveSection,
    query,
    setQuery,
    results,
    totalResults,
    loading,
    error,
    hasQuery,
    hasMore,
    loadMore,
    retry,
    favouriteCount,
    frequentCount,
    isFavourite,
    toggleFavourite,
    markUsed,
  } = useEiconMenuViewModel(eiconOpen);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!eiconOpen || !eiconAnchor || !boxRef.current) return;
    const menuRect = boxRef.current.getBoundingClientRect();
    setPosition(getColourMenuPosition(
      eiconAnchor,
      { width: menuRect.width, height: menuRect.height },
      { width: window.innerWidth, height: window.innerHeight },
    ));
  }, [activeSection, eiconOpen, eiconAnchor, error, loading, results.length]);

  useEffect(() => {
    if (eiconOpen) searchRef.current?.focus();
  }, [activeSection, eiconOpen]);

  useEffect(() => {
    if (!eiconOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) closeEicon();
    };
    window.addEventListener('mousedown', onDown, true);
    return () => window.removeEventListener('mousedown', onDown, true);
  }, [closeEicon, eiconOpen]);

  if (!eiconOpen || !eiconAnchor) return null;

  const insert = (name: string) => {
    if (insertEicon(name)) {
      markUsed(name);
      closeEicon();
    }
  };

  const onResultsScroll = (event: UIEvent<HTMLDivElement>) => {
    const grid = event.currentTarget;
    if (hasMore && grid.scrollHeight - grid.scrollTop - grid.clientHeight < 80) {
      loadMore();
    }
  };

  const sectionCount = activeSection === 'favourites'
    ? favouriteCount
    : activeSection === 'frequent'
      ? frequentCount
      : totalResults;
  const sectionName = activeSection === 'favourites'
    ? 'favourite'
    : activeSection === 'frequent'
      ? 'frequently used'
      : 'matching';
  const placeholder = activeSection === 'search'
    ? 'Search eicons…'
    : activeSection === 'favourites'
      ? 'Filter favourites…'
      : 'Filter frequently used…';
  const showEmptyState = !loading && !error && results.length === 0;

  return (
    <div
      ref={boxRef}
      className="eicon-menu"
      role="dialog"
      aria-labelledby="eicon-menu-title"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeEicon();
        }
      }}
      style={{
        '--em-top': `${position?.top ?? eiconAnchor.bottom + 8}px`,
        '--em-left': `${position?.left ?? eiconAnchor.left}px`,
      } as CustomProperties}
    >
      <div className="eicon-menu-header">
        <div className="eicon-menu-heading">
          <span className="eicon-menu-title-icon" aria-hidden="true">☺</span>
          <div>
            <strong id="eicon-menu-title">Select eicon</strong>
            <span>Search, pin, and insert</span>
          </div>
        </div>
        <button
          type="button"
          className="eicon-menu-close"
          onClick={closeEicon}
          aria-label="Close eicon menu"
        >
          ×
        </button>
      </div>

      <div className="eicon-section-tabs" role="tablist" aria-label="Eicon collections">
        {SECTIONS.map(section => {
          const count = section.id === 'favourites'
            ? favouriteCount
            : section.id === 'frequent'
              ? frequentCount
              : null;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={activeSection === section.id}
              className={`eicon-section-tab${activeSection === section.id ? ' is-active' : ''}`}
              title={section.label}
              onClick={() => setActiveSection(section.id)}
            >
              {section.id === 'favourites' && <PinIcon />}
              {section.id === 'frequent' && (
                <span className="eicon-history-icon" aria-hidden="true">↻</span>
              )}
              <span>{section.shortLabel}</span>
              {count !== null && <span className="eicon-section-count">{count}</span>}
            </button>
          );
        })}
      </div>

      <label className="eicon-search-label" htmlFor="eicon-search">
        Search eicons
      </label>
      <input
        ref={searchRef}
        id="eicon-search"
        className="eicon-search"
        type="search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />

      <div className="eicon-menu-status" aria-live="polite">
        {loading && 'Loading the eicon index…'}
        {!loading && error && (
          <>
            <span>{error}</span>
            <button type="button" onClick={retry}>Retry</button>
          </>
        )}
        {!loading && !error && activeSection === 'search' && !hasQuery && (
          'Start typing to find an eicon.'
        )}
        {!loading && !error && activeSection === 'search' && hasQuery && (
          `${totalResults.toLocaleString()} matching eicon${totalResults === 1 ? '' : 's'}`
        )}
        {!loading && !error && activeSection !== 'search' && (
          `${sectionCount.toLocaleString()} ${sectionName} eicon${sectionCount === 1 ? '' : 's'}${hasQuery ? ' found' : ''}`
        )}
      </div>

      {results.length > 0 && (
        <div
          id="eicon-results"
          className="eicon-results"
          role="list"
          aria-label={`${sectionName} eicons`}
          onScroll={onResultsScroll}
        >
          {results.map(name => {
            const favourite = isFavourite(name);
            return (
              <div key={name} className="eicon-tile" role="listitem">
                <button
                  type="button"
                  className="eicon-option"
                  title={`Insert eicon: ${name}`}
                  aria-label={`Insert eicon ${name}`}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => insert(name)}
                >
                  <EiconPreview name={name} />
                </button>
                <button
                  type="button"
                  className={`eicon-favourite-toggle${favourite ? ' is-active' : ''}`}
                  title={favourite ? `Remove ${name} from favourites` : `Pin ${name} to favourites`}
                  aria-label={favourite ? `Remove ${name} from favourites` : `Pin ${name} to favourites`}
                  aria-pressed={favourite}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => toggleFavourite(name)}
                >
                  <PinIcon />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showEmptyState && (
        <div className="eicon-empty">
          {activeSection === 'search'
            ? hasQuery ? 'No matching eicons found.' : 'Search by name to fill the grid.'
            : activeSection === 'favourites'
              ? hasQuery ? 'No pinned eicons match this filter.' : 'Pin an eicon to keep it here.'
              : hasQuery ? 'No frequently used eicons match this filter.' : 'Inserted eicons will appear here.'}
        </div>
      )}

      <div className="eicon-menu-footer">
        <span>Favourites and usage stay on this device.</span>
        <span>
          Courtesy of{' '}
          <a href="https://xariah.net/eicons/" target="_blank" rel="noreferrer">
            xariah.net
          </a>
        </span>
      </div>
    </div>
  );
}
