// EditorUIContext.tsx
import React, { createContext, useContext, useMemo, useState } from 'react';

type EditorUI = {
  colourOpen: boolean;
  colourAnchor: DOMRect | null;
  importOpen: boolean;
  openColourAtButton: (e: React.MouseEvent<HTMLButtonElement>) => void;
  closeColour: () => void;
  openImport: () => void;
  closeImport: () => void;
};

const UICtx = createContext<EditorUI | null>(null);

export function EditorUIProvider({ children }: { children: React.ReactNode }) {
  const [colourOpen, setColourOpen] = useState(false);
  const [colourAnchor, setColourAnchor] = useState<DOMRect | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const openColourAtButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    setColourAnchor(e.currentTarget.getBoundingClientRect());
    setColourOpen(true);
  };
  const closeColour = () => {
    setColourOpen(false);
    setColourAnchor(null);
  };
  const openImport = () => setImportOpen(true);
  const closeImport = () => setImportOpen(false);

  const value = useMemo(
    () => ({
      colourOpen,
      colourAnchor,
      importOpen,
      openColourAtButton,
      closeColour,
      openImport,
      closeImport,
    }),
    [colourOpen, colourAnchor, importOpen]
  );

  return <UICtx.Provider value={value}>{children}</UICtx.Provider>;
}

export function useEditorUI() {
  const ctx = useContext(UICtx);
  if (!ctx) throw new Error('useEditorUI must be used inside <EditorUIProvider>');
  return ctx;
}
