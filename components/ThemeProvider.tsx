'use client';
import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: 'light', toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Keep the first React render identical to SSR. The head script already sets
  // CSS data-theme before paint; hydrate interactive labels after mounting.
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') setTheme(attr);
    try {
      const saved = localStorage.getItem('ziwei-theme') as Theme | null;
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch { /* Theme remains usable when browser storage is blocked. */ }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('ziwei-theme', theme); } catch { /* Optional preference. */ }
  }, [theme, mounted]);

  const toggle = () => {
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    setTheme(t => t === 'dark' ? 'light' : 'dark');
    setTimeout(() => root.classList.remove('theme-transitioning'), 420);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
