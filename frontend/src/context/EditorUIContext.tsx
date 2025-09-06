// EditorUIContext.tsx
import React, { createContext, useContext, useMemo, useState } from 'react';

type EditorUI = {
  colourOpen: boolean;
  colourAnchor: DOMRect | null;
  openColourAtButton: (e: React.MouseEvent<HTMLButtonElement>) => void;
  closeColour: () => void;
};

const UICtx = createContext<EditorUI | null>(null);

export function EditorUIProvider({ children }: { children: React.ReactNode }) {
  const [colourOpen, setColourOpen] = useState(false);
  const [colourAnchor, setColourAnchor] = useState<DOMRect | null>(null);

  const openColourAtButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    setColourAnchor(e.currentTarget.getBoundingClientRect());
    setColourOpen(true);
  };
  const closeColour = () => {
    setColourOpen(false);
    setColourAnchor(null);
  };

  const value = useMemo(
    () => ({ colourOpen, colourAnchor, openColourAtButton, closeColour }),
    [colourOpen, colourAnchor]
  );

  return <UICtx.Provider value={value}>{children}</UICtx.Provider>;
}

export function useEditorUI() {
  const ctx = useContext(UICtx);
  if (!ctx) throw new Error('useEditorUI must be used inside <EditorUIProvider>');
  return ctx;
}
