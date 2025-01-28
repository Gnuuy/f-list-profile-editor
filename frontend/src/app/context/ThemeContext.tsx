// src/context/ThemeContext.tsx
'use client'; // Required for contexts in the app directory

import { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextProps {
  theme: string;
  setTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'default';
  });

  useEffect(() => {
    document.body.className = theme; // Apply the theme to the body
    localStorage.setItem('theme', theme); // Persist theme in localStorage
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};