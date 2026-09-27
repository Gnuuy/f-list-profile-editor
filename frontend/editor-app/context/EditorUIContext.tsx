// EditorUIContext.tsx
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type EditorUI = {
  colourOpen: boolean;
  colourAnchor: DOMRect | null;
  eiconOpen: boolean;
  eiconAnchor: DOMRect | null;
  characterIconOpen: boolean;
  characterIconAnchor: DOMRect | null;
  horizontalRuleOpen: boolean;
  horizontalRuleAnchor: DOMRect | null;
  linkOpen: boolean;
  linkAnchor: DOMRect | null;
  importOpen: boolean;
  /** Whether blocks can be dragged (grip and dropdown/quote headers). */
  blockDragEnabled: boolean;
  toggleBlockDrag: () => void;
  openColourAtRect: (rect: DOMRect) => void;
  openColourAtButton: (e: React.MouseEvent<HTMLButtonElement>) => void;
  closeColour: () => void;
  openEiconAtRect: (rect: DOMRect) => void;
  openEiconAtButton: (e: React.MouseEvent<HTMLButtonElement>) => void;
  closeEicon: () => void;
  openCharacterIconAtRect: (rect: DOMRect) => void;
  openCharacterIconAtButton: (e: React.MouseEvent<HTMLButtonElement>) => void;
  closeCharacterIcon: () => void;
  openHorizontalRuleAtButton: (e: React.MouseEvent<HTMLButtonElement>) => void;
  closeHorizontalRule: () => void;
  openLinkAtRect: (rect: DOMRect) => void;
  openLinkAtButton: (e: React.MouseEvent<HTMLButtonElement>) => void;
  closeLink: () => void;
  openImport: () => void;
  closeImport: () => void;
};

const UICtx = createContext<EditorUI | null>(null);

const BLOCK_DRAG_STORAGE_KEY = 'f-list-profile-editor:block-drag:v1';

function loadBlockDragEnabled(): boolean {
  try {
    return window.localStorage.getItem(BLOCK_DRAG_STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

function saveBlockDragEnabled(enabled: boolean) {
  try {
    window.localStorage.setItem(BLOCK_DRAG_STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Without storage the switch still works, it's just not remembered.
  }
}

export function EditorUIProvider({ children }: { children: React.ReactNode }) {
  const [colourOpen, setColourOpen] = useState(false);
  const [colourAnchor, setColourAnchor] = useState<DOMRect | null>(null);
  const [eiconOpen, setEiconOpen] = useState(false);
  const [eiconAnchor, setEiconAnchor] = useState<DOMRect | null>(null);
  const [characterIconOpen, setCharacterIconOpen] = useState(false);
  const [characterIconAnchor, setCharacterIconAnchor] = useState<DOMRect | null>(null);
  const [horizontalRuleOpen, setHorizontalRuleOpen] = useState(false);
  const [horizontalRuleAnchor, setHorizontalRuleAnchor] = useState<DOMRect | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkAnchor, setLinkAnchor] = useState<DOMRect | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [blockDragEnabled, setBlockDragEnabled] = useState(loadBlockDragEnabled);

  const toggleBlockDrag = useCallback(() => {
    setBlockDragEnabled(current => {
      saveBlockDragEnabled(!current);
      return !current;
    });
  }, []);

  const openColourAtRect = useCallback((rect: DOMRect) => {
    setEiconOpen(false);
    setEiconAnchor(null);
    setCharacterIconOpen(false);
    setCharacterIconAnchor(null);
    setHorizontalRuleOpen(false);
    setHorizontalRuleAnchor(null);
    setLinkOpen(false);
    setLinkAnchor(null);
    setColourAnchor(rect);
    setColourOpen(true);
  }, []);
  const openColourAtButton = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    openColourAtRect(e.currentTarget.getBoundingClientRect());
  }, [openColourAtRect]);
  const closeColour = useCallback(() => {
    setColourOpen(false);
    setColourAnchor(null);
  }, []);
  const openEiconAtRect = useCallback((rect: DOMRect) => {
    setColourOpen(false);
    setColourAnchor(null);
    setCharacterIconOpen(false);
    setCharacterIconAnchor(null);
    setHorizontalRuleOpen(false);
    setHorizontalRuleAnchor(null);
    setLinkOpen(false);
    setLinkAnchor(null);
    setEiconAnchor(rect);
    setEiconOpen(true);
  }, []);
  const openEiconAtButton = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    openEiconAtRect(e.currentTarget.getBoundingClientRect());
  }, [openEiconAtRect]);
  const closeEicon = useCallback(() => {
    setEiconOpen(false);
    setEiconAnchor(null);
  }, []);
  const openCharacterIconAtRect = useCallback((rect: DOMRect) => {
    setColourOpen(false);
    setColourAnchor(null);
    setEiconOpen(false);
    setEiconAnchor(null);
    setHorizontalRuleOpen(false);
    setHorizontalRuleAnchor(null);
    setLinkOpen(false);
    setLinkAnchor(null);
    setCharacterIconAnchor(rect);
    setCharacterIconOpen(true);
  }, []);
  const openCharacterIconAtButton = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    openCharacterIconAtRect(e.currentTarget.getBoundingClientRect());
  }, [openCharacterIconAtRect]);
  const closeCharacterIcon = useCallback(() => {
    setCharacterIconOpen(false);
    setCharacterIconAnchor(null);
  }, []);
  const openHorizontalRuleAtButton = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setColourOpen(false);
    setColourAnchor(null);
    setEiconOpen(false);
    setEiconAnchor(null);
    setCharacterIconOpen(false);
    setCharacterIconAnchor(null);
    setLinkOpen(false);
    setLinkAnchor(null);
    setHorizontalRuleAnchor(e.currentTarget.getBoundingClientRect());
    setHorizontalRuleOpen(true);
  }, []);
  const closeHorizontalRule = useCallback(() => {
    setHorizontalRuleOpen(false);
    setHorizontalRuleAnchor(null);
  }, []);
  const openLinkAtRect = useCallback((rect: DOMRect) => {
    setColourOpen(false);
    setColourAnchor(null);
    setEiconOpen(false);
    setEiconAnchor(null);
    setCharacterIconOpen(false);
    setCharacterIconAnchor(null);
    setHorizontalRuleOpen(false);
    setHorizontalRuleAnchor(null);
    setLinkAnchor(rect);
    setLinkOpen(true);
  }, []);
  const openLinkAtButton = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    openLinkAtRect(e.currentTarget.getBoundingClientRect());
  }, [openLinkAtRect]);
  const closeLink = useCallback(() => {
    setLinkOpen(false);
    setLinkAnchor(null);
  }, []);
  const openImport = useCallback(() => {
    closeColour();
    closeEicon();
    closeCharacterIcon();
    closeHorizontalRule();
    closeLink();
    setImportOpen(true);
  }, [closeCharacterIcon, closeColour, closeEicon, closeHorizontalRule, closeLink]);
  const closeImport = useCallback(() => setImportOpen(false), []);

  const value = useMemo(
    () => ({
      colourOpen,
      colourAnchor,
      eiconOpen,
      eiconAnchor,
      characterIconOpen,
      characterIconAnchor,
      horizontalRuleOpen,
      horizontalRuleAnchor,
      linkOpen,
      linkAnchor,
      importOpen,
      blockDragEnabled,
      toggleBlockDrag,
      openColourAtRect,
      openColourAtButton,
      closeColour,
      openEiconAtRect,
      openEiconAtButton,
      closeEicon,
      openCharacterIconAtRect,
      openCharacterIconAtButton,
      closeCharacterIcon,
      openHorizontalRuleAtButton,
      closeHorizontalRule,
      openLinkAtRect,
      openLinkAtButton,
      closeLink,
      openImport,
      closeImport,
    }),
    [
      colourOpen,
      colourAnchor,
      eiconOpen,
      eiconAnchor,
      characterIconOpen,
      characterIconAnchor,
      horizontalRuleOpen,
      horizontalRuleAnchor,
      linkOpen,
      linkAnchor,
      importOpen,
      blockDragEnabled,
      toggleBlockDrag,
      openColourAtRect,
      openColourAtButton,
      closeColour,
      openEiconAtRect,
      openEiconAtButton,
      closeEicon,
      openCharacterIconAtRect,
      openCharacterIconAtButton,
      closeCharacterIcon,
      openHorizontalRuleAtButton,
      closeHorizontalRule,
      openLinkAtRect,
      openLinkAtButton,
      closeLink,
      openImport,
      closeImport,
    ]
  );

  return <UICtx.Provider value={value}>{children}</UICtx.Provider>;
}

export function useEditorUI() {
  const ctx = useContext(UICtx);
  if (!ctx) throw new Error('useEditorUI must be used inside <EditorUIProvider>');
  return ctx;
}
