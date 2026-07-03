import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'intellirank-theme';
const VALID_THEMES: Theme[] = ['light', 'dark'];
const TRANSITION_CLASS = 'theme-transitioning';
const TRANSITION_DURATION = 280;

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored && VALID_THEMES.includes(stored)) return stored;
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.classList.add(TRANSITION_CLASS);
    applyTheme(next);
    setThemeState(next);
    setTimeout(() => {
      document.documentElement.classList.remove(TRANSITION_CLASS);
    }, TRANSITION_DURATION);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(current => {
      const next: Theme = current === 'light' ? 'dark' : 'light';
      document.documentElement.classList.add(TRANSITION_CLASS);
      applyTheme(next);
      setTimeout(() => {
        document.documentElement.classList.remove(TRANSITION_CLASS);
      }, TRANSITION_DURATION);
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}
