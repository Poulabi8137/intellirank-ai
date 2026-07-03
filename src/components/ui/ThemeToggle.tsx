import type { ReactNode } from 'react';
import { useTheme, type Theme } from '../../hooks/useTheme';
import styles from './ThemeToggle.module.css';

const THEME_META: Record<Theme, { label: string; title: string; icon: ReactNode }> = {
  light: {
    label: 'Light',
    title: 'Enterprise Light — switch to Executive Dark',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="2.8" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.8 2.8l1.05 1.05M10.15 10.15l1.05 1.05M11.2 2.8l-1.05 1.05M3.85 10.15l-1.05 1.05"
          stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
        />
      </svg>
    ),
  },
  dark: {
    label: 'Dark',
    title: 'Executive Dark — switch to Enterprise Light',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path
          d="M11.5 7.8A5 5 0 0 1 6.2 2.5a5 5 0 1 0 5.3 5.3z"
          stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    ),
  },
};

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const meta = THEME_META[theme];

  return (
    <button
      className={styles.toggle}
      onClick={toggleTheme}
      title={meta.title}
      aria-label={`Current theme: ${meta.label}. ${meta.title}`}
      type="button"
    >
      <span className={styles.icon}>{meta.icon}</span>
      <span className={styles.label}>{meta.label}</span>
    </button>
  );
}
